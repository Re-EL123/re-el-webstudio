// app-view-store.ts — State management for Splash Screen, Auth, Dashboard, and Builder

import { atom } from 'jotai';

export type AppView = 'splash' | 'auth' | 'dashboard' | 'builder';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isGuest?: boolean;
  token?: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  logo_url?: string;
}

export interface ReELProject {
  id: string;
  name: string;
  description?: string;
  templateId: string;
  updatedAt: string;
  status: 'draft' | 'published';
  subdomain?: string;
  customDomain?: string;
  previewThumbnail?: string;
}

// Initial state reads token or fallback
const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('reel_user') : null;
const parsedUser: UserAccount | null = savedUser ? JSON.parse(savedUser) : null;

export const appViewAtom = atom<AppView>('splash');
// Set by Dashboard right before mounting the builder: tells ProjectLoader the
// project snapshot is already in ProjectFS (template hydrated by openInBuilder),
// so init must skip the backend/localStorage load and the blank-content seed.
export const builderProjectPreloadedAtom = atom(false);
export const currentUserAtom = atom<UserAccount | null>(parsedUser);
export const activeWorkspaceAtom = atom<Workspace | null>({
  id: 'ws_default',
  name: parsedUser ? `${parsedUser.name}'s Workspace` : 'Personal Workspace',
  owner_id: parsedUser?.id || 'guest',
  plan: 'free',
});

export const userProjectsAtom = atom<ReELProject[]>([
  {
    id: 'proj_default_saas',
    name: 'Re-EL WebStudio SaaS Portal',
    description: 'Cloud platform landing page styled in Navy & Gold',
    templateId: 'reel-saas',
    updatedAt: new Date().toISOString(),
    status: 'published',
    subdomain: 'saas-portal',
    previewThumbnail: 'https://assets.reelwebstudio.com/templates/saas-thumb.webp',
  },
  {
    id: 'proj_default_ecom',
    name: 'Boutique Storefront',
    description: 'Luxury goods ecommerce site',
    templateId: 'reel-ecommerce',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'draft',
    subdomain: 'boutique-store',
  },
]);

export function setPersistedUser(user: UserAccount | null) {
  if (typeof localStorage === 'undefined') return;
  if (user) {
    localStorage.setItem('reel_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('reel_user');
  }
}
