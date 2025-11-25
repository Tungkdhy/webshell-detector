import React from 'react';
import axios, { CanceledError, isAxiosError } from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  MoreVertical,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Server,
  Clock,
  Network,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// const AGENTS_ENDPOINT = 'http://localhost:8000/api/agents';
import { CONFIG } from '../config/const';
const base = CONFIG.AUTH_ENDPOINT || 'http://localhost:8000/api/';
export const AGENTS_ENDPOINT = `${base}agents`;

type AgentStatus = 'active' | 'inactive' | 'scanning';

interface AgentApiItem {
  id: number;
  agent_id: string;
  hostname: string;
  arch?: string;
  os?: string;
  kernel?: string;
  macs?: string[];
  ipv4?: string[];
  first_seen?: string;
  last_seen?: string;
}

interface NormalizedAgent {
  id: number;
  agentId: string;
  hostname: string;
  os: string;
  arch: string;
  kernel: string;
  macs: string[];
  ipv4: string[];
  status: AgentStatus;
  firstSeen: string;
  lastSeen: string;
  lastSeenRelative: string;
  uptime: string;
  firstSeenIso?: string;
  lastSeenIso?: string;
}

const parseJsonArray = (value?: string) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return local.toLocaleString('vi-VN', { hour12: false });
};

const formatDurationSince = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return '—';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const formatUptime = (firstSeen?: string, lastSeen?: string) => {
  if (!firstSeen || !lastSeen) return '—';
  const start = new Date(firstSeen);
  const end = new Date(lastSeen);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
  const diff = end.getTime() - start.getTime();
  if (diff < 0) return '—';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '< 1 phút';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
};

const deriveStatus = (lastSeen?: string): AgentStatus => {
  if (!lastSeen) return 'inactive';
  const last = new Date(lastSeen);
  if (Number.isNaN(last.getTime())) return 'inactive';
  const diffSeconds = (Date.now() - last.getTime()) / 1000;
  if (diffSeconds <= 30) return 'scanning';
  if (diffSeconds <= 300) return 'active';
  return 'inactive';
};

const isMoreThanOneHour = (lastSeen?: string): boolean => {
  if (!lastSeen) return false;
  const last = new Date(lastSeen);
  if (Number.isNaN(last.getTime())) return false;
  const diffSeconds = (Date.now() - last.getTime()) / 1000;
  return diffSeconds > 3600; // 1 hour = 3600 seconds
};

const normalizeAgent = (agent: AgentApiItem): NormalizedAgent => {
  const status = deriveStatus(agent.last_seen);
  return {
    id: agent.id,
    agentId: agent.agent_id,
    hostname: agent.hostname,
    os: agent.os ?? '—',
    arch: agent.arch ?? '—',
    kernel: agent.kernel ?? '—',
    macs: agent.macs ?? [],
    ipv4: agent.ipv4 ?? [],
    status,
    firstSeen: formatDateTime(agent.first_seen),
    lastSeen: formatDateTime(agent.last_seen),
    lastSeenRelative: formatDurationSince(agent.last_seen),
    uptime: formatUptime(agent.first_seen, agent.last_seen),
    firstSeenIso: agent.first_seen,
    lastSeenIso: agent.last_seen,
  };
};

