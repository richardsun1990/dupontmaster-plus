
import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onAnalyze: (files: File[], projectName: string) => void;
  isAnalyzing: boolean;
  onCancel: () => void;
  initialProjectName?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onAnalyze, isAnalyzing, onCancel, initialProjectName = '' }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState(initialProjectName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProjectName(initialProjectName);
  }, [initialProjectName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (files.length === 0 || !projectName.trim()) return;
    onAnalyze(files, projectName);
  };

  const isUpdateMode = !!initialProjectName;

  return (
    <div className="max-w-2xl mx-auto bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-100 animate-fade-in">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
            {isUpdateMode ? '更新项目数据' : '新建分析项目'}
        </h2>
        <p className="text-sm md:text-base text-gray-500">
            {isUpdateMode ? '上传新的财务报表以更新该项目的分析数据' : '上传财务报表 (Excel/CSV)，自动解析数据'}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">项目名称 / 公司名称</label>
        <input 
          type="text" 
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="例如：贵州茅台 2020-2023"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div 
        className="border-2 border-dashed border-indigo-200 rounded-lg p-6 md:p-8 flex flex-col items-center justify-center bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer mb-6"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          multiple 
          accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
        />
        <Upload className="w-10 h-10 md:w-12 md:h-12 text-indigo-500 mb-4 flex-shrink-0" />
        <p className="text-indigo-900 font-medium text-center">点击上传表格文件</p>
        <p className="text-indigo-400 text-xs md:text-sm mt-1 text-center">支持 Excel (.xlsx, .xls) 和 CSV</p>
      </div>

      {files.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-700">已选择 {files.length} 个文件:</p>
          <div className="max-h-40 overflow-y-auto pr-2 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 px-4 rounded-lg font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all text-sm md:text-base"
        >
          取消
        </button>
        <button
          onClick={handleAnalyze}
          disabled={files.length === 0 || !projectName.trim() || isAnalyzing}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 text-sm md:text-base
            ${files.length === 0 || !projectName.trim() || isAnalyzing 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{isUpdateMode ? '解析中...' : '解析中...'}</span>
            </>
          ) : (
            <>
              <span>{isUpdateMode ? '确认更新' : '开始分析'}</span>
            </>
          )}
        </button>
      </div>

      {isAnalyzing && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>正在读取并解析表格文件，请稍候。</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
