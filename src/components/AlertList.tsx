import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X, Filter } from 'lucide-react';
import { useState } from 'react';

const alerts = [
  {
    id: 1,
    type: 'error',
    title: 'Agent-004 vượt ngưỡng CPU',
    message: 'Agent-004 đang sử dụng 95% CPU, cần kiểm tra ngay',
    time: '2 phút trước',
    source: 'Agent-004',
  },
  {
    id: 2,
    type: 'warning',
    title: 'Kết nối không ổn định',
    message: 'Agent-002 có độ trễ cao hơn bình thường',
    time: '15 phút trước',
    source: 'Agent-002',
  },
  {
    id: 3,
    type: 'info',
    title: 'Cập nhật phần mềm',
    message: 'Phiên bản mới của Agent đã có sẵn để cài đặt',
    time: '1 giờ trước',
    source: 'Hệ thống',
  },
  {
    id: 4,
    type: 'success',
    title: 'Agent-006 đã khởi động',
    message: 'Agent-006 đã được khởi động thành công',
    time: '2 giờ trước',
    source: 'Agent-006',
  },
  {
    id: 5,
    type: 'error',
    title: 'Agent-003 mất kết nối',
    message: 'Không thể kết nối đến Agent-003, kiểm tra network',
    time: '3 giờ trước',
    source: 'Agent-003',
  },
  {
    id: 6,
    type: 'warning',
    title: 'Bộ nhớ sắp đầy',
    message: 'Agent-001 đang sử dụng 85% bộ nhớ',
    time: '4 giờ trước',
    source: 'Agent-001',
  },
];

const alertConfig = {
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
};

export function AlertList() {
  const [alertList, setAlertList] = useState(alerts);
  const [filter, setFilter] = useState<string>('all');

  const handleDismiss = (id: number) => {
    setAlertList(alertList.filter(alert => alert.id !== id));
  };

  const filteredAlerts = filter === 'all' 
    ? alertList 
    : alertList.filter(alert => alert.type === filter);

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-gray-800 mb-2">Danh Sách Cảnh Báo</h1>
        <p className="text-gray-600">Theo dõi và quản lý các thông báo hệ thống</p>
      </motion.div>

      {/* Filter Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex flex-wrap gap-3"
      >
        <div className="flex items-center gap-2 text-gray-600">
          <Filter size={20} />
          <span>Lọc:</span>
        </div>
        {['all', 'error', 'warning', 'info', 'success'].map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === type
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type === 'all' ? 'Tất cả' : 
             type === 'error' ? 'Lỗi' :
             type === 'warning' ? 'Cảnh báo' :
             type === 'info' ? 'Thông tin' : 'Thành công'}
          </motion.button>
        ))}
      </motion.div>

      {/* Alert Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(alertConfig).map(([type, config], index) => {
          const count = alertList.filter(a => a.type === type).length;
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`${config.bg} border ${config.border} rounded-lg p-4`}
            >
              <config.icon className={config.color} size={24} />
              <p className="text-gray-800 mt-2">{count}</p>
              <p className="text-gray-600 text-sm capitalize">{type}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredAlerts.map((alert, index) => {
            const config = alertConfig[alert.type as keyof typeof alertConfig];
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl shadow-lg border-l-4 ${config.border} p-6 relative overflow-hidden`}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                  className={`absolute top-0 right-0 w-32 h-32 ${config.bg} opacity-50 rounded-full -mr-16 -mt-16`}
                />
                
                <div className="flex items-start gap-4 relative">
                  <div className={`${config.bg} p-3 rounded-lg`}>
                    <config.icon className={config.color} size={24} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-gray-800">{alert.title}</h3>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDismiss(alert.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </motion.button>
                    </div>
                    <p className="text-gray-600 mb-3">{alert.message}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📍 {alert.source}</span>
                      <span>🕐 {alert.time}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredAlerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-gray-500"
          >
            <Info size={48} className="mx-auto mb-4 opacity-50" />
            <p>Không có cảnh báo nào</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
