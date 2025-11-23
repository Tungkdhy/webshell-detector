import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { WebshellAlerts } from './components/WebshellAlerts';
import { AgentManagement } from './components/AgentManagement';
import { DetectionHistory } from './components/DetectionHistory';
import { UserManagement } from './components/UserManagement';

function Layout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <main className="lg:ml-64 transition-all duration-300 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Routes location={location}>
              <Route index element={<Navigate to="/alerts" replace />} />
              <Route path="/alerts" element={<WebshellAlerts />} />
              <Route path="/agents" element={<AgentManagement />} />
              <Route path="/users" element={<UserManagement />} />
              {/* <Route path="/history" element={<DetectionHistory />} /> */}
              <Route path="*" element={<Navigate to="/alerts" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
