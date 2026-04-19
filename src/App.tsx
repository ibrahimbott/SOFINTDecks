import React, { useState, useEffect } from 'react';
import { Upload } from './components/Upload';
import { Editor } from './components/Editor';
import { Viewer } from './components/Viewer';
import { Moon, Sun, Presentation } from 'lucide-react';
import { cn } from './lib/utils';

type ViewMode = 'upload' | 'edit' | 'present';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check system preference on initial load
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
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
    setViewMode('upload');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-300 flex flex-col font-sans mb-0">
      {/* Header */}
      {viewMode !== 'present' && (
        <header className="flex-none px-6 py-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                <Presentation className="text-white w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">SOFINT<span className="font-light">Decks</span></h1>
            </div>
            
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-8 md:p-12 relative w-full">
        <div className="w-full max-w-7xl h-full flex flex-col items-center justify-center">
          
          {viewMode === 'upload' && (
            <div className="w-full flex items-center justify-center">
              <Upload onUpload={handleUpload} />
            </div>
          )}
          
          {viewMode === 'edit' && pdfFile && (
            <div className="w-full flex-1 flex flex-col min-h-[70vh] bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
              <Editor 
                file={pdfFile} 
                onPresent={handleStartPresentation} 
                onCancel={handleCancelEdit} 
                initialDeletedPages={deletedPages}
              />
            </div>
          )}

          {viewMode === 'present' && pdfFile && (
            <div className="w-full h-[85vh] transition-all duration-300">
              <Viewer 
                file={pdfFile}
                deletedPages={deletedPages}
                onClose={handleClosePresentation} 
                isDarkMode={isDarkMode}
                toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
