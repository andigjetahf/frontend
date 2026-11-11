export type UserRole = 'ADMIN' | 'USER';
export type AuthStatus =
  | 'SUCCESS'
  | 'MUST_CHANGE_PASSWORD'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_EXPIRED'
  | 'UNAUTHORIZED_GROUP'
  | 'SERVICE_ERROR';
export type InstanceStatus =
  | 'PROVISIONING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'EXPIRED'
  | 'FAILED';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  instancesCount?: number;
  solvedCount?: number;
  totalPoints?: number;
}

export interface JwtPayload {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  ldapDn: string;
  iss: string;
  exp: number;
  iat: number;
}

export interface Challenge {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  dockerImage: string;
  internalPort: number;
}

export interface AdminChallenge extends Challenge {
  createdAt?: string;
  instancesCount?: number;
  solvedCount?: number;
}

export interface Instance {
  id: string;
  userId: string;
  challengeId: string;
  containerId?: string;
  containerName: string;
  subdomain: string;
  hostUrl: string;
  status: InstanceStatus;
  createdAt: string;
  expiresAt: string;
  stoppedAt?: string;
  stats?: {
    cpuPercent: number;
    memoryMB: number;
    memoryLimitMB: number;
  } | null;
  challenge?: Challenge;
}

export interface AdminOverview {
  totalUsers: number;
  activeInstances: number;
  challengesCount: number;
  recentSubmissions: number;
}

export interface ScoreboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  totalPoints: number;
  solvedCount: number;
}

export interface AuthResponse {
  status: AuthStatus;
  message: string;
  token?: string;
  user?: User;
  mustChangePasswordToken?: string;
}
