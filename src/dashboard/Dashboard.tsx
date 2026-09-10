// Dashboard.tsx — Full Management Dashboard for Re-EL WebStudio

import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  appViewAtom,
  currentUserAtom,
  activeWorkspaceAtom,
  userProjectsAtom,
  builderProjectPreloadedAtom,
  setPersistedUser,
  type ReELProject,
} from '../code/stores/app-view-store';
import { REEL_TEMPLATES } from '../code/project/re-el-templates';
import { projectFS, createEmptyProject } from '../code/project/project-fs';
import { setProjectName } from '../code/stores/project-store';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'projects' | 'templates' | 'workspaces' | 'settings'>('projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank');
  const [newProjectName, setNewProjectName] = useState('');

  const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
  const [workspace, setWorkspace] = useAtom(activeWorkspaceAtom);
  const [projects, setProjects] = useAtom(userProjectsAtom);
  const setAppView = useSetAtom(appViewAtom);
  const setBuilderPreloaded = useSetAtom(builderProjectPreloadedAtom);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const templateObj = REEL_TEMPLATES.find((t) => t.id === selectedTemplateId);
    const newProj: ReELProject = {
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: newProjectName,
      description: templateObj ? templateObj.description : 'Custom Re-EL Project',
      templateId: selectedTemplateId,
      updatedAt: new Date().toISOString(),
      status: 'draft',
      subdomain: newProjectName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 32),
    };

    setProjects([newProj, ...projects]);
    setNewProjectModalOpen(false);
    setNewProjectName('');

    // Open in builder directly
    openInBuilder(newProj);
  };

  const openInBuilder = (project: ReELProject) => {
    // Hydrate ProjectFS
    const empty = createEmptyProject();
    if (project.templateId !== 'blank') {
      const templateObj = REEL_TEMPLATES.find((t) => t.id === project.templateId);
      if (templateObj) {
        empty.set('app/page.client.tsx', templateObj.code);
      }
    }
    projectFS.loadSnapshot(empty);
    setProjectName(project.name);
    setBuilderPreloaded(true);
    setAppView('builder');
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(projects.filter((p) => p.id !== id));
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setPersistedUser(null);
    setAppView('auth');
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
          <div className="bg-[#020A2B] border border-[#1E3A8A] px-3 py-1.5 rounded-lg text-xs flex items-center space-x-2 text-[#E5E7EB]">
            <span className="w-2 h-2 rounded-full bg-[#00B894]" />
            <span className="font-semibold text-white">{workspace?.name || 'Personal Workspace'}</span>
            <span className="bg-[#1E3A8A] text-[#FFD700] text-[10px] px-1.5 py-0.5 rounded font-mono uppercase">{workspace?.plan || 'Free'}</span>
          </div>
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
              <span>Workspaces</span>
            </button>

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
            <p className="text-[11px] text-[#9CA3AF]">Connected to MySQL & Vercel serverless pipeline.</p>
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
              <span className="text-xs text-[#9CA3AF]">Deployments</span>
              <div className="text-2xl font-extrabold text-[#FF8C00]">Vercel Ready</div>
            </div>
            <div className="bg-[#06124A] border border-[#1E3A8A] p-4 rounded-xl space-y-1">
              <span className="text-xs text-[#9CA3AF]">Database</span>
              <div className="text-2xl font-extrabold text-[#6A0DAD]">MySQL Connected</div>
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

          {/* Tab Views */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#E5E7EB] uppercase tracking-wider">Your Active Projects</h3>

              {filteredProjects.length === 0 ? (
                <div className="bg-[#06124A] border border-dashed border-[#1E3A8A] rounded-2xl p-12 text-center space-y-4">
                  <div className="text-4xl">🚀</div>
                  <h4 className="text-lg font-bold text-[#FFD700]">No Projects Found</h4>
                  <p className="text-xs text-[#E5E7EB] max-w-sm mx-auto">Start building with Re-EL WebStudio by creating your first website project.</p>
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
                      </div>

                      <div className="pt-4 border-t border-[#1E3A8A] flex items-center justify-between text-xs text-[#9CA3AF]">
                        <span>Updated {new Date(proj.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => handleDeleteProject(proj.id, e)}
                            className="p-1.5 hover:text-red-400 transition-colors"
                            title="Delete Project"
                          >
                            🗑️
                          </button>
                          <span className="px-3 py-1 bg-[#FFD700] text-[#020A2B] font-bold rounded-lg text-xs group-hover:scale-105 transition-transform">
                            Edit in Builder →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                className="px-5 py-2 bg-[#FFD700] hover:bg-[#D4AF00] text-[#020A2B] font-bold text-xs rounded-lg shadow-lg"
              >
                Launch Builder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
