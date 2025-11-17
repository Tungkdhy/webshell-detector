import React from 'react';
import axios, { CanceledError, isAxiosError } from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Search,
  FileCode,
  Calendar,
  Server,
  AlertCircle,
  Eye,
  X,
  Info,
  Hash,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const ALERTS_ENDPOINT = (import.meta as any)?.env?.VITE_ALERTS_ENDPOINT ?? 'http://localhost:8000/api/alerts';
const PAGE_SIZE = 10;

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
type AlertStatus = 'new' | 'reviewing' | 'confirmed' | 'false-positive';

interface HostInfo {
  hostname?: string;
  os?: string;
  arch?: string;
  kernel?: string;
  macs?: string[];
  ipv4?: string[];
}

interface AlertRuleMeta {
  author?: string;
  description?: string;
  date?: string;
  modified?: string;
  reference?: string;
  score?: number;
  [key: string]: unknown;
}

interface AlertRule {
  name?: string;
  namespace?: string;
  tags?: string[] | null;
  meta?: AlertRuleMeta;
}

interface AlertApiItem {
  id: number;
  received_at?: string;
  agent_id: string;
  host: HostInfo;
  path: string;
  reason?: string;
  hash_before?: string | null;
  hash_after?: string | null;
  rules?: AlertRule[];
  timestamp?: string;
}

interface AlertsApiResponse {
  items: AlertApiItem[];
  total?: number;
  page?: number;
  page_size?: number;
}

interface NormalizedAlert {
  id: number;
  fileName: string;
  filePath: string;
  detectionTime: string;
  severity: SeverityLevel;
  server: string;
  malwareType: string;
  md5Hash: string;
  status: AlertStatus;
  suspiciousPatterns: string[];
  fileSize: string;
  lastModified: string;
  agentId: string;
  reason: string;
  hashBefore: string;
  raw: AlertApiItem;
}

