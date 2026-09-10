// Dashboard.tsx — Full Management Dashboard for Re-EL WebStudio.
// Server-backed: workspaces, projects, members, and (for studioAdmin) the
// whole studio user list come from the Re-EL serverless API. Falls back to
// local demo state in offline/guest mode (no VITE_API_URL / no token).

import { useEffect, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  appViewAtom,
  currentUserAtom,
  workspacesAtom,
  activeWorkspaceAtom,
  userProjectsAtom,
  builderProjectPreloadedAtom,
  setPersistedUser,
  type ReELProject,
} from '../code/stores/app-view-store';
import { REEL_TEMPLATES } from '../code/project/re-el-templates';
import { projectFS, createEmptyProject } from '../code/project/project-fs';
import { setProjectName } from '../code/stores/project-store';
import {
  getStudioToken,
  fetchWorkspaces,
  fetchProjects,
  createStudioProject,
  deleteStudioProject,
  fetchProjectDetail,
  deployProject,
  fetchAllUsers,
  setUserStudioRole,
  setUserActive,
  inviteWorkspaceMember,
  fetchWorkspaceMembers,
  removeWorkspaceMember,
  isStudioAdminRole,
  type StudioWorkspace,
  type StudioProject,
  type WorkspaceMemberRole,
  type AdminUser,
  type WorkspaceMember,
} from '../backend/studio-api';

const apiUrl = import.meta.env.VITE_API_URL || '';

function projectToReel(p: StudioProject): ReELProject {
  return {
    id: p.id,
    name: p.name,
    workspace_id: p.workspace_id,
    user_id: p.user_id,
    description: p.description ?? undefined,
    templateId: p.template_id,
    updatedAt: p.updated_at,
    createdAt: p.created_at,
    status: p.status,
    subdomain: p.subdomain ?? undefined,
    customDomain: p.custom_domain ?? undefined,
    previewThumbnail: p.preview_thumbnail ?? undefined,
    created_by: p.created_by,
    workspace_name: p.workspace_name,
  };
}

