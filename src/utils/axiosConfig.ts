import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Flag để tránh hiển thị nhiều toast khi có nhiều request cùng lúc
let isHandlingTokenError = false;

// Request interceptor - thêm token vào header
axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-User-Token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - xử lý lỗi authentication và hiển thị toast cho các lỗi API
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      // Xử lý lỗi 401 Unauthorized hoặc token hết hạn
      if (status === 401 || 
          data?.detail === 'Invalid or expired token' ||
          (typeof data?.detail === 'string' && (
            data.detail.toLowerCase().includes('invalid') ||
            data.detail.toLowerCase().includes('expired') ||
            data.detail.toLowerCase().includes('token')
          ))) {
        
        // Chỉ xử lý một lần nếu có nhiều request cùng lúc
        if (!isHandlingTokenError) {
          isHandlingTokenError = true;
          
          // Xóa token và user data trước
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          
          // Hiển thị toast thông báo (chỉ hiển thị một lần)
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', {
            duration: 3000,
          });
          
          // Redirect về login sau delay để đảm bảo toast được hiển thị
          setTimeout(() => {
            window.location.href = '/login';
            // Reset flag sau khi redirect
            setTimeout(() => {
              isHandlingTokenError = false;
            }, 2000);
          }, 1500);
        }

        // Trả về lỗi đã được xử lý để ngăn các handlers khác xử lý lại
        return Promise.reject(new Error('Token expired - handled by interceptor'));
      }

      // Reset flag nếu không phải lỗi token
      isHandlingTokenError = false;

      // Hiển thị toast cho các lỗi API khác
      // Lấy message từ response: ưu tiên detail, sau đó message, cuối cùng là message mặc định
      let errorMessage = '';
      
      if (data?.detail) {
        errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } else if (data?.message) {
        errorMessage = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      } else if (status >= 500) {
        errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
      } else if (status === 403) {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
      } else if (status === 404) {
        errorMessage = 'Không tìm thấy tài nguyên.';
      } else if (status >= 400) {
        errorMessage = 'Yêu cầu không hợp lệ.';
      } else {
        errorMessage = error.message || 'Đã xảy ra lỗi.';
      }

      // Hiển thị toast với message lỗi
      if (errorMessage) {
        toast.error(errorMessage, {
          duration: 4000,
        });
      }
    } else if (error.request) {
      // Request được gửi nhưng không nhận được response
      isHandlingTokenError = false;
      toast.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.', {
        duration: 4000,
      });
    } else {
      isHandlingTokenError = false;
      toast.error('Đã xảy ra lỗi. Vui lòng thử lại.', {
        duration: 4000,
      });
    }

    return Promise.reject(error);
  }
);

export default axios;

