import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertTriangle, History, Menu, X, LogOut, Database, Users, Key } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import axios, { isAxiosError } from 'axios';
import { CONFIG } from '../config/const';

// Helper function to decode JWT token
const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenPasswordDialog = () => {
    setShowPasswordDialog(true);
    setNewPassword('');
    setPasswordError(null);
  };

  const handleClosePasswordDialog = () => {
    setShowPasswordDialog(false);
    setNewPassword('');
    setPasswordError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token || !newPassword.trim()) {
      setPasswordError('Vui lòng nhập mật khẩu mới');
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);

    try {
      // Decode JWT để lấy user_id
      const decodedToken = decodeJWT(user.token);
      const userId = decodedToken?.user_id || decodedToken?.sub;

      if (!userId) {
        setPasswordError('Không thể xác định thông tin người dùng');
        setChangingPassword(false);
        return;
      }

      const base = CONFIG.AUTH_ENDPOINT || 'http://localhost:8000/api/';
      await axios.post(
        `${base}admin/users/${userId}/change-password`,
        { new_password: newPassword },
        {
          headers: {
            accept: 'application/json',
            'Authorization': `Bearer ${user.token}`,
            'X-User-Token': user.token,
            'Content-Type': 'application/json',
          },
        }
      );
      handleClosePasswordDialog();
      alert('Đổi mật khẩu thành công!');
    } catch (err) {
      if (isAxiosError(err)) {
        setPasswordError(err.response?.data?.message ?? err.message);
      } else if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Không thể đổi mật khẩu');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const getUserInitials = () => {
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'SA';
  };

  const getUserEmail = () => {
    return user?.email || 'security@system.com';
  };

  const getUserName = () => {
    return user?.username || 'Security Admin';
  };

  const menuItems = [
    { path: '/alerts', label: 'Cảnh Báo Webshell', icon: AlertTriangle },
    { path: '/agents', label: 'Quản Lý Agent', icon: Shield },
    ...(user?.is_admin ? [{ path: '/users', label: 'Quản Lý Người Dùng', icon: Users }] : []),
    // { path: '/db-config', label: 'Cấu hình DB', icon: Database },
    // { path: '/history', label: 'Lịch Sử Phát Hiện', icon: History },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width:262
        }}
        className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-indigo-600 to-indigo-800 text-white shadow-2xl z-40"
      >
        <div className="p-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Shield className="text-indigo-600" size={24} />
            </div>
            <span>Webshell Detector</span>
          </motion.h1>

          <nav className="space-y-2">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <NavLink
                  to={item.path}
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setIsOpen(false);
                    }
                  }}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive || location.pathname === item.path
                        ? 'bg-white text-indigo-600 shadow-lg'
                        : 'hover:bg-indigo-700'
                    }`
                  }
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              </motion.div>
            ))}
          </nav>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-0 left-0 right-0 p-6 border-t border-indigo-500"
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenPasswordDialog}
              className="w-10 h-10 bg-indigo-400 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-all hover:bg-indigo-300"
              title="Click để đổi mật khẩu"
            >
              <span>{getUserInitials()}</span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{getUserName()}</p>
              <p className="text-indigo-200 text-sm truncate">{getUserEmail()}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border-indigo-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Spacer for content */}
      <div className={`${isOpen ? 'lg:ml-64' : ''} transition-all duration-300`} />

      {/* Dialog for Change Password */}
      <AnimatePresence>
        {showPasswordDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
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
                  Đổi mật khẩu
                </h2>
                <button
                  onClick={handleClosePasswordDialog}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="p-4 space-y-3">
                {passwordError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {passwordError}
                  </div>
                )}

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
    </>
  );
}
