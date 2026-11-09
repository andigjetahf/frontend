import axios from 'axios';
import type { User, Challenge, Instance, AdminOverview, ScoreboardEntry } from '@/types';

export const backendApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.200.13:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT from localStorage to every request
backendApi.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ctf_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Sync user profile to backend after login
export async function syncUser(user: User): Promise<User> {
  const response = await backendApi.post<User>('/api/users/me/sync', user);
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await backendApi.get<User>('/api/users/me');
  return response.data;
}

export async function getChallenges(): Promise<Challenge[]> {
  const response = await backendApi.get<Challenge[]>('/api/challenges');
  return response.data;
}

export async function getMyInstance(): Promise<Instance | null> {
  try {
    const response = await backendApi.get<Instance>('/api/instances/me');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function startInstance(challengeId: string): Promise<Instance> {
  const response = await backendApi.post<Instance>('/api/instances/start', { challengeId });
  return response.data;
}

export async function stopInstance(): Promise<void> {
  await backendApi.post('/api/instances/stop');
}

export async function extendInstance(): Promise<Instance> {
  const response = await backendApi.post<Instance>('/api/instances/extend');
  return response.data;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await backendApi.get<AdminOverview>('/api/admin/overview');
  return response.data;
}

export async function getAllInstances(): Promise<Instance[]> {
  const response = await backendApi.get<Instance[]>('/api/admin/instances');
  return response.data;
}

export async function killInstance(id: string): Promise<void> {
  await backendApi.delete(`/api/admin/instances/${id}`);
}

export async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const response = await backendApi.get<ScoreboardEntry[]>('/api/admin/scoreboard');
  return response.data;
}
