
import React, { useState, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ComparisonView from './components/ComparisonView';
import { FinancialYearData, AppStatus, ViewState, Project } from './types';
import { extractFinancialData } from './services/geminiService';
import { BarChart3 } from 'lucide-react';

// Simple ID generator to replace crypto.randomUUID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const App: React.FC = () => {
  // --- State ---
  const [projects, setProjects] = useState<Project[]>(() => {
    // Load from local storage on init
    try {
      const saved = localStorage.getItem('dupont_projects');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [view, setView] = useState<ViewState>('LIST');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [compareProjectIds, setCompareProjectIds] = useState<string[]>([]);
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('dupont_projects', JSON.stringify(projects));
  }, [projects]);

  // --- Handlers ---

  const handleStartUpload = () => {
    setEditingProjectId(null);
    setView('UPLOAD');
    setError(null);
    setStatus(AppStatus.IDLE);
  };

  const handleRefreshProject = () => {
    if (activeProjectId) {
        setEditingProjectId(activeProjectId);
        setView('UPLOAD');
        setError(null);
        setStatus(AppStatus.IDLE);
    }
  };

  const handleAnalyzeComplete = async (files: File[], projectName: string) => {
    setStatus(AppStatus.ANALYZING);
    setError(null);
    try {
      const extractedData = await extractFinancialData(files);
      if (extractedData.length === 0) {
        throw new Error("未能从文件中解析出有效的财务数据，请确保上传包含标准科目的Excel或CSV文件（如：营业收入、归母净利润、总资产等）。");
      }
      
      if (editingProjectId) {
         // Update existing project
         setProjects(prev => prev.map(p => p.id === editingProjectId ? { 
             ...p, 
             name: projectName, 
             data: extractedData 
             // Keep original creation date
         } : p));
         
         setActiveProjectId(editingProjectId);
         setEditingProjectId(null);
      } else {
         // Create new project
         const newProject: Project = {
            id: generateId(),
            name: projectName,
            createdAt: Date.now(),
            data: extractedData
         };
         setProjects(prev => [newProject, ...prev]);
         setActiveProjectId(newProject.id);
      }

      setStatus(AppStatus.SUCCESS);
      setView('DETAIL');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "解析过程中发生错误，请检查文件格式。");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleDeleteProject = (id: string) => {
    // Confirmation is handled in ProjectList component UI
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setView('LIST');
      setActiveProjectId(null);
    }
  };

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setView('DETAIL');
  };

  const handleCompareProjects = (ids: string[]) => {
    setCompareProjectIds(ids);
    setView('COMPARE');
  };

  const getActiveProject = () => projects.find(p => p.id === activeProjectId);
  const getCompareProjects = () => projects.filter(p => compareProjectIds.includes(p.id));
  const getEditingProject = () => projects.find(p => p.id === editingProjectId);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setView('LIST')}
            >
              <div className="bg-indigo-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-800">
                DuPont Master
              </span>
            </div>
            <div className="flex items-center">
                {view !== 'LIST' && (
                    <button 
                        onClick={() => setView('LIST')}
                        className="text-sm text-gray-500 hover:text-indigo-600 font-medium px-3 py-2"
                    >
                        返回项目列表
                    </button>
                )}
            </div>
          </div>
        </div>
      </nav>

      <main className="py-6">
        {/* VIEW: PROJECT LIST */}
        {view === 'LIST' && (
          <ProjectList 
            projects={projects}
            onAddProject={handleStartUpload}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            onCompareProjects={handleCompareProjects}
          />
        )}

        {/* VIEW: UPLOAD FORM */}
        {view === 'UPLOAD' && (
          <div className="max-w-4xl mx-auto px-4 py-8">
             <FileUploader 
                onAnalyze={handleAnalyzeComplete} 
                isAnalyzing={status === AppStatus.ANALYZING} 
                onCancel={() => {
                    setEditingProjectId(null);
                    setView(activeProjectId ? 'DETAIL' : 'LIST');
                }}
                initialProjectName={getEditingProject()?.name}
             />
             {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center max-w-2xl mx-auto animate-fade-in">
                <p className="font-semibold">出错啦</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW: DASHBOARD (SINGLE PROJECT) */}
        {view === 'DETAIL' && getActiveProject() && (
          <Dashboard 
            data={getActiveProject()!.data} 
            projectName={getActiveProject()!.name}
            onBack={() => setView('LIST')}
            onRefresh={handleRefreshProject}
          />
        )}

        {/* VIEW: COMPARISON */}
        {view === 'COMPARE' && (
            <ComparisonView 
                projects={getCompareProjects()}
                onBack={() => setView('LIST')}
            />
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} DuPont Master.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