function templateCode(id: string): Record<string, string> | null {
  const tpl = REEL_TEMPLATES.find((t) => t.id === id);
  if (tpl && tpl.code) return { 'app/page.client.tsx': tpl.code };
  return null;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'projects' | 'templates' | 'workspaces' | 'settings' | 'users'>('projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank');
  const [newProjectName, setNewProjectName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [currentUser] = useAtom(currentUserAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const [workspaces, setWorkspaces] = useAtom(workspacesAtom);
  const [workspace, setWorkspace] = useAtom(activeWorkspaceAtom);
  const [projects, setProjects] = useAtom(userProjectsAtom);
  const setAppView = useSetAtom(appViewAtom);
  const setBuilderPreloaded = useSetAtom(builderProjectPreloadedAtom);

  // Admin / invite panel state
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>('editor');

  const isAdmin = isStudioAdminRole(currentUser?.role);
  const isGuest = !!currentUser?.isGuest;
  const online = !!apiUrl && !!getStudioToken() && !isGuest;

  // ─── Load live data when authenticated ──────────────────────────────────────
  useEffect(() => {
    if (!online) {
      // Offline demo state
      if (projects.length === 0) {
        setProjects([
          {
            id: 'proj_demo_saas',
            name: 'Re-EL WebStudio SaaS Portal',
            description: 'Cloud platform landing page styled in Navy & Gold',
            templateId: 'reel-saas',
            workspace_id: 'ws_default',
            user_id: 'guest',
            updatedAt: new Date().toISOString(),
            status: 'published',
            subdomain: 'saas-portal',
          },
          {
            id: 'proj_demo_ecom',
            name: 'Boutique Storefront',
            description: 'Luxury goods ecommerce site',
            templateId: 'reel-ecommerce',
            workspace_id: 'ws_default',
            user_id: 'guest',
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'draft',
            subdomain: 'boutique-store',
          },
        ]);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [wsRes, projRes] = await Promise.all([fetchWorkspaces(), fetchProjects()]);
        if (cancelled) return;
        setWorkspaces(wsRes.workspaces || []);
        setProjects((projRes.projects || []).map(projectToReel));
        if (wsRes.workspaces?.length && !workspace?.id.startsWith('ws_')) {
          const first = wsRes.workspaces[0];
          setWorkspace({
            id: first.id,
            name: first.name,
            owner_id: first.owner_id,
            plan: first.plan,
            logo_url: first.logo_url ?? undefined,
            owner_name: first.owner_name,
          });
        }
      } catch (err: any) {
        setNotice(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Load admin user list when the admin tab opens
  useEffect(() => {
    if (!online || !isAdmin || activeTab !== 'users') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAllUsers();
        if (!cancelled) setAllUsers(res.users || []);
      } catch (err: any) {
        if (!cancelled) setNotice(err.message || 'Failed to load users');
      }
    })();
    return () => { cancelled = true; };
  }, [online, isAdmin, activeTab]);

  // Load member list for the workspace admin tab
  useEffect(() => {
    if (!online || activeTab !== 'workspaces' || !workspace) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWorkspaceMembers(workspace.id);
        if (!cancelled) setMembers(res.members || []);
      } catch {
        if (!cancelled) setMembers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [online, activeTab, workspace]);

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [projects, searchQuery],
  );

  const workspaceScoped = workspace
    ? filteredProjects.filter((p) => !workspace.id.startsWith('ws_default') && (p.workspace_id === workspace.id || !p.workspace_id))
    : filteredProjects;

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const tpl = REEL_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (online) {
      try {
        setLoading(true);
        const files = templateCode(selectedTemplateId) ?? undefined;
        const res = await createStudioProject({
          name: newProjectName,
          workspaceId: workspace && !workspace.id.startsWith('ws_default') ? workspace.id : undefined,
          templateId: selectedTemplateId,
          description: tpl?.description,
          initialFiles: files,
        });
        const created: StudioProject = res.project;
        const newProj = {
          ...projectToReel(created),
          description: tpl?.description,
        };
        setProjects([newProj, ...projects]);
        setNewProjectModalOpen(false);
        setNewProjectName('');
        setNotice(`Project "${newProj.name}" created`);
        openInBuilder(newProj);
      } catch (err: any) {
        setNotice(err.message || 'Failed to create project');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Offline path
    const newProj: ReELProject = {
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: newProjectName,
      description: tpl ? tpl.description : 'Custom Re-EL Project',
      templateId: selectedTemplateId,
      workspace_id: 'ws_default',
      user_id: currentUser?.id || 'guest',
      updatedAt: new Date().toISOString(),
      status: 'draft',
      subdomain: newProjectName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 32),
    };
    setProjects([newProj, ...projects]);
    setNewProjectModalOpen(false);
    setNewProjectName('');
    openInBuilder(newProj);
  };

  const openInBuilder = async (project: ReELProject) => {
    // Hydrate ProjectFS — from the server when available, else the local
    // template / blank seed.
    if (online) {
      try {
        const detail = await fetchProjectDetail(project.id);
        projectFS.loadSnapshot(new Map(Object.entries(detail.files)));
        setProjectName(project.name);
        setBuilderPreloaded(true);
        setAppView('builder');
        return;
      } catch (err: any) {
        setNotice(err.message || 'Failed to load project, opening local copy');
      }
    }
    const empty = createEmptyProject();
    const tpl = templateCode(project.templateId);
    if (tpl) empty.set('app/page.client.tsx', tpl['app/page.client.tsx']);
    projectFS.loadSnapshot(empty);
    setProjectName(project.name);
    setBuilderPreloaded(true);
    setAppView('builder');
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = 'Delete this project permanently?';
    if (!window.confirm(confirmMsg)) return;
    if (online) {
      try {
        await deleteStudioProject(id);
        setProjects(projects.filter((p) => p.id !== id));
        setNotice('Project deleted');
      } catch (err: any) {
        setNotice(err.message || 'Failed to delete project');
      }
    } else {
      setProjects(projects.filter((p) => p.id !== id));
    }
  };

  const handlePublish = async (proj: ReELProject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!online) {
      const updated = projects.map((p) => (p.id === proj.id ? { ...p, status: 'published' as const } : p));
      setProjects(updated);
      setNotice('Published (offline mode — set VITE_API_URL to deploy)');
      return;
    }
    try {
      const res = await deployProject(proj.id);
      setProjects(projects.map((p) => (p.id === proj.id ? { ...p, status: 'published' as const, subdomain: res.deployment.url } : p)));
      setNotice(`Deployed → ${res.deployment.url}`);
    } catch (err: any) {
      setNotice(err.message || 'Deploy failed');
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setPersistedUser(null);
    setAppView('auth');
  };

  const handleSwitchWorkspace = async (ws: StudioWorkspace) => {
    setWorkspace({
      id: ws.id,
      name: ws.name,
      owner_id: ws.owner_id,
      plan: ws.plan,
      logo_url: ws.logo_url ?? undefined,
      owner_name: ws.owner_name,
    });
    if (online) {
      try {
        const res = await fetchProjects(ws.id);
        setProjects((res.projects || []).map(projectToReel));
      } catch (err: any) {
        setNotice(err.message || 'Failed to load workspace projects');
      }
    }
  };

  const handleInvite = async () => {
    if (!workspace || !inviteEmail.trim()) return;
    try {
      await inviteWorkspaceMember(workspace.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setNotice('Member invited');
      const res = await fetchWorkspaceMembers(workspace.id);
      setMembers(res.members || []);
    } catch (err: any) {
      setNotice(err.message || 'Invite failed');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspace) return;
    try {
      await removeWorkspaceMember(workspace.id, userId);
      setMembers(members.filter((m) => m.user_id !== userId));
      setNotice('Member removed');
    } catch (err: any) {
      setNotice(err.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (userId: string, role: 'studioAdmin' | 'studioUser') => {
    try {
      await setUserStudioRole(userId, role);
      setAllUsers(allUsers.map((u) => (u.id === userId ? { ...u, role } : u)));
      setNotice(`Role updated to ${role}`);
    } catch (err: any) {
      setNotice(err.message || 'Failed to update role');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (user.id === currentUser?.id) return;
    try {
      await setUserActive(user.id, user.is_active === 0);
      setAllUsers(allUsers.map((u) => (u.id === user.id ? { ...u, is_active: u.is_active === 0 ? 1 : 0 } : u)));
      setNotice(user.is_active === 0 ? 'User activated' : 'User deactivated');
    } catch (err: any) {
      setNotice(err.message || 'Failed to toggle user');
    }
  };

  return (
    <div className="min-h-screen bg-[#020A2B] text-white flex flex-col select-none font-sans">
      {/* Header */}
      <header className="h-16 border-b border-[#1E3A8A] bg-[#06124A] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setAppView('dashboard')}>
            <img src="/re-el-logo.png" alt="Re-EL WebStudio" className="h-8 w-auto object-contain" />
            <span className="font-extrabold text-lg text-[#FFD700] tracking-tight hidden sm:inline">Re-EL WebStudio</span>
          </div>

          <div className="h-5 w-px bg-[#1E3A8A] hidden sm:block" />

          {/* Workspace Switcher */}
          <div className="relative group">
            <div className="bg-[#020A2B] border border-[#1E3A8A] px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2 text-[#E5E7EB] cursor-pointer">
              <span className="w-2 h-2 rounded-full bg-[#00B894]" />
              <span className="font-semibold text-white">{workspace?.name || 'Personal Workspace'}</span>
              <span className="bg-[#1E3A8A] text-[#FFD700] text-[10px] px-1.5 py-0.5 rounded font-mono uppercase">{workspace?.plan || 'Free'}</span>
            </div>
            {workspaces.length > 1 && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-[#06124A] border border-[#1E3A8A] rounded-xl shadow-xl z-50 hidden group-hover:block p-1.5">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#1E3A8A]/50 transition-colors"
                  >
                    <span className="font-semibold text-white">{ws.name}</span>
                    <span className="text-[10px] text-[#9CA3AF] block">{ws.owner_name || 'workspace'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAdmin && !isGuest && (
            <span className="bg-[#FFD700] text-[#020A2B] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Studio Admin
            </span>
          )}
        </div>

        {/* Action Controls & Profile */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setNewProjectModalOpen(true)}
            className="px-4 py-2 bg-[#FFD700] hover:bg-[#D4AF00] text-[#020A2B] font-bold text-xs rounded-lg transition-all shadow-md flex items-center space-x-1.5"
          >
            <span>+</span>
            <span>New Project</span>
          </button>

          <div className="flex items-center space-x-2 pl-2 border-l border-[#1E3A8A]">
            <div className="w-8 h-8 rounded-full bg-[#1E3A8A] border border-[#FFD700] flex items-center justify-center font-bold text-xs text-[#FFD700]">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold leading-none">{currentUser?.name || 'User'}</span>
              <span className="text-[10px] text-[#9CA3AF] leading-tight">{currentUser?.email || 'guest@re-el'}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-[#9CA3AF] hover:text-red-400 p-1 transition-colors"
              title="Sign Out"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Notice toast */}
      {notice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#06124A] border border-[#FFD700]/50 rounded-xl px-5 py-3 text-xs text-[#FFD700] shadow-2xl flex items-center gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[#1E3A8A] bg-[#06124A]/60 p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'projects' ? 'bg-[#FFD700] text-[#020A2B] shadow-md' : 'text-[#E5E7EB] hover:bg-[#1E3A8A]/50'
              }`}
            >
              <span>📁</span>
              <span>All Projects</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'templates' ? 'bg-[#FFD700] text-[#020A2B] shadow-md' : 'text-[#E5E7EB] hover:bg-[#1E3A8A]/50'
              }`}
            >
              <span>✨</span>
              <span>Template Gallery</span>
            </button>

            <button
              onClick={() => setActiveTab('workspaces')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'workspaces' ? 'bg-[#FFD700] text-[#020A2B] shadow-md' : 'text-[#E5E7EB] hover:bg-[#1E3A8A]/50'
              }`}
            >
              <span>🏢</span>
              <span>Workspaces & Members</span>
            </button>

            {isAdmin && !isGuest && (
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'users' ? 'bg-[#FFD700] text-[#020A2B] shadow-md' : 'text-[#E5E7EB] hover:bg-[#1E3A8A]/50'
                }`}
              >
                <span>👥</span>
                <span>Studio Users</span>
                {isAdmin && <span className="ml-auto bg-[#FFD700] text-[#020A2B] text-[9px] px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
              </button>
            )}

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings' ? 'bg-[#FFD700] text-[#020A2B] shadow-md' : 'text-[#E5E7EB] hover:bg-[#1E3A8A]/50'
              }`}
            >
              <span>⚙️</span>
              <span>Studio Settings</span>
            </button>
          </div>

          <div className="bg-[#020A2B] border border-[#1E3A8A] p-3 rounded-xl space-y-2 text-xs">
            <div className="text-[#FFD700] font-bold">Re-EL Engine v1.0</div>
            <p className="text-[11px] text-[#9CA3AF]">
              {online ? 'Connected to MySQL & Vercel serverless pipeline.' : 'Offline / guest mode — register & set VITE_API_URL to go live.'}
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* Top Banner Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#06124A] border border-[#1E3A8A] p-4 rounded-xl space-y-1">
              <span className="text-xs text-[#9CA3AF]">Total Projects</span>
              <div className="text-2xl font-extrabold text-[#FFD700]">{projects.length}</div>
            </div>
            <div className="bg-[#06124A] border border-[#1E3A8A] p-4 rounded-xl space-y-1">
              <span className="text-xs text-[#9CA3AF]">Live Subdomains</span>
              <div className="text-2xl font-extrabold text-[#00B894]">{projects.filter((p) => p.status === 'published').length}</div>
            </div>
            <div className="bg-[#06124A] border border-[#1E3A8A] p-4 rounded-xl space-y-1">
              <span className="text-xs text-[#9CA3AF]">Workspaces</span>
              <div className="text-2xl font-extrabold text-[#FF8C00]">{workspaces.length || (online ? 1 : 1)}</div>
            </div>
            <div className="bg-[#06124A] border border-[#1E3A8A] p-4 rounded-xl space-y-1">
              <span className="text-xs text-[#9CA3AF]">Studio Role</span>
              <div className={`text-lg font-extrabold ${isAdmin ? 'text-[#6A0DAD]' : 'text-[#00B894]'}`}>
                {isAdmin ? 'Studio Admin' : isGuest ? 'Guest' : 'Studio User'}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-[#06124A] border border-[#1E3A8A] rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#FFD700]"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => setNewProjectModalOpen(true)}
                className="px-4 py-2 bg-[#FFD700] hover:bg-[#D4AF00] text-[#020A2B] font-bold text-xs rounded-xl transition-all shadow-md"
              >
                + Create Website
              </button>
            </div>
          </div>

          {loading && !online && <div className="text-xs text-[#9CA3AF]">Loading…</div>}

          {/* ── Projects tab ─────────────────────────────────────────────────── */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#E5E7EB] uppercase tracking-wider">
                {online && workspace ? `Projects in ${workspace.name}` : 'Your Active Projects'}
              </h3>

              {filteredProjects.length === 0 ? (
                <div className="bg-[#06124A] border border-dashed border-[#1E3A8A] rounded-2xl p-12 text-center space-y-4">
                  <div className="text-4xl">🚀</div>
                  <h4 className="text-lg font-bold text-[#FFD700]">No Projects Found</h4>
                  <p className="text-xs text-[#E5E7EB] max-w-sm mx-auto">
                    Start building with Re-EL WebStudio by creating your first website project.
                  </p>
                  <button
                    onClick={() => setNewProjectModalOpen(true)}
                    className="px-4 py-2 bg-[#FFD700] text-[#020A2B] font-bold text-xs rounded-lg"
                  >
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => openInBuilder(proj)}
                      className="bg-[#06124A] border border-[#1E3A8A] hover:border-[#FFD700] rounded-2xl p-5 space-y-4 transition-all duration-200 hover:shadow-xl hover:shadow-yellow-500/10 cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#FFD700] bg-[#020A2B] px-2.5 py-0.5 rounded-full border border-[#1E3A8A]">
                            {proj.templateId}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            proj.status === 'published' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {proj.status}
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-white group-hover:text-[#FFD700] transition-colors">{proj.name}</h4>
                        <p className="text-xs text-[#E5E7EB] opacity-80 line-clamp-2">{proj.description}</p>
                        {proj.workspace_name && (
                          <span className="text-[10px] text-[#9CA3AF]">🏢 {proj.workspace_name}</span>
                        )}
                        {proj.subdomain && (
                          <span className="text-[10px] text-[#00B894] block truncate">🔗 {proj.subdomain}</span>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#1E3A8A] flex items-center justify-between text-xs text-[#9CA3AF]">
                        <span>Updated {new Date(proj.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => handlePublish(proj, e)}
                            className="p-1.5 hover:text-emerald-400 transition-colors"
                            title="Deploy"
                          >
                            🚀
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="p-1.5 hover:text-red-400 transition-colors"
                            title="Delete Project"
                          >
                            🗑️
                          </button>
                          <span className="px-3 py-1 bg-[#FFD700] text-[#020A2B] font-bold rounded-lg text-xs group-hover:scale-105 transition-transform">
                            Edit →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Templates tab ────────────────────────────────────────────────── */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-[#E5E7EB] uppercase tracking-wider">Official Re-EL Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {REEL_TEMPLATES.map((tpl) => (
                  <div key={tpl.id} className="bg-[#06124A] border border-[#1E3A8A] rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[#FFD700] bg-[#020A2B] px-2.5 py-1 rounded-md border border-[#1E3A8A]">{tpl.category}</span>
                      <h4 className="text-lg font-bold text-white">{tpl.name}</h4>
                      <p className="text-xs text-[#E5E7EB] opacity-80">{tpl.description}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setNewProjectName(`My ${tpl.name}`);
                        setNewProjectModalOpen(true);
                      }}
                      className="w-full py-2 bg-[#FFD700] hover:bg-[#D4AF00] text-[#020A2B] font-bold text-xs rounded-xl transition-all"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Workspaces & Members tab ─────────────────────────────────────── */}
          {activeTab === 'workspaces' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-[#E5E7EB] uppercase tracking-wider">Workspaces & Members</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Workspace list */}
                <div className="space-y-3">
                  {workspaces.length === 0 && (
                    <div className="bg-[#06124A] border border-[#1E3A8A] rounded-xl p-4 text-xs text-[#9CA3AF]">
                      No workspaces yet. {online ? 'You will get one on your first project.' : 'Offline mode.'}
                    </div>
                  )}
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws)}
                      className={`p-4 rounded-xl border text-xs transition-all cursor-pointer ${
                        workspace?.id === ws.id ? 'border-[#FFD700] bg-[#1E3A8A]/40' : 'border-[#1E3A8A] bg-[#06124A] hover:border-[#FFD700]/50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-white">{ws.name}</span>
                        <span className="bg-[#020A2B] text-[#FFD700] px-2 py-0.5 rounded font-mono uppercase text-[10px]">{ws.plan}</span>
                      </div>
                      <div className="flex justify-between mt-2 text-[#9CA3AF]">
                        <span>Owner: {ws.owner_name || '—'}</span>
                        <span>{ws.owner_id === currentUser?.id ? 'You' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Members of active workspace */}
                <div className="bg-[#06124A] border border-[#1E3A8A] rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-white">Members — {workspace?.name || 'Workspace'}</h4>

                  {online && (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="member@example.com"
                        className="flex-1 min-w-[160px] px-3 py-2 bg-[#020A2B] border border-[#1E3A8A] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700]"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as WorkspaceMemberRole)}
                        className="px-2 py-2 bg-[#020A2B] border border-[#1E3A8A] rounded-lg text-xs text-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={handleInvite}
                        className="px-3 py-2 bg-[#FFD700] text-[#020A2B] font-bold text-xs rounded-lg"
                      >
                        Invite
                      </button>
                    </div>
                  )}
                  {!online && (
                    <p className="text-[10px] text-[#9CA3AF]">Member management is available online (requires VITE_API_URL + login).</p>
                  )}

                  <div className="space-y-2">
                    {members.length === 0 && (
                      <p className="text-xs text-[#9CA3AF]">{online ? 'Loading members…' : 'No members to show offline.'}</p>
                    )}
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#020A2B] border border-[#1E3A8A]">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#1E3A8A] flex items-center justify-center text-[10px] font-bold text-[#FFD700] shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-white font-semibold truncate">{m.name}</div>
                            <div className="text-[10px] text-[#9CA3AF] truncate">{m.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${
                            m.role === 'admin' ? 'bg-[#6A0DAD]/30 text-[#D8B4FE]' : m.role === 'viewer' ? 'bg-[#FF8C00]/20 text-orange-300' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {m.role}
                          </span>
                          {m.user_id !== currentUser?.id && m.user_id !== workspace?.owner_id && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id)}
                              className="text-[10px] text-red-400 hover:text-red-300"
                              title="Remove member"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Studio Users tab (admin only) ────────────────────────────────── */}
          {activeTab === 'users' && isAdmin && !isGuest && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#E5E7EB] uppercase tracking-wider">Studio Users</h3>
                <span className="text-xs text-[#9CA3AF]">
                  {allUsers.length} account{allUsers.length === 1 ? '' : 's'} · role management is studioAdmin-only
                </span>
              </div>

              <div className="bg-[#06124A] border border-[#1E3A8A] rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#020A2B] border-b border-[#1E3A8A] text-[#9CA3AF] uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-semibold">User</th>
                      <th className="text-left px-4 py-3 font-semibold">Role</th>
                      <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Projects</th>
                      <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b border-[#1E3A8A]/50 hover:bg-[#1E3A8A]/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-[#1E3A8A] border border-[#FFD700] flex items-center justify-center font-bold text-[10px] text-[#FFD700] shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{u.name}{u.id === currentUser?.id && <span className="text-[#FFD700]"> (you)</span>}</div>
                              <div className="text-[10px] text-[#9CA3AF]">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md font-semibold uppercase text-[10px] ${
                            u.role === 'studioAdmin' || u.role === 'owner'
                              ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-[#9CA3AF]">{u.projects}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`text-[10px] font-bold uppercase ${u.is_active === 1 ? 'text-[#00B894]' : 'text-red-400'}`}>
                            {u.is_active === 1 ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRoleChange(u.id, u.role === 'studioAdmin' || u.role === 'owner' ? 'studioUser' : 'studioAdmin')}
                              disabled={u.id === currentUser?.id}
                              className="px-2 py-1 bg-[#020A2B] border border-[#1E3A8A] rounded-md text-[10px] hover:border-[#FFD700] disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Toggle studio role"
                            >
                              {u.role === 'studioAdmin' || u.role === 'owner' ? 'Make User' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => handleToggleActive(u)}
                              disabled={u.id === currentUser?.id}
                              className="px-2 py-1 bg-[#020A2B] border border-[#1E3A8A] rounded-md text-[10px] hover:border-[#FFD700] disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Deactivate / reactivate"
                            >
                              {u.is_active === 1 ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Settings tab ─────────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-[#E5E7EB] uppercase tracking-wider">Studio Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#06124A] border border-[#1E3A8A] rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white">Account</h4>
                  <div className="text-xs space-y-2 text-[#E5E7EB]">
                    <div><span className="text-[#9CA3AF]">Name:</span> {currentUser?.name}</div>
                    <div><span className="text-[#9CA3AF]">Email:</span> {currentUser?.email}</div>
                    <div><span className="text-[#9CA3AF]">Role:</span> {isAdmin ? 'Studio Admin' : 'Studio User'}</div>
                    <div className="pt-3">
                      <button
                        onClick={handleSignOut}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-300 font-semibold text-xs rounded-lg hover:bg-red-500/30"
                      >
                        Sign out of Studio
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#06124A] border border-[#1E3A8A] rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white">Engine</h4>
                  <div className="text-xs space-y-2 text-[#E5E7EB]/80">
                    <div className="flex justify-between"><span>Builder</span><span className="text-[#FFD700]">Re-EL WebStudio</span></div>
                    <div className="flex justify-between"><span>Backend</span><span className="text-[#9CA3AF]">{online ? 'MySQL + Serverless API' : 'Offline / localStorage'}</span></div>
                    <div className="flex justify-between"><span>CMS</span><span className="text-[#9CA3AF]">Per-project content files</span></div>
                    <div className="flex justify-between"><span>Deploy</span><span className="text-[#9CA3AF]">Vercel adapter</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Project Modal */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#06124A] border border-[#1E3A8A] rounded-2xl p-6 w-full max-w-lg space-y-6 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1E3A8A] pb-3">
              <h3 className="text-lg font-bold text-[#FFD700]">Create New Website</h3>
              <button onClick={() => setNewProjectModalOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#E5E7EB] mb-1">Website Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Acme Corporate Web"
                  className="w-full px-3 py-2 bg-[#020A2B] border border-[#1E3A8A] rounded-lg text-sm text-white focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E5E7EB] mb-2">Select Template</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSelectedTemplateId('blank')}
                    className={`p-3 border rounded-xl cursor-pointer text-xs space-y-1 transition-all ${
                      selectedTemplateId === 'blank' ? 'border-[#FFD700] bg-[#1E3A8A]/40' : 'border-[#1E3A8A] bg-[#020A2B]'
                    }`}
                  >
                    <div className="font-bold text-[#FFD700]">Blank Starter</div>
                    <p className="text-[10px] text-gray-400">Clean slate canvas</p>
                  </div>

                  {REEL_TEMPLATES.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`p-3 border rounded-xl cursor-pointer text-xs space-y-1 transition-all ${
                        selectedTemplateId === t.id ? 'border-[#FFD700] bg-[#1E3A8A]/40' : 'border-[#1E3A8A] bg-[#020A2B]'
                      }`}
                    >
                      <div className="font-bold text-[#FFD700] truncate">{t.name}</div>
                      <p className="text-[10px] text-gray-400 truncate">{t.category}</p>
                    </div>
                  ))}
                </div>
              </div>

              {online && (
                <div>
                  <label className="block text-xs font-semibold text-[#E5E7EB] mb-1">Workspace</label>
                  <select
                    value={workspace?.id || ''}
                    onChange={(e) => {
                      const ws = workspaces.find((w) => w.id === e.target.value);
                      if (ws) handleSwitchWorkspace(ws);
                    }}
                    className="w-full px-3 py-2 bg-[#020A2B] border border-[#1E3A8A] rounded-lg text-sm text-white focus:outline-none focus:border-[#FFD700]"
                  >
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#1E3A8A]">
              <button
                onClick={() => setNewProjectModalOpen(false)}
                className="px-4 py-2 bg-[#020A2B] hover:bg-[#1E3A8A] text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={loading}
                className="px-5 py-2 bg-[#FFD700] hover:bg-[#D4AF00] text-[#020A2B] font-bold text-xs rounded-lg shadow-lg disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Launch Builder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}