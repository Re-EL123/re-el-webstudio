// studio-api.ts — Typed client for the Re-EL WebStudio serverless API
// (re-el-webstudio-api — Vercel + MySQL). The dashboard lives entirely on
// these endpoints; the editor's own save pipeline uses the older
// `revyme-backend` adapter (localBackend / revymeBackend) which is separate.

import type { UserAccount } from '@/code/stores/app-view-store';

const API_URL = ((import.meta as ImportMeta & { env: Record<string, string> }).env?.VITE_API_URL ?? '').replace(/\/$/, '');

// ─── Types (mirror the API response shapes) ──────────────────────────────────

export type StudioRole = 'studioAdmin' | 'studioUser' | 'owner';
export type WorkspaceMemberRole = 'admin' | 'editor' | 'viewer';

export interface StudioWorkspace {
  id: string;
  name: string;
  owner_id: string;
  logo_url: string | null;
  plan: string;
  owner_name?: string;
  owner_email?: string;
  created_at?: string;
}

export interface StudioProject {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description: string | null;
  template_id: string;
  preview_thumbnail: string | null;
  status: 'draft' | 'published';
  subdomain: string | null;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
  workspace_name?: string;
}

export interface WorkspaceMember {
  user_id: string;
  role: string;
  invited_by: string | null;
  created_at: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: StudioRole;
  avatar_url: string | null;
  is_active: number;
  created_at: string;
  own_workspaces: number;
  projects: number;
}

export interface ProjectFiles {
  [filePath: string]: string;
}

export interface ApiProjectDetail {
  project: StudioProject;
  files: ProjectFiles;
}

export interface ApiError {
  error?: { message?: string };
}

// ─── Auth token persistence ──────────────────────────────────────────────────

const TOKEN_KEY = 'reel_studio_token';

export function getStudioToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStudioToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// ─── Core request helper ──────────────────────────────────────────────────────

export async function studioRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const { method = 'GET', body } = options;
  const token = options.token === undefined ? getStudioToken() : options.token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data: T & ApiError;
  try {
    data = await res.json();
  } catch {
    data = {} as T & ApiError;
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || `Request failed (${res.status})`);
  }
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: { id: string; email: string; name: string; role: StudioRole };
  workspaces: StudioWorkspace[];
}

export interface RegisterResponse extends LoginResponse {
  defaultWorkspaceId: string;
}

export function loginUser(email: string, password: string): Promise<LoginResponse> {
  return studioRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    token: null,
  });
}

export function registerUser(name: string, email: string, password: string): Promise<RegisterResponse> {
  return studioRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
    token: null,
  });
}

// ─── Me / profile ─────────────────────────────────────────────────────────────

export interface MeResponse {
  user: { id: string; email: string; name: string; role: StudioRole; avatar_url: string | null };
  workspaces: StudioWorkspace[];
}

export function fetchMe(): Promise<MeResponse> {
  return studioRequest<MeResponse>('/api/auth/me');
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export function fetchWorkspaces(): Promise<{ workspaces: StudioWorkspace[] }> {
  return studioRequest('/api/workspaces');
}

export function createWorkspace(name: string, logoUrl?: string): Promise<{ workspace: StudioWorkspace }> {
  return studioRequest('/api/workspaces', {
    method: 'POST',
    body: { name, logo_url: logoUrl ?? null },
  });
}

export function fetchWorkspaceMembers(workspaceId: string): Promise<{ members: WorkspaceMember[] }> {
  return studioRequest(`/api/workspaces?action=members&workspaceId=${encodeURIComponent(workspaceId)}`);
}

export function inviteWorkspaceMember(
  workspaceId: string,
  email: string,
  role: WorkspaceMemberRole = 'editor',
): Promise<{ message: string; member: WorkspaceMember }> {
  return studioRequest(`/api/workspaces?action=invite`, {
    method: 'POST',
    body: { workspaceId, email, role },
  });
}

export function removeWorkspaceMember(workspaceId: string, userId: string): Promise<{ message: string }> {
  return studioRequest(`/api/workspaces?action=remove&workspaceId=${encodeURIComponent(workspaceId)}&userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function fetchProjects(workspaceId?: string): Promise<{ projects: StudioProject[] }> {
  const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  return studioRequest(`/api/projects${qs}`);
}

export function createStudioProject(
  payload: { name: string; workspaceId?: string; templateId?: string; description?: string; initialFiles?: Record<string, string> },
): Promise<{ project: StudioProject; message: string }> {
  return studioRequest('/api/projects', { method: 'POST', body: payload });
}

export function fetchProjectDetail(id: string): Promise<ApiProjectDetail> {
  return studioRequest(`/api/projects/${id}`);
}

export function saveStudioProject(
  id: string,
  payload: { name?: string; description?: string; status?: string; files?: Record<string, string> },
): Promise<{ message: string }> {
  return studioRequest(`/api/projects/${id}`, { method: 'PUT', body: payload });
}

export function deleteStudioProject(id: string): Promise<{ message: string }> {
  return studioRequest(`/api/projects/${id}`, { method: 'DELETE' });
}

export function deployProject(
  projectId: string,
  target = 'vercel',
): Promise<{ message: string; deployment: { id: string; url: string; target: string; status: string } }> {
  return studioRequest('/api/deploy', { method: 'POST', body: { projectId, target } });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function fetchAllUsers(): Promise<{ users: AdminUser[] }> {
  return studioRequest('/api/admin/users');
}

export function setUserStudioRole(userId: string, role: StudioRole): Promise<{ message: string }> {
  return studioRequest(`/api/admin/users?action=role&id=${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: { role },
  });
}

export function setUserActive(userId: string, active: boolean): Promise<{ message: string }> {
  return studioRequest(`/api/admin/users?action=${active ? 'activate' : 'deactivate'}&id=${encodeURIComponent(userId)}`, {
    method: 'PATCH',
  });
}

export function deleteStudioUser(userId: string): Promise<{ message: string }> {
  return studioRequest(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

// ─── Converts an API user into the app's UserAccount shape ───────────────────

export function toUserAccount(input: { id: string; email: string; name: string; role: StudioRole }): UserAccount {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role,
  };
}

export function isStudioAdminRole(role?: string): boolean {
  return role === 'studioAdmin' || role === 'owner';
}