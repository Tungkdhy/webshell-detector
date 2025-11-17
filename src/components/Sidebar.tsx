import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, AlertTriangle, History, Menu, X, LogOut, Database } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
                  <item.icon size={20} />
                  <span>{item.label}</span>
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
            <div className="w-10 h-10 bg-indigo-400 rounded-full flex items-center justify-center">
              <span>{getUserInitials()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{getUserName()}</p>
              <p className="text-indigo-200 text-sm truncate">{getUserEmail()}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-white/10 hover:bg-white/20 text-white border-indigo-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </Button>
        </motion.div>
      </motion.div>

      {/* Spacer for content */}
      <div className={`${isOpen ? 'lg:ml-64' : ''} transition-all duration-300`} />
    </>
  );
}
