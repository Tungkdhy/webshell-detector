import { motion } from 'motion/react';
import { History, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const dailyDetections = [
  { date: '04/11', count: 12 },
  { date: '05/11', count: 8 },
  { date: '06/11', count: 15 },
  { date: '07/11', count: 10 },
  { date: '08/11', count: 18 },
  { date: '09/11', count: 5 },
];

const detectionsByType = [
  { name: 'PHP Webshell', value: 45, color: '#ef4444' },
  { name: 'JSP Webshell', value: 25, color: '#f97316' },
  { name: 'ASPX Webshell', value: 20, color: '#eab308' },
  { name: 'Others', value: 10, color: '#6366f1' },
];

const recentHistory = [
  { id: 1, date: '09/11/2024 14:32', file: 'shell.php', server: 'web-server-01', action: 'Phát hiện', result: 'Đã xóa' },
  { id: 2, date: '09/11/2024 14:17', file: 'cmd.jsp', server: 'app-server-02', action: 'Phát hiện', result: 'Đang xử lý' },
  { id: 3, date: '09/11/2024 13:15', file: 'backdoor.aspx', server: 'iis-server-03', action: 'Phát hiện', result: 'Đã cách ly' },
  { id: 4, date: '09/11/2024 12:45', file: 'c99.php', server: 'web-server-04', action: 'Phát hiện', result: 'Đã xóa' },
  { id: 5, date: '09/11/2024 11:20', file: 'uploader.php', server: 'web-server-01', action: 'Phát hiện', result: 'An toàn' },
];

export function DetectionHistory() {
  const totalDetections = dailyDetections.reduce((sum, day) => sum + day.count, 0);
  const avgPerDay = (totalDetections / dailyDetections.length).toFixed(1);
  const trend = dailyDetections[dailyDetections.length - 1].count > dailyDetections[0].count ? 'up' : 'down';

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1 className="text-gray-800 mb-1">Lịch Sử Phát Hiện</h1>
        <p className="text-gray-600 text-sm">Thống kê và lịch sử các lần phát hiện webshell</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4"
        >
          <History size={24} className="mb-1" />
          <p className="text-sm mb-1">Tổng phát hiện (7 ngày)</p>
          <p className="text-white">{totalDetections}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-4"
        >
          <Calendar size={24} className="mb-1" />
          <p className="text-sm mb-1">Trung bình mỗi ngày</p>
          <p className="text-white">{avgPerDay}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`bg-gradient-to-br ${trend === 'up' ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white rounded-lg shadow-lg p-4`}
        >
          {trend === 'up' ? <TrendingUp size={24} className="mb-1" /> : <TrendingDown size={24} className="mb-1" />}
          <p className="text-sm mb-1">Xu hướng</p>
          <p className="text-white">{trend === 'up' ? 'Tăng' : 'Giảm'}</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Line Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-lg p-4"
        >
          <h3 className="text-gray-800 text-sm mb-3">Phát Hiện Theo Ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyDetections}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-lg p-4"
        >
          <h3 className="text-gray-800 text-sm mb-3">Phân Loại Theo Loại</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={detectionsByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {detectionsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent History Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-lg overflow-hidden"
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-gray-800 text-sm">Lịch Sử Gần Đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Thời gian</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">File</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Server</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Hành động</th>
                <th className="px-4 py-3 text-left text-sm text-gray-700">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-700 text-sm">{item.date}</td>
                  <td className="px-4 py-3 text-gray-800 text-sm">{item.file}</td>
                  <td className="px-4 py-3 text-gray-700 text-sm">{item.server}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                      {item.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.result === 'Đã xóa' ? 'bg-red-100 text-red-700' :
                      item.result === 'Đã cách ly' ? 'bg-yellow-100 text-yellow-700' :
                      item.result === 'An toàn' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.result}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
