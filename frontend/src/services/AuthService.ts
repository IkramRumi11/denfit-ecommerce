import { api } from '../api';

interface UserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// Note: backend now uses cookie-only auth and returns ApiResponse shapes; AuthService
// methods intentionally return `any`/ApiResponse to reflect that variability.

export const AuthService = {
  async login(email: string, password: string): Promise<any> {
    try {
      const response = await api.auth.login(email, password);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  },

  async register(userData: UserData): Promise<any> {
    try {
      const response = await api.auth.register(userData);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed');
    }
  },

  async logout(): Promise<void> {
    try {
      await api.auth.logout();
    } catch (error: any) {
      throw new Error(error.message || 'Logout failed');
    }
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      await api.auth.forgotPassword(email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  },

  async resetPassword(token: string, password: string): Promise<any> {
    try {
      const response = await api.auth.resetPassword(token, password);
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    }
  },

  async mergeGuestData(cartItems: any[], wishlistItems: any[]): Promise<void> {
    try {
      if (cartItems?.length || wishlistItems?.length) {
        await api.auth.mergeGuest({ cartItems: cartItems || [], wishlistItems: wishlistItems || [] });
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to merge guest data');
    }
  },
};

export default AuthService;