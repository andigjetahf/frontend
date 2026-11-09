import axios from 'axios';
import type { AuthResponse, User } from '@/types';

export const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://192.168.200.11:4000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export async function login(username: string, password: string): Promise<AuthResponse> {
  try {
    const response = await authApi.post<AuthResponse>('/api/auth/login', {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return error.response.data as AuthResponse;
    }
    return {
      status: 'SERVICE_ERROR',
      message: 'Authentication service is unavailable. Please try again later.',
    };
  }
}

export async function changePassword(
  mustChangePasswordToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await authApi.post<{ success: boolean; message: string }>(
      '/api/auth/change-password',
      { mustChangePasswordToken, newPassword }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return { success: false, message: error.response.data.message || 'Password change failed.' };
    }
    return { success: false, message: 'Service unavailable. Please try again.' };
  }
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await authApi.get('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch {
    return false;
  }
}
