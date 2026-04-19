import React, { useState, useEffect } from 'react';
import { Upload } from './components/Upload';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Moon, Sun, Presentation, Loader2, Shield } from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';

type ViewMode = 'upload' | 'edit' | 'present' | 'loading' | 'admin-login' | 'admin-dashboard';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectTitle, setActiveProjectTitle] = useState<string>('');
  const [isClientView, setIsClientView] = useState(false);

  const loadCloudProject = async (projectId: string, mode: 'present' | 'edit') => {
    setViewMode('loading');
    setCloudError(null);
    try {
      const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !projectRow) throw new Error("Presentation not found.");

      const { data: fileData, error: fileError } = await supabase.storage
        .from('presentations')
        .download(projectRow.file_path);

      if (fileError || !fileData) throw new Error("Could not download the presentation file.");

      const file = new File([fileData], projectRow.title || "presentation.pdf", { type: "application/pdf" });

      setPdfFile(file);
      setDeletedPages(new Set(projectRow.deleted_pages || []));
      setActiveProjectId(projectId);
      setActiveProjectTitle(projectRow.title || "Untitled Presentation");
      setViewMode(mode);
    } catch (error: any) {
      console.error("Cloud load error:", error);
      setCloudError(error.message);
      setViewMode('upload');
    }
  };

  useEffect(() => {
    // Hidden Secret Admin Route
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
      setViewMode('admin-login');
      window.history.replaceState({}, document.title, '/');
    }

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    if (projectId) {
      setIsClientView(true); // Isolate the client visually
      loadCloudProject(projectId, 'present').finally(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }

    // Set initial mode purely based on OS/Device System Setting
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    
    // Listen for OS/Device System Setting changes at runtime
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleUpload = (file: File) => {
    setPdfFile(file);
    setDeletedPages(new Set());
    setActiveProjectId(null);
    setActiveProjectTitle('');
    setIsClientView(false); // Make sure they aren't isolated
    setViewMode('edit');
  };

  const handleStartPresentation = (deleted: Set<number>) => {
    setDeletedPages(deleted);
    setViewMode('present');
  };

  const handleClosePresentation = () => {
    setViewMode('edit');
  };

  const handleCancelEdit = () => {
    setPdfFile(null);
    setActiveProjectId(null);
    setIsClientView(false);
    setViewMode('upload');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-300 flex flex-col font-sans mb-0">
      {/* Header */}
      {viewMode !== 'present' && (
        <header className="flex-none px-6 py-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner cursor-pointer" onClick={() => { setViewMode('upload'); setIsClientView(false); }}>
                <Presentation className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">SOFINT<span className="font-light">Decks</span></h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-8 md:p-12 relative w-full">
        <div className="w-full max-w-7xl h-full flex flex-col items-center justify-center">
          
          {cloudError && (
             <div className="w-full max-w-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-center border border-red-200 dark:border-red-800">
               {cloudError}
             </div>
          )}

          {viewMode === 'loading' && (
            <div className="w-full flex-1 flex flex-col items-center justify-center space-y-4">
               <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
               <p className="text-gray-500 font-medium">Downloading presentation from cloud...</p>
            </div>
          )}

          {viewMode === 'upload' && (
            <div className="w-full flex items-center justify-center">
              <Upload onUpload={handleUpload} />
            </div>
          )}

          {viewMode === 'admin-login' && (
             <div className="w-full flex items-center justify-center">
                <AdminLogin 
                  onLogin={() => setViewMode('admin-dashboard')} 
                  onCancel={() => setViewMode('upload')} 
                />
             </div>
          )}

          {viewMode === 'admin-dashboard' && (
             <div className="w-full flex-1 flex flex-col min-h-[70vh]">
                <AdminDashboard 
                  onLogout={() => { setViewMode('upload'); setIsClientView(false); }} 
                  onEditProject={(id) => { setIsClientView(false); loadCloudProject(id, 'edit'); }} 
                />
             </div>
          )}
          
          {viewMode === 'edit' && pdfFile && (
            <div className="w-full flex-1 flex flex-col min-h-[70vh] bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
              <Editor 
                file={pdfFile} 
                onPresent={handleStartPresentation} 
                onCancel={handleCancelEdit} 
                initialDeletedPages={deletedPages}
                existingProjectId={activeProjectId}
                initialTitle={activeProjectTitle}
              />
            </div>
          )}

          {viewMode === 'present' && pdfFile && (
            <div className={isClientView ? "fixed inset-0 z-50 bg-black dark:bg-black" : "w-full h-[85vh] transition-all duration-300"}>
              <Viewer 
                file={pdfFile}
                deletedPages={deletedPages}
                onClose={handleClosePresentation} 
                isDarkMode={isDarkMode}
                toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                isSharedView={isClientView}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
