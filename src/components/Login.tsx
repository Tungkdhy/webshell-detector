import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, Loader2, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/alerts');
    } else {
      setError(result.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card style={{padding:16}} className="w-[480px] shadow-md border border-gray-300 bg-white">
        <CardHeader className="text-center pb-4 pt-6 px-6">
          <div className="mx-auto w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center mb-3">
            <Shield style={{width:48, height:48}} className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900 mb-1">
            Đăng nhập hệ thống
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Nhập thông tin đăng nhập để truy cập vào hệ thống
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-300">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm text-red-800 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-semibold text-gray-800">
                Tên đăng nhập
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-10 text-sm bg-white border-2 border-gray-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-800">
                Mật khẩu
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-10 text-sm bg-white border-2 border-gray-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-0 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Đăng nhập
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Shield className="w-3 h-3" />
              <p>Hệ thống quản lý cảnh báo phát hiện webshell</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

