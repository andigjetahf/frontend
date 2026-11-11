import axios from 'axios';
import type { User, Challenge, Instance, AdminOverview, ScoreboardEntry, AdminUser, UserRole } from '@/types';

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
  const response = await backendApi.post<any>('/api/users/me/sync', user);
  return response.data?.user ?? response.data;
}

export async function getMe(): Promise<User> {
  const response = await backendApi.get<any>('/api/users/me');
  return response.data?.user ?? response.data;
}

export async function getChallenges(): Promise<Challenge[]> {
  const response = await backendApi.get<any>('/api/challenges');
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.challenges)) return response.data.challenges;
  return [];
}

export async function getMyInstance(): Promise<Instance | null> {
  try {
    const response = await backendApi.get<any>('/api/instances/me');
    if (!response.data) return null;
    const data = response.data;
    if (data.instance) {
      return { ...data.instance, stats: data.stats ?? null };
    }
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function startInstance(challengeId: string): Promise<Instance> {
  const response = await backendApi.post<any>('/api/instances/start', { challengeId });
  return response.data?.instance ?? response.data;
}

export async function stopInstance(): Promise<void> {
  await backendApi.post('/api/instances/stop');
}

export async function extendInstance(): Promise<Instance> {
  const response = await backendApi.post<any>('/api/instances/extend');
  return response.data?.instance ?? response.data;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await backendApi.get<any>('/api/admin/overview');
  const data = response.data?.overview ?? response.data ?? {};
  return {
    totalUsers: data.totalUsers ?? 0,
    activeInstances: data.activeInstances ?? 0,
    challengesCount: data.challengesCount ?? 0,
    recentSubmissions: Array.isArray(data.recentSubmissions)
      ? data.recentSubmissions.length
      : Number(data.recentSubmissions ?? 0),
  };
}

export async function getAllInstances(): Promise<Instance[]> {
  const response = await backendApi.get<any>('/api/admin/instances');
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.instances)) return response.data.instances;
  return [];
}

export async function killInstance(id: string): Promise<void> {
  await backendApi.delete(`/api/admin/instances/${id}`);
}

export async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const response = await backendApi.get<any>('/api/admin/scoreboard');
  const rawList = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data?.scoreboard)
    ? response.data.scoreboard
    : [];
  return rawList.map((entry: any, index: number) => ({
    rank: entry.rank ?? index + 1,
    userId: entry.userId ?? entry.user?.id ?? String(index),
    username: entry.username ?? entry.user?.username ?? 'anonymous',
    displayName: entry.displayName ?? entry.user?.displayName ?? entry.username ?? 'Anonymous',
    totalPoints: entry.totalPoints ?? entry.points ?? 0,
    solvedCount: entry.solvedCount ?? entry.challengesSolved ?? 0,
  }));
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await backendApi.get<any>('/api/admin/users');
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.users)) return response.data.users;
  return [];
}

export async function createAdminUser(data: {
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
}): Promise<AdminUser> {
  const response = await backendApi.post<any>('/api/admin/users', data);
  return response.data?.user ?? response.data;
}

export async function updateAdminUser(
  id: string,
  data: {
    username?: string;
    email?: string;
    displayName?: string;
    role?: UserRole;
  }
): Promise<AdminUser> {
  const response = await backendApi.put<any>(`/api/admin/users/${id}`, data);
  return response.data?.user ?? response.data;
}

export async function deleteAdminUser(id: string): Promise<void> {
  await backendApi.delete(`/api/admin/users/${id}`);
}
