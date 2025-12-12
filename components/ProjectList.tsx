
import React, { useState } from 'react';
import { Project } from '../types';
import { Plus, Trash2, BarChart2, CheckSquare, Square, Search } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onAddProject: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onCompareProjects: (ids: string[]) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  onAddProject, 
  onSelectProject, 
  onDeleteProject,
  onCompareProjects
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCompare = () => {
    if (selectedIds.size < 2) return;
    onCompareProjects(Array.from(selectedIds));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
           <h1 className="text-xl md:text-2xl font-bold text-gray-800">项目管理</h1>
           <p className="text-gray-500 text-sm mt-1">管理您的财务分析项目，支持多项目对比</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {projects.length > 0 && (
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="搜索项目..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          )}
          
          <button 
            onClick={onAddProject}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            新建项目
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 md:py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-8 h-8 text-indigo-500 flex-shrink-0" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">暂无项目</h3>
          <p className="text-gray-500 mt-1 mb-6">创建一个新项目开始分析财务报表</p>
          <button 
            onClick={onAddProject}
            className="text-indigo-600 font-medium hover:underline"
          >
            立即创建
          </button>
        </div>
      ) : (
        <>
          {/* Action Bar for Selection */}
          {selectedIds.size > 0 && (
            <div className="mb-6 p-3 md:p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <span className="text-indigo-900 font-medium text-sm">已选择 {selectedIds.size} 个项目</span>
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                 <button 
                   onClick={() => setSelectedIds(new Set())}
                   className="text-sm text-gray-500 hover:text-gray-700"
                 >
                   取消选择
                 </button>
                 <button 
                   onClick={handleCompare}
                   disabled={selectedIds.size < 2}
                   className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2
                     ${selectedIds.size >= 2 
                       ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                       : 'bg-indigo-200 text-indigo-400 cursor-not-allowed'}`}
                 >
                   <BarChart2 className="w-4 h-4 flex-shrink-0" />
                   对比分析
                 </button>
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div 
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`group bg-white rounded-xl border transition-all hover:shadow-lg cursor-pointer relative overflow-hidden
                  ${selectedIds.has(project.id) ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'border-gray-200 shadow-sm'}`}
              >
                {/* Selection Checkbox */}
                <div 
                  className="absolute top-4 right-4 z-10 p-2 -m-2"
                  onClick={(e) => { e.stopPropagation(); toggleSelection(project.id); }}
                >
                  {selectedIds.has(project.id) ? (
                    <CheckSquare className="w-6 h-6 text-indigo-600 bg-white rounded-sm flex-shrink-0" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-300 hover:text-indigo-400 transition-colors bg-white/80 rounded-sm flex-shrink-0" />
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-1 pr-8 truncate" title={project.name}>{project.name}</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    创建于 {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                      {project.data.length} 个年份数据
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                      {project.data[0]?.year} - {project.data[project.data.length-1]?.year}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50 relative h-10">
                    {deleteConfirmId === project.id ? (
                      <div className="absolute inset-0 bg-white flex items-center justify-end gap-2 animate-fade-in z-20">
                         <span className="text-xs text-red-600 font-medium">确定删除?</span>
                         <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onDeleteProject(project.id); 
                                setDeleteConfirmId(null); 
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                         >
                            是
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                            className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-md hover:bg-gray-200"
                         >
                            否
                         </button>
                      </div>
                    ) : (
                      <>
                        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                           查看详情
                        </button>
                        <button 
                           onClick={(e) => { 
                               e.stopPropagation(); 
                               setDeleteConfirmId(project.id); 
                           }}
                           className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                           title="删除项目"
                        >
                           <Trash2 className="w-4 h-4 flex-shrink-0" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectList;