const severityConfig: Record<SeverityLevel, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'Nghiêm trọng', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-500' },
  high: { label: 'Cao', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-500' },
  medium: { label: 'Trung bình', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-500' },
  low: { label: 'Thấp', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-500' },
};

const statusConfig: Record<AlertStatus, { label: string; color: string }> = {
  new: { label: 'Mới', color: 'bg-blue-500' },
  reviewing: { label: 'Đang xem xét', color: 'bg-purple-500' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-red-500' },
  'false-positive': { label: 'Báo động giả', color: 'bg-green-500' },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return local.toLocaleString('vi-VN', {
    hour12: false,
  });
};

const deriveSeverity = (alert: AlertApiItem): SeverityLevel => {
  const scores = alert.rules?.map((rule) => Number(rule.meta?.score) || 0) ?? [];
  const maxScore = scores.length ? Math.max(...scores) : 0;
  if (maxScore >= 90) return 'critical';
  if (maxScore >= 75) return 'high';
  if (maxScore >= 50) return 'medium';
  return 'low';
};

const deriveStatus = (alert: AlertApiItem): AlertStatus => {
  const reason = alert.reason?.toLowerCase() ?? '';
  if (reason.includes('initial')) return 'reviewing';
  if (reason.includes('write')) return 'new';
  if (reason.includes('confirmed')) return 'confirmed';
  if (reason.includes('false')) return 'false-positive';
  return 'new';
};

const buildSuspiciousPatterns = (alert: AlertApiItem) => {
  const patterns = alert.rules?.map((rule) => rule.meta?.description || rule.name || rule.namespace).filter(Boolean) as string[] | undefined;
  return patterns && patterns.length > 0 ? patterns : ['Không có mô tả quy tắc'];
};

const normalizeAlert = (alert: AlertApiItem): NormalizedAlert => {
  const fileName = alert.path.split(/[/\\]/).pop() ?? alert.path;
  return {
    id: alert.id,
    fileName,
    filePath: alert.path,
    detectionTime: formatDateTime(alert.timestamp ?? alert.received_at),
    severity: deriveSeverity(alert),
    server: alert.host?.hostname ?? alert.host?.ipv4?.[0] ?? alert.agent_id ?? 'Không xác định',
    malwareType: alert.rules?.map((rule) => rule.name ?? 'Không rõ').join(', ') || 'Không rõ',
    md5Hash: alert.hash_after ?? '—',
    status: deriveStatus(alert),
    suspiciousPatterns: buildSuspiciousPatterns(alert),
    fileSize: '—',
    lastModified: formatDateTime(alert.received_at ?? alert.timestamp),
    agentId: alert.agent_id,
    reason: alert.reason ?? '—',
    hashBefore: alert.hash_before ?? '—',
    raw: alert,
  };
};

type SeverityFilter = SeverityLevel | 'all';

export function WebshellAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [selectedAlert, setSelectedAlert] = useState<NormalizedAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 10 });
  const [pageSize, setPageSize] = useState(10);
  const [macQuery, setMacQuery] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [startQuery, setStartQuery] = useState<string | undefined>(undefined);
  const [endQuery, setEndQuery] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const fetchAlerts = useCallback(
    async ({
      signal,
      silent,
      mac,
      start,
      end,
      page,
    }: {
      signal?: AbortSignal;
      silent?: boolean;
      mac?: string;
      start?: string;
      end?: string;
      page?: number;
    } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const url = new URL(ALERTS_ENDPOINT);
        url.searchParams.set('page', page?.toString() ?? '1');
        url.searchParams.set('page_size', pageSize.toString());
        if (mac && mac.length > 0) {
          url.searchParams.set('mac', mac);
        }
        if (start) {
          url.searchParams.set('start_time', start);
        }
        if (end) {
          url.searchParams.set('end_time', end);
        }

        const { data } = await axios.get<AlertsApiResponse>(url.toString(), {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
          },
          signal,
        });

        const normalized = data.items.map(normalizeAlert);
        setAlerts(normalized);
        setMeta({
          total: data.total ?? normalized.length,
          page: data.page ?? page ?? 1,
          pageSize: data.page_size ?? pageSize,
        });
      } catch (err) {
        if (err instanceof CanceledError) {
          return;
        }
        if (isAxiosError(err)) {
          setError(err.response?.data?.message ?? err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Không thể tải dữ liệu cảnh báo');
        }
      } finally {
        if (silent) {
          if (!signal?.aborted) {
            setRefreshing(false);
          }
        } else if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [user, pageSize]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setMacQuery(searchTerm.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const formatDateTimeForAPI = (dateTimeString: string): string => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const formatDateTimeForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Set default values: end = now, start = 2 months ago
  useEffect(() => {
    const now = new Date();
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    
    setEndInput(formatDateTimeForInput(now));
    setStartInput(formatDateTimeForInput(twoMonthsAgo));
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setStartQuery(startInput ? formatDateTimeForAPI(startInput) : undefined);
      setEndQuery(endInput ? formatDateTimeForAPI(endInput) : undefined);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [startInput, endInput]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAlerts({
      signal: controller.signal,
      mac: macQuery || undefined,
      start: startQuery,
      end: endQuery,
      page,
    });
    return () => controller.abort();
  }, [fetchAlerts, macQuery, startQuery, endQuery, page, pageSize]);

  // Auto-refresh every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAlerts({
        silent: true,
        mac: macQuery || undefined,
        start: startQuery,
        end: endQuery,
        page,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchAlerts, macQuery, startQuery, endQuery, page]);

  const severityCounts = useMemo(
    () =>
      alerts.reduce(
        (acc, alert) => {
          acc[alert.severity] += 1;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0 } as Record<SeverityLevel, number>
      ),
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => severityFilter === 'all' || alert.severity === severityFilter);
  }, [alerts, severityFilter]);

  const totalServers = useMemo(() => new Set(alerts.map((alert) => alert.server)).size, [alerts]);
  const totalNewAlerts = useMemo(() => alerts.filter((alert) => alert.status === 'new').length, [alerts]);

  const totalPages = useMemo(() => {
    const total = meta.total || alerts.length || 0;
    const size = pageSize;
    return Math.max(1, Math.ceil(total / size));
  }, [meta.total, pageSize, alerts.length]);

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setPage(1);
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (totalPages <= 7) {
      // Hiển thị tất cả các trang nếu <= 7
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic hiển thị với ellipsis
      if (page <= 3) {
        // Trang đầu: 1, 2, 3, 4, 5, ..., totalPages
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        // Trang cuối: 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Trang giữa: 1, ..., page-1, page, page+1, ..., totalPages
        pages.push(1);
        pages.push('ellipsis');
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePrevPage = () => setPage((current) => Math.max(1, current - 1));
  const handleNextPage = () => setPage((current) => Math.min(totalPages, current + 1));

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="mb-1 text-gray-800">Cảnh Báo Webshell</h1>
          <p className="text-sm text-gray-600">
            Dữ liệu được tải từ API giám sát. Tổng cộng {meta.total} bản ghi (trang {meta.page}).
          </p>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-medium">Không thể tải dữ liệu cảnh báo</p>
              <p>{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-4 text-white shadow-lg"
        >
          <AlertTriangle size={24} className="mb-1" />
          <p className="mb-1 text-sm">Tổng cảnh báo</p>
          <p className="text-white">{alerts.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white shadow-lg"
        >
          <AlertCircle size={24} className="mb-1" />
          <p className="mb-1 text-sm">Nghiêm trọng</p>
          <p className="text-white">{severityCounts.critical}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-lg"
        >
          <FileCode size={24} className="mb-1" />
          <p className="mb-1 text-sm">Mới ghi nhận</p>
          <p className="text-white">{totalNewAlerts}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white shadow-lg"
        >
          <Server size={24} className="mb-1" />
          <p className="mb-1 text-sm">Servers ảnh hưởng</p>
          <p className="text-white">{totalServers}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Địa chỉ MAC</label>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" size={18} />
          <input
            type="text"
              placeholder="Ví dụ: 11:22:33"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Mức độ</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter | 'all')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:w-48"
          >
            <option value="all">Tất cả</option>
            <option value="critical">{severityConfig.critical.label}</option>
            <option value="high">{severityConfig.high.label}</option>
            <option value="medium">{severityConfig.medium.label}</option>
            <option value="low">{severityConfig.low.label}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Từ thời gian</label>
          <input
            type="datetime-local"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:w-56"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Đến thời gian</label>
          <input
            type="datetime-local"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:w-56"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="overflow-hidden rounded-lg bg-white shadow-lg"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-gray-700">File</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Agent / Server</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Quy tắc khớp</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Mức độ</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Thời gian</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {loading && alerts.length === 0 ? (
                  <motion.tr
                    key="loading-row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-gray-100"
                  >
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      Đang tải dữ liệu cảnh báo...
                    </td>
                  </motion.tr>
                ) : (
                  filteredAlerts.map((alert, index) => {
                  const severityStyle = severityConfig[alert.severity];
                  const statusStyle = statusConfig[alert.status];
                  return (
                    <motion.tr
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileCode className="text-gray-400" size={16} />
                          <div>
                              <p className="text-sm text-gray-800">{alert.fileName}</p>
                              <p className="text-xs text-gray-500">{alert.filePath}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 text-sm text-gray-700">
                            <span className="flex items-center gap-1.5 text-gray-700">
                              <Server className="h-3.5 w-3.5 text-gray-400" />
                              {alert.server}
                            </span>
                            <span className="text-xs text-gray-500">Agent: {alert.agentId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                          <span
                            className="text-sm text-gray-700"
                            style={{
                              display: 'inline-block',
                              maxWidth: '280px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              verticalAlign: 'middle',
                            }}
                            title={alert.malwareType}
                          >
                            {alert.malwareType}
                          </span>
                      </td>
                      <td className="px-4 py-3">
                          <span className={`${severityStyle.bg} ${severityStyle.color} inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs`}>
                          <AlertTriangle size={12} />
                          {severityStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                          <span className={`${statusStyle.color} inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white`}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Calendar size={14} />
                            <span>{alert.detectionTime}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedAlert(alert)}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-700"
                        >
                          <Eye size={14} />
                          Chi tiết
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {!loading && filteredAlerts.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <FileCode size={48} className="mx-auto mb-4 opacity-50" />
            <p>Không tìm thấy cảnh báo nào</p>
          </div>
        )}

        {/* Pagination */}
        <div style={{padding: '16px'}} className="border-t border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Page Info */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm font-semibold text-indigo-700">Trang</span>
                <span className="text-sm font-bold text-indigo-900">{page}</span>
                <span className="text-sm text-indigo-500">/</span>
                <span className="text-sm text-indigo-600">{totalPages}</span>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">{meta.total}</span> kết quả
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                style={{padding:6,    width: 36}}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                className="flex items-center justify-center w-11 h-11 rounded-full border border-gray-300 bg-white text-gray-600 transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-gray-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              
              {renderPageNumbers().map((item, index) => {
                if (item === 'ellipsis') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400 text-base">
                      ...
                    </span>
                  );
                }
                
                const pageNum = item as number;
                const isActive = pageNum === page;
                
                return (
                  <motion.button
                  style={{padding:6,    width: 36}}
                    key={pageNum}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                    className={` rounded-full text-base font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 border-2 border-indigo-700'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {pageNum}
                  </motion.button>
                );
              })}
              
              <motion.button
  style={{padding:6,    width: 36}}
whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNextPage}
                disabled={page === totalPages || loading}
                className="flex items-center justify-center w-11 h-11 rounded-full border border-gray-300 bg-white text-gray-600 transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-white disabled:hover:text-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
            
            {/* Right: Items Per Page */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[110px] h-9 border border-gray-300 bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            onClick={() => setSelectedAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxHeight: '70vh',
                maxWidth: '640px',
                width: '100%',
                overflowY: 'auto',
                borderRadius: '12px',
                background: '#fff',
                boxShadow: '0 20px 45px rgba(15,23,42,0.12)',
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.3)',
                  background: '#fff',
                }}
              >
                <div>
                  <h2 style={{ marginBottom: 4, fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
                    Chi Tiết Cảnh Báo Webshell
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{selectedAlert.fileName}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedAlert(null)}
                  style={{ color: '#94a3b8', transition: 'color 0.2s ease' }}
                  onMouseEnter={(event) => {
                    (event.currentTarget as HTMLButtonElement).style.color = '#475569';
                  }}
                  onMouseLeave={(event) => {
                    (event.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                  }}
                >
                  <X size={22} />
                </motion.button>
              </div>

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      backgroundColor:
                        selectedAlert.severity === 'critical'
                          ? 'rgba(248, 113, 113, 0.12)'
                          : selectedAlert.severity === 'high'
                          ? 'rgba(249, 115, 22, 0.12)'
                          : selectedAlert.severity === 'medium'
                          ? 'rgba(250, 204, 21, 0.12)'
                          : 'rgba(22, 163, 66, 0.12)',
                      color:
                        selectedAlert.severity === 'critical'
                          ? '#DC2626'
                          : selectedAlert.severity === 'high'
                          ? '#EA580C'
                          : selectedAlert.severity === 'medium'
                          ? '#CA8A04'
                          : '#16A34A',
                    }}
                  >
                    <AlertTriangle size={18} />
                    {severityConfig[selectedAlert.severity].label}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedAlert.status === 'new'
                          ? '#2563EB'
                          : selectedAlert.status === 'reviewing'
                          ? '#7C3AED'
                          : selectedAlert.status === 'confirmed'
                          ? '#DC2626'
                          : '#16A34A',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {statusConfig[selectedAlert.status].label}
                  </span>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(79, 70, 229, 0.12)',
                      color: '#4338CA',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    <Info size={16} />
                    Lý do: {selectedAlert.reason}
                  </span>
                </div>

                <section
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>Thông Tin File</h3>
                  <div
                    style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
                  >
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Tên file
                      </p>
                      <p style={{ fontSize: '14px', color: '#1f2937' }}>{selectedAlert.fileName}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Agent
                      </p>
                      <p style={{ fontSize: '14px', color: '#1f2937' }}>{selectedAlert.agentId}</p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Đường dẫn
                      </p>
                      <p
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                          fontSize: '12px',
                          color: '#1f2937',
                          background: '#fff',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          wordBreak: 'break-all',
                        }}
                      >
                        {selectedAlert.filePath}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Hash trước
                      </p>
                      <p
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                          fontSize: '12px',
                          color: '#1f2937',
                        }}
                      >
                        {selectedAlert.hashBefore}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Hash sau
                      </p>
                      <p
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                          fontSize: '12px',
                          color: '#1f2937',
                        }}
                      >
                        <Hash size={12} />
                        <span
                          style={{
                            maxWidth: '220px',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={selectedAlert.md5Hash}
                        >
                          {selectedAlert.md5Hash}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Phát hiện lúc
                      </p>
                      <p style={{ fontSize: '14px', color: '#1f2937' }}>{selectedAlert.detectionTime}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Nhận tại API
                      </p>
                      <p style={{ fontSize: '14px', color: '#1f2937' }}>{selectedAlert.lastModified}</p>
                    </div>
                  </div>
                </section>

                <section
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>Thông Tin Host</h3>
                  <div style={{ display: 'grid', gap: '6px', fontSize: '13px', color: '#1f2937' }}>
                    <p>
                      <span style={{ color: '#94a3b8' }}>Hostname:</span> {selectedAlert.raw.host.hostname ?? '—'}
                    </p>
                    <p>
                      <span style={{ color: '#94a3b8' }}>Hệ điều hành:</span> {selectedAlert.raw.host.os ?? '—'}
                    </p>
                    <p>
                      <span style={{ color: '#94a3b8' }}>Kiến trúc:</span> {selectedAlert.raw.host.arch ?? '—'}
                    </p>
                    <p>
                      <span style={{ color: '#94a3b8' }}>Kernel:</span> {selectedAlert.raw.host.kernel ?? '—'}
                    </p>
                    <p>
                      <span style={{ color: '#94a3b8' }}>IPv4:</span>{' '}
                      {selectedAlert.raw.host.ipv4 && selectedAlert.raw.host.ipv4.length > 0
                        ? selectedAlert.raw.host.ipv4.join(', ')
                        : '—'}
                    </p>
                    <p>
                      <span style={{ color: '#94a3b8' }}>MAC:</span>{' '}
                      {selectedAlert.raw.host.macs && selectedAlert.raw.host.macs.length > 0
                        ? selectedAlert.raw.host.macs.join(', ')
                        : '—'}
                    </p>
                  </div>
                </section>

                <section
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>Thông Tin Quy Tắc</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedAlert.raw.rules && selectedAlert.raw.rules.length > 0 ? (
                      selectedAlert.raw.rules.map((rule, index) => (
                        <div
                          key={`${rule.name ?? 'rule'}-${index}`}
                          style={{
                            border: '1px solid rgba(99, 102, 241, 0.15)',
                            borderRadius: '10px',
                            background: '#fff',
                            padding: '12px',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <p style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>
                            {rule.name ?? 'Không rõ'}
                          </p>
                          <p style={{ fontSize: '11px', color: '#94a3b8' }}>{rule.namespace ?? '—'}</p>
                          {rule.meta?.description && (
                            <p style={{ fontSize: '13px', color: '#334155' }}>{rule.meta.description}</p>
                          )}
                          {rule.meta?.score !== undefined && (
                            <p style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 600 }}>
                              Score: {rule.meta.score}
                            </p>
                          )}
                          {rule.meta?.author && (
                            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Tác giả: {rule.meta.author}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: '13px', color: '#475569' }}>Không có quy tắc đính kèm.</p>
                    )}
                </div>
                </section>

                <section
                  style={{
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    background: 'rgba(248, 113, 113, 0.08)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#b91c1c' }}>
                    <AlertTriangle size={18} />
                    Mẫu Nguy Hiểm Phát Hiện
                  </h3>
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedAlert.suspiciousPatterns.map((pattern, index) => (
                      <motion.span
                        key={`${pattern}-${index}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                          background: 'rgba(248, 113, 113, 0.2)',
                          color: '#b91c1c',
                          fontSize: '12px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                          padding: '6px 10px',
                          borderRadius: '999px',
                        }}
                      >
                        {pattern}
                      </motion.span>
                    ))}
                  </div>
                </section>

                {/* <div
                  style={{
                    display: 'grid',
                    gap: '10px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      borderRadius: '8px',
                      backgroundColor: '#dc2626',
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: '#fff',
                      fontWeight: 500,
                    }}
                  >
                    Xác nhận & Xóa file
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      borderRadius: '8px',
                      backgroundColor: '#d97706',
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: '#fff',
                      fontWeight: 500,
                    }}
                  >
                    Cách ly file
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      borderRadius: '8px',
                      backgroundColor: '#475569',
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: '#fff',
                      fontWeight: 500,
                    }}
                  >
                    Đánh dấu an toàn
                  </motion.button>
                </div> */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
