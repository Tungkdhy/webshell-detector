import React from 'react';
import axios, { CanceledError, isAxiosError } from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  UserCheck,
  UserX,
  Shield,
  ShieldOff,
  Calendar,
  Mail,
  AlertCircle,
  Plus,
  X,
  Server,
  Check,
  Key,
  Power,
  Phone,
  Edit,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CONFIG } from '../config/const';

const base = CONFIG.AUTH_ENDPOINT || 'http://localhost:8000/api/';
export const USERS_ENDPOINT = `${base}admin/users`;
export const AGENTS_ENDPOINT = `${base}agents`;

interface AgentItem {
  id: string; // agent_unique_id
  agent_id: string;
  hostname: string;
  os?: string;
  arch?: string;
  kernel?: string;
  macs?: string[];
  ipv4?: string[];
  first_seen?: string;
  last_seen?: string;
  tag?: string;
}

interface UserApiItem {
  id: number;
  username: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  password_changed_at: string;
}

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

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Chưa đăng nhập';
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
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  const years = Math.floor(months / 12);
  return `${years} năm trước`;
};

interface UserFormData {
  username: string;
  password: string;
  is_active: boolean;
  full_name: string;
  email: string;
  phone: string;
}

export function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserApiItem | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    is_active: true,
    full_name: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showAgentsDialog, setShowAgentsDialog] = useState(false);
  const [selectedUserForAgents, setSelectedUserForAgents] = useState<UserApiItem | null>(null);
  const [allAgents, setAllAgents] = useState<AgentItem[]>([]);
  const [userAgents, setUserAgents] = useState<string[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserApiItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Redirect nếu không phải admin
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/alerts', { replace: true });
    }
  }, [user, navigate]);

  // Không render nếu không phải admin
  if (!user?.is_admin) {
    return null;
  }

  const fetchUsers = useCallback(
    async ({ signal }: { signal?: AbortSignal } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await axios.get<UserApiItem[]>(USERS_ENDPOINT, {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
          },
          signal,
        });

        setUsers(data);
      } catch (err) {
        if (err instanceof CanceledError) {
          return;
        }
        // Bỏ qua lỗi token đã được interceptor xử lý
        if (err instanceof Error && err.message === 'Token expired - handled by interceptor') {
          return;
        }
        // Tất cả lỗi API đã được interceptor xử lý và hiển thị toast
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchUsers]);

  const handleOpenDialog = (userItem?: UserApiItem) => {
    if (userItem) {
      setEditingUser(userItem);
      setFormData({
        username: userItem.username,
        password: '',
        is_active: userItem.is_active,
        full_name: userItem.full_name || '',
        email: userItem.email || '',
        phone: userItem.phone || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        is_active: true,
        full_name: '',
        email: '',
        phone: '',
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      is_active: true,
      full_name: '',
      email: '',
      phone: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<UserFormData> = {
        username: formData.username,
        is_active: formData.is_active,
        full_name: formData.full_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      };

      if (editingUser) {
        // Update user
        if (formData.password) {
          payload.password = formData.password;
        }
        await axios.put(`${USERS_ENDPOINT}/${editingUser.id}`, payload, {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
          },
        });
      } else {
        // Create user
        if (!formData.password) {
          setError('Mật khẩu là bắt buộc khi tạo mới');
          setSubmitting(false);
          return;
        }
        payload.password = formData.password;
        await axios.post(USERS_ENDPOINT, payload, {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
          },
        });
      }

      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      // Tất cả lỗi API đã được interceptor xử lý và hiển thị toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userItem: UserApiItem) => {
    try {
      await axios.post(
        `${USERS_ENDPOINT}/${userItem.id}/status`,
        {
          is_active: !userItem.is_active,
        },
        {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
            'Content-Type': 'application/json',
          },
        }
      );
      fetchUsers();
    } catch (err) {
      // Tất cả lỗi API đã được interceptor xử lý và hiển thị toast
    }
  };

  const handleOpenAgentsDialog = async (userItem: UserApiItem) => {
    setSelectedUserForAgents(userItem);
    setShowAgentsDialog(true);
    setLoadingAgents(true);
    setError(null);

    try {
      // Fetch all available agents
      const [allAgentsRes, userAgentsRes] = await Promise.all([
        axios.get<{ items: AgentItem[] }>(AGENTS_ENDPOINT, {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
          },
        }),
        axios.get<{ agent_unique_ids: string[] }>(`${USERS_ENDPOINT}/${userItem.id}/agents`, {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
          },
        }).catch(() => ({ data: { agent_unique_ids: [] } })),
      ]);

      setAllAgents(allAgentsRes.data.items || []);
      setUserAgents(userAgentsRes.data.agent_unique_ids || []);
    } catch (err) {
      // Tất cả lỗi API đã được interceptor xử lý và hiển thị toast
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleCloseAgentsDialog = () => {
    setShowAgentsDialog(false);
    setSelectedUserForAgents(null);
    setAllAgents([]);
    setUserAgents([]);
  };

  const handleToggleAgent = async (agentUniqueId: string) => {
    if (!selectedUserForAgents) return;

    const isSelected = userAgents.includes(agentUniqueId);
    let newAgentUniqueIds: string[];

    if (isSelected) {
      // Remove agent
      newAgentUniqueIds = userAgents.filter((id) => id !== agentUniqueId);
    } else {
      // Add agent
      newAgentUniqueIds = [...userAgents, agentUniqueId];
    }

    try {
      await axios.put(
        `${USERS_ENDPOINT}/${selectedUserForAgents.id}/agents`,
        { agent_unique_ids: newAgentUniqueIds },
        {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
            'Content-Type': 'application/json',
          },
        }
      );
      setUserAgents(newAgentUniqueIds);
    } catch (err) {
      // Tất cả lỗi API đã được interceptor xử lý và hiển thị toast
    }
  };

  const handleOpenPasswordDialog = (userItem: UserApiItem) => {
    setSelectedUserForPassword(userItem);
    setNewPassword('');
    setShowPasswordDialog(true);
    setError(null);
  };

  const handleClosePasswordDialog = () => {
    setShowPasswordDialog(false);
    setSelectedUserForPassword(null);
    setNewPassword('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPassword.trim()) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }

    setChangingPassword(true);
    setError(null);

    try {
      await axios.post(
        `${USERS_ENDPOINT}/${selectedUserForPassword.id}/change-password`,
        { new_password: newPassword },
        {
          headers: {
            accept: 'application/json',
            'Authorization': user?.token ? `Bearer ${user.token}` : '',
            'X-User-Token': user?.token || '',
            'Content-Type': 'application/json',
          },
        }
      );
      handleClosePasswordDialog();
      fetchUsers();
    } catch (err) {
      // Tất cả lỗi API đã được interceptor xử lý và hiển thị toast
    } finally {
      setChangingPassword(false);
    }
  };

  const totalUsers = users.length;
  const activeUsers = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const adminUsers = useMemo(() => users.filter((u) => u.is_admin).length, [users]);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div>
          <h1 className="mb-1 text-gray-800">Quản Lý Người Dùng</h1>
          <p className="text-sm text-gray-600">
            Quản lý tài khoản người dùng và phân quyền hệ thống. Tổng cộng {totalUsers} người dùng.
          </p>
        </div>
      </motion.div>


      <div className="mb-4 grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white shadow-lg"
        >
          <User size={24} className="mb-1" />
          <p className="mb-1 text-sm">Tổng người dùng</p>
          <p className="text-2xl font-bold">{totalUsers}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-4 text-white shadow-lg"
        >
          <UserCheck size={24} className="mb-1" />
          <p className="mb-1 text-sm">Đang hoạt động</p>
          <p className="text-2xl font-bold">{activeUsers}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white shadow-lg"
        >
          <Shield size={24} className="mb-1" />
          <p className="mb-1 text-sm">Quản trị viên</p>
          <p className="text-2xl font-bold">{adminUsers}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="overflow-hidden rounded-lg bg-white shadow-lg"
      >
        <div style={{justifyContent: 'flex-end'}} className="flex items-center justify-end border-b border-gray-200 bg-gray-50 px-4 py-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenDialog()}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus size={16} />
            Thêm mới
          </motion.button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên đăng nhập</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Họ tên</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Số điện thoại</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quyền</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tạo lúc</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Đăng nhập cuối</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {loading && users.length === 0 ? (
                  <motion.tr
                    key="loading-row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-gray-100"
                  >
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">
                      Đang tải dữ liệu người dùng...
                    </td>
                  </motion.tr>
                ) : users.length === 0 ? (
                  <motion.tr
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-gray-100"
                  >
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">
                      Không có người dùng nào
                    </td>
                  </motion.tr>
                ) : (
                  users.map((userItem, index) => (
                    <motion.tr
                      key={userItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-100 bg-white transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 align-middle">{userItem.id}</td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="text-indigo-600" size={16} />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{userItem.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 align-middle">{userItem.full_name || '—'}</td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          {userItem.email ? (
                            <>
                              <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{userItem.email}</span>
                            </>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          {userItem.phone ? (
                            <>
                              <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{userItem.phone}</span>
                            </>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                            userItem.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {userItem.is_active ? (
                            <>
                              <UserCheck size={12} />
                              Hoạt động
                            </>
                          ) : (
                            <>
                              <UserX size={12} />
                              Vô hiệu hóa
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                            userItem.is_admin
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {userItem.is_admin ? (
                            <>
                              <Shield size={12} />
                              Quản trị
                            </>
                          ) : (
                            <>
                              <ShieldOff size={12} />
                              Người dùng
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Calendar size={14} className="flex-shrink-0" />
                          <span>{formatDateTime(userItem.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Calendar size={14} className="flex-shrink-0" />
                            <span>{formatDateTime(userItem.last_login)}</span>
                          </div>
                          {userItem.last_login && (
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(userItem.last_login)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(userItem);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 shadow-md"
                            title="Sửa người dùng"
                          >
                            <Edit size={14} />
                            Sửa
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPasswordDialog(userItem);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-700 shadow-md"
                            title="Đổi mật khẩu"
                          >
                            <Key size={14} />
                            Mật khẩu
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(userItem);
                            }}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-colors shadow-md ${
                              userItem.is_active
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                            title={userItem.is_active ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
                          >
                            <Power size={14} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAgentsDialog(userItem);
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 shadow-md"
                            title="Quản lý Agents"
                          >
                            <Server size={14} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Dialog for Add/Edit User */}
      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleCloseDialog}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                minWidth: '620px', 
                maxWidth: '620px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
              className="w-[40%] min-w-[620px] max-w-md rounded-lg bg-white border-2 border-gray-300"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 className="text-base font-semibold text-gray-800">
                  {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                </h2>
                <button
                  onClick={handleCloseDialog}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-3">

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!!editingUser}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {editingUser && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <p className="text-xs text-blue-700">
                      💡 Để đổi mật khẩu, vui lòng sử dụng nút <strong>"Mật khẩu"</strong> trong cột hành động.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Họ tên</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0123456789"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-xs font-medium text-gray-700">
                    Tài khoản đang hoạt động
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseDialog}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={submitting}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Đang lưu...' : editingUser ? 'Cập nhật' : 'Tạo mới'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog for Change Password */}
      <AnimatePresence>
        {showPasswordDialog && selectedUserForPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleClosePasswordDialog}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                minWidth: '400px', 
                maxWidth: '400px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
              className="w-[40%] min-w-[400px] max-w-md rounded-lg bg-white border-2 border-gray-300"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 className="text-base font-semibold text-gray-800">
                  Đổi mật khẩu - {selectedUserForPassword.username}
                </h2>
                <button
                  onClick={handleClosePasswordDialog}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="p-4 space-y-3">

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClosePasswordDialog}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={changingPassword || !newPassword.trim()}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog for Manage User Agents */}
      <AnimatePresence>
        {showAgentsDialog && selectedUserForAgents && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleCloseAgentsDialog}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                minWidth: '620px', 
                maxWidth: '620px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
              className="w-[40%] min-w-[620px] max-w-md rounded-lg bg-white border-2 border-gray-300"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 className="text-base font-semibold text-gray-800">
                  Quản lý Agents - {selectedUserForAgents.username}
                </h2>
                <button
                  onClick={handleCloseAgentsDialog}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4">

                {loadingAgents ? (
                  <div className="py-8 text-center text-sm text-gray-500">Đang tải...</div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {allAgents.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-500">Không có agents nào</div>
                    ) : (
                      allAgents.map((agent) => {
                        const isSelected = userAgents.includes(agent.id);
                        return (
                          <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                              isSelected
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  isSelected ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                              >
                                <Server
                                  size={16}
                                  className={isSelected ? 'text-white' : 'text-gray-600'}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {agent.agent_id}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {agent.hostname} {agent.os && `• ${agent.os}`} {agent.tag && `• ${agent.tag}`}
                                </p>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleToggleAgent(agent.id)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                              title={isSelected ? 'Bỏ chọn' : 'Chọn'}
                            >
                              {isSelected ? <Check size={16} /> : <Plus size={16} />}
                            </motion.button>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseAgentsDialog}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

