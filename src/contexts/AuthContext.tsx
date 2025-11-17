import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios, { isAxiosError } from 'axios';

interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
}

interface User {
  username: string;
  email: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AUTH_ENDPOINT = (import.meta as any)?.env?.VITE_AUTH_ENDPOINT ?? 'http://localhost:8000/api/auth/login';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra token trong localStorage khi component mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser({ ...userData, token: storedToken });
      } catch (error) {
        // Nếu parse lỗi, xóa dữ liệu không hợp lệ
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    try {
      const response = await axios.post<LoginResponse>(
        AUTH_ENDPOINT,
        {
          username,
          password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );

      const { access_token, username: responseUsername } = response.data;
      
      const userData: User = {
        username: responseUsername,
        email: `${responseUsername}@system.com`,
        token: access_token,
      };
      
      // Lưu vào localStorage
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify({
        username: userData.username,
        email: userData.email,
      }));
      
      setUser(userData);
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      setIsLoading(false);
      
      if (isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail 
          || error.response?.data?.message 
          || error.message 
          || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.';
        return { success: false, error: errorMessage };
      }
      
      return { 
        success: false, 
        error: 'Đăng nhập thất bại. Vui lòng thử lại sau.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