export function AgentManagement() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<NormalizedAgent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(
    async ({ signal, silent }: { signal?: AbortSignal; silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const { data } = await axios.get<{ items: AgentApiItem[] }>(AGENTS_ENDPOINT, {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
          },
          signal,
        });
        console.log(data.items);
        
        const normalized = (data.items ?? []).map(normalizeAgent);
        setAgents(normalized);
      } catch (err) {
        if (err instanceof CanceledError) return;
        // Tất cả lỗi API đã được interceptor xử lý và hiển thị toast
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
    [user]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAgents({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchAgents]);
  console.log(agents);
  const filteredAgents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      if (!matchesStatus) return false;
      if (term.length === 0) return true;
      const haystack = [
        agent.agentId,
        agent.hostname,
        agent.os,
        agent.arch,
        agent.kernel,
        agent.ipv4,
        agent.macs,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(term));
    });
  }, [agents, searchTerm, statusFilter]);
  // console.log(filteredAgents);
  
  const handleRefresh = () => fetchAgents({ silent: true });

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-gray-800 mb-1">Quản Lý Agent</h1>
            <p className="text-gray-600 text-sm">Giám sát và quản lý các agent quét webshell</p>
          </div>
          {/* <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </motion.button> */}
        </div>
      </motion.div>


      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-4 flex flex-col md:flex-row gap-2"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo agent ID, hostname, IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        {/* <div className="flex gap-2">
          {['all', 'active', 'scanning', 'inactive'].map((status) => (
            <motion.button
              key={status}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 text-sm rounded-lg transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status === 'all'
                ? 'Tất cả'
                : status === 'active'
                ? 'Hoạt động'
                : status === 'scanning'
                ? 'Đang quét'
                : 'Tạm vắng'}
            </motion.button>
          ))}
        </div> */}
      </motion.div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && agents.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
            Đang tải dữ liệu agent...
          </div>
        ) : (
          filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(15 23 42 / 0.12)' }}
              className="bg-white rounded-lg shadow-lg p-4 relative overflow-hidden"
            >

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-gray-800 text-sm mb-1">{agent.agentId}</h3>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Server size={12} />
                      <span>{agent.hostname}</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-gray-600 mb-3">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                    isMoreThanOneHour(agent.lastSeenIso) 
                      ? 'bg-orange-50 border border-orange-200' 
                      : ''
                  }`}>
                    <Clock size={12} className={isMoreThanOneHour(agent.lastSeenIso) ? 'text-orange-500' : 'text-gray-400'} />
                    <span className={isMoreThanOneHour(agent.lastSeenIso) ? 'text-orange-700 font-medium' : ''}>Hoạt động gần nhất:</span>
                    <span className={isMoreThanOneHour(agent.lastSeenIso) ? 'text-orange-800 font-semibold' : 'text-gray-800'}>{agent.lastSeen}</span>
                    <span className={isMoreThanOneHour(agent.lastSeenIso) ? 'text-orange-600 font-medium' : 'text-gray-400'}>({agent.lastSeenRelative})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Network size={12} className="text-gray-400" />
                    <span>IPv4:</span>
                    <span className="text-gray-800">
                      {agent.ipv4 && agent.ipv4.length > 0 ? agent.ipv4[0] : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">Hostname</span>
                    <span className="text-gray-800">{agent.hostname}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">OS</span>
                    <span className="text-gray-800 capitalize">{agent.os}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">Kernel</span>
                    <span className="text-gray-800">{agent.kernel}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">Kiến trúc</span>
                    <span className="text-gray-800">{agent.arch}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">MAC</span>
                    <span className="text-gray-800">
                      {agent.macs.length > 0 ? agent.macs.join(', ') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">Uptime</span>
                    <span className="text-gray-800">{agent.uptime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">Ghi nhận lần đầu</span>
                    <span className="text-gray-800">{agent.firstSeen}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex gap-2">
                  {agent.status === 'active' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-yellow-50 text-yellow-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-yellow-100 transition-colors"
                    >
                      <PauseCircle size={16} />
                    </motion.button>
                  )}
                  {agent.status === 'inactive' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-green-50 text-green-600 px-2.5 py-1.5 rounded-lg text-xs hover:bg-green-100 transition-colors"
                    >
                      <PlayCircle size={16} />
                    </motion.button>
                  )}
                </div>
            </motion.div>
          ))
        )}
      </div>

      {!loading && filteredAgents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Server size={48} className="mx-auto mb-4 opacity-50" />
          <p>Không tìm thấy agent nào</p>
        </div>
      )}
    </div>
  );
}
