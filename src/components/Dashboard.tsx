import { motion } from 'motion/react';
import { TrendingUp, Users, Bell, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const statsData = [
  { label: 'Tổng Agent', value: '1,234', icon: Users, color: 'bg-blue-500', change: '+12%' },
  { label: 'Hoạt Động', value: '987', icon: Activity, color: 'bg-green-500', change: '+8%' },
  { label: 'Cảnh Báo', value: '23', icon: Bell, color: 'bg-red-500', change: '-5%' },
  { label: 'Hiệu Suất', value: '94%', icon: TrendingUp, color: 'bg-purple-500', change: '+3%' },
];

const chartData = [
  { name: 'T2', agents: 400, active: 240 },
  { name: 'T3', agents: 300, active: 139 },
  { name: 'T4', agents: 200, active: 980 },
  { name: 'T5', agents: 278, active: 390 },
  { name: 'T6', agents: 189, active: 480 },
  { name: 'T7', agents: 239, active: 380 },
  { name: 'CN', agents: 349, active: 430 },
];

const performanceData = [
  { name: 'T2', value: 85 },
  { name: 'T3', value: 88 },
  { name: 'T4', value: 92 },
  { name: 'T5', value: 87 },
  { name: 'T6', value: 91 },
  { name: 'T7', value: 94 },
  { name: 'CN', value: 96 },
];

export function Dashboard() {
  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-gray-800 mb-2">Bảng Điều Khiển</h1>
        <p className="text-gray-600">Tổng quan về hệ thống quản lý</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-white rounded-xl shadow-lg p-6 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-10 rounded-full -mr-8 -mt-8`} />
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <span className={`text-sm ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-gray-800">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-gray-800 mb-4">Hoạt Động Agents</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" />
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
                dataKey="agents"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="active"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-gray-800 mb-4">Hiệu Suất Hệ Thống</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
