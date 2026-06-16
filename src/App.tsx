import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload } from './components/Upload';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Moon, Sun, Presentation, Loader2, Shield } from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './lib/supabase';

type ViewMode = 'upload' | 'edit' | 'present' | 'loading' | 'admin-login' | 'admin-dashboard' | 'not-found' | 'landing';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectTitle, setActiveProjectTitle] = useState<string>('');
  const [projectThemeMode, setProjectThemeMode] = useState<'system'|'light'|'dark'>('system');
  const [projectAllowDownload, setProjectAllowDownload] = useState<boolean>(true);
  const [isClientView, setIsClientView] = useState(false);

  const loadCloudProject = async (projectIdOrSlug: string, mode: 'present' | 'edit') => {
    setViewMode('loading');
    setCloudError(null);
    try {
      let query = supabase.from('projects').select('*');
      
      // If it's a short link (e.g. MyProject-sofint)
      if (projectIdOrSlug.endsWith('-sofint')) {
        const titleSearch = decodeURIComponent(projectIdOrSlug.replace(/-sofint$/, '')).trim();
        query = query.eq('title', titleSearch).order('created_at', { ascending: false }).limit(1);
      } else {
        // Fallback or old UUID links
        query = query.eq('id', projectIdOrSlug).limit(1);
      }

      const { data, error } = await query;
      const projectRow = data?.[0];

      if (error || !projectRow) throw new Error("Presentation not found.");

      const { data: fileData, error: fileError } = await supabase.storage
        .from('presentations')
        .download(projectRow.file_path);

      if (fileError || !fileData) throw new Error("Could not download the presentation file.");

      const file = new File([fileData], projectRow.title || "presentation.pdf", { type: "application/pdf" });

      setPdfFile(file);
      setDeletedPages(new Set(projectRow.deleted_pages || []));
      setActiveProjectId(projectId);
      setActiveProjectTitle(projectRow.title || "Untitled Presentation");
      setProjectThemeMode(projectRow.theme_mode || 'system');
      setProjectAllowDownload(projectRow.allow_download ?? true);
      setViewMode(mode);

      if (projectRow.theme_mode === 'dark') {
        setIsDarkMode(true);
      } else if (projectRow.theme_mode === 'light') {
        setIsDarkMode(false);
      }
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
    } else if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/?')) {
      setViewMode('not-found');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    const shortProject = params.get('p');
    
    if (projectId) {
      setIsClientView(true);
      loadCloudProject(projectId, 'present').finally(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else if (shortProject) {
      setIsClientView(true);
      loadCloudProject(shortProject, 'present').finally(() => {
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
    setProjectThemeMode('system');
    setProjectAllowDownload(true);
    setIsClientView(false); // Make sure they aren't isolated
    setViewMode('edit');
  };

  const handleStartPresentation = (deleted: Set<number>, theme: 'system'|'light'|'dark', download: boolean) => {
    setDeletedPages(deleted);
    setProjectThemeMode(theme);
    setProjectAllowDownload(download);
    
    if (theme === 'dark') setIsDarkMode(true);
    else if (theme === 'light') setIsDarkMode(false);

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

          {viewMode === 'landing' && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8 }}
               className="w-full h-full flex flex-col items-center justify-center space-y-6 text-center px-4 bg-gray-50 dark:bg-gray-900"
             >
                <div className="relative">
                   <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl mb-4 rotate-3">
                     <Shield className="w-12 h-12 text-white" />
                   </div>
                   <motion.div 
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
                     className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 shadow-lg"
                   >
                     <div className="w-4 h-4 rounded-full bg-white"></div>
                   </motion.div>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl tracking-tight font-extrabold text-gray-900 dark:text-white">
                  Sofint solution
                </h1>
                <p className="max-w-2xl text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  This website is only for the team or soft-end solution team.
                </p>
                
                <div className="mt-8 flex flex-col items-center space-y-3">
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-400 dark:text-gray-500">
                    Not everyone can access this page
                  </span>
                  <a 
                    href="mailto:contact@sofintsolutions.tech" 
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium transition-colors"
                  >
                    contact@sofintsolutions.tech
                  </a>
                </div>
             </motion.div>
          )}

          {viewMode === 'not-found' && (
             <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                <Shield className="w-16 h-16 text-blue-600 opacity-50" />
                <h1 className="text-3xl tracking-tight text-gray-900 dark:text-white">Services only for the team</h1>
                <p className="text-gray-500 dark:text-gray-400">This page does not exist or requires proper authorization.</p>
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
                  onLogout={() => { setPdfFile(null); setViewMode('landing'); setIsClientView(false); }} 
                  onEditProject={(id) => { setIsClientView(false); loadCloudProject(id, 'edit'); }} 
                  onUploadNew={() => { setPdfFile(null); setViewMode('upload'); setIsClientView(false); }}
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
                initialThemeMode={projectThemeMode}
                initialAllowDownload={projectAllowDownload}
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
                allowDownload={projectAllowDownload}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
