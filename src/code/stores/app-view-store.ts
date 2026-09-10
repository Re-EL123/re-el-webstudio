// app-view-store.ts — State management for Splash Screen, Auth, Dashboard, and Builder

import { atom } from 'jotai';
import type { StudioRole, StudioWorkspace } from '@/backend/studio-api';

export type AppView = 'splash' | 'auth' | 'dashboard' | 'builder';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isGuest?: boolean;
  token?: string;
  /** studioAdmin | studioUser | owner — drives admin-only affordances
   *  (Users panel, invite flows) throughout the dashboard. */
  role?: StudioRole;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  logo_url?: string;
  owner_name?: string;
}

export interface ReELProject {
  id: string;
  name: string;
  workspace_id: string;
  user_id: string;
  description?: string;
  templateId: string;
  updatedAt: string;
  createdAt?: string;
  status: 'draft' | 'published';
  subdomain?: string;
  customDomain?: string;
  previewThumbnail?: string;
  created_by?: string;
  workspace_name?: string;
}

// Initial state reads token or fallback
const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('reel_user') : null;
const parsedUser: UserAccount | null = savedUser ? (JSON.parse(savedUser) as UserAccount) : null;

export const appViewAtom = atom<AppView>('splash');
// Set by Dashboard right before mounting the builder: tells ProjectLoader the
// project snapshot is already in ProjectFS (template hydrated by openInBuilder),
// so init must skip the backend/localStorage load and the blank-content seed.
export const builderProjectPreloadedAtom = atom(false);

export const currentUserAtom = atom<UserAccount | null>(parsedUser);
export const workspacesAtom = atom<StudioWorkspace[]>([]);
export const activeWorkspaceAtom = atom<Workspace | null>({
  id: 'ws_default',
  name: parsedUser ? `${parsedUser.name}'s Workspace` : 'Personal Workspace',
  owner_id: parsedUser?.id || 'guest',
  plan: 'free',
});

export const userProjectsAtom = atom<ReELProject[]>([]);

export function setPersistedUser(user: UserAccount | null) {
  if (typeof localStorage === 'undefined') return;
  if (user) {
    localStorage.setItem('reel_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('reel_user');
  }
}
