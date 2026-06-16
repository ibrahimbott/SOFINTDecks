import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Play, Trash, CloudUpload, Loader2, Link2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '../lib/supabase';

// Configure the worker to use the local Vite-bundled version for instant caching and avoiding DNS lookups
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// A simple wrapper to only render the Page when it scrolls into view
function LazyPage({ index, isDeleted, togglePageDeletion }: { index: number, isDeleted: boolean, togglePageDeletion: (i: number) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '2000px' }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      key={`page_${index + 1}`} 
      className="flex flex-col items-center group w-[150px] min-h-[212px]"
    >
      <div 
        className={cn(
          "relative overflow-hidden rounded-lg shadow-sm border-2 transition-all cursor-pointer w-[150px] h-[212px]",
          isDeleted 
            ? "border-red-500 opacity-50 grayscale" 
            : "border-transparent hover:border-blue-400 hover:shadow-md"
        )}
        onClick={() => togglePageDeletion(index)}
      >
        {isVisible ? (
          <Page 
            pageNumber={index + 1} 
            width={150} 
            devicePixelRatio={1}
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            loading={<div className="w-[150px] h-[212px] bg-gray-200 dark:bg-gray-800 animate-pulse" />}
          />
        ) : (
          <div className="w-[150px] h-[212px] bg-gray-100 dark:bg-gray-800 animate-pulse" />
        )}
        {isDeleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 backdrop-blur-[1px]">
            <Trash className="w-10 h-10 text-red-600" />
          </div>
        )}
        {!isDeleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
            <div className="bg-white dark:bg-gray-800 rounded-full p-2 text-gray-700 dark:text-gray-200 shadow-lg">
              <span className="sr-only">Skip Page</span>
              <Trash className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-gray-500 mt-2">
        Page {index + 1}
      </span>
    </div>
  );
}

interface EditorProps {
  file: File;
  onPresent: (deleted: Set<number>, theme: 'system'|'light'|'dark', download: boolean) => void;
  onCancel: () => void;
  initialDeletedPages?: Set<number>;
  existingProjectId?: string | null;
  initialTitle?: string;
  initialThemeMode?: 'system'|'light'|'dark';
  initialAllowDownload?: boolean;
}

export function Editor({ file, onPresent, onCancel, initialDeletedPages, existingProjectId, initialTitle, initialThemeMode, initialAllowDownload }: EditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(initialDeletedPages || new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [title, setTitle] = useState(initialTitle || 'Untitled Presentation');
  const [themeMode, setThemeMode] = useState<'system'|'light'|'dark'>(initialThemeMode || 'system');
  const [allowDownload, setAllowDownload] = useState<boolean>(initialAllowDownload ?? true);

  const [isPublishing, setIsPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const togglePageDeletion = (pageIndex: number) => {
    const newSet = new Set(deletedPages);
    if (newSet.has(pageIndex)) {
      newSet.delete(pageIndex);
    } else {
      newSet.add(pageIndex);
    }
    setDeletedPages(newSet);
  };

  const handleStartPresentation = async () => {
    // We seamlessly pass the deleted pages logic purely by index 
    // to bypass massive cloning performance limits in typical pdf processing
    onPresent(deletedPages, themeMode, allowDownload);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setShareUrl(null);
    try {
      let projectId = existingProjectId;

      if (existingProjectId) {
         // UPDATE Mode (Admin edit)
         const cleanTitle = title.trim() || 'Untitled';
         const { error: updateError } = await supabase
            .from('projects')
            .update({
               deleted_pages: Array.from(deletedPages),
               title: cleanTitle,
               theme_mode: themeMode,
               allow_download: allowDownload
            })
            .eq('id', existingProjectId);
         
         if (updateError) throw updateError;
      } else {
         // INSERT Mode (New Upload)
         const fileName = `${crypto.randomUUID()}.pdf`;

         const { error: uploadError } = await supabase.storage
           .from('presentations')
           .upload(fileName, file);

         if (uploadError) throw uploadError;

         const deletedArray = Array.from(deletedPages);
         const cleanTitle = title.trim() || 'Untitled';
         const { data: projectData, error: insertError } = await supabase
           .from('projects')
           .insert({
             file_path: fileName,
             deleted_pages: deletedArray,
             title: cleanTitle,
             theme_mode: themeMode,
             allow_download: allowDownload
           })
           .select('id')
           .single();

         if (insertError || !projectData) throw insertError;
         projectId = projectData.id;
      }

      // 3. Construct URL
      const shortSlug = `${encodeURIComponent(cleanTitle)}-sofint`;
      const url = `${window.location.origin}?p=${shortSlug}`;
      setShareUrl(url);

    } catch (error: any) {
      console.error("Publish error:", error);
      alert(`Failed to save: ${error.message || "Unknown error"}\n\nIf you recently added theme or download features, make sure to run the SQL command in Supabase to add 'theme_mode' and 'allow_download' columns to the 'projects' table.`);
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <div className="flex flex-col mb-6 space-y-4">
        {/* Title and Settings row */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 mr-4 min-w-[300px]">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Presentation Title"
              className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 outline-none w-full transition-colors placeholder-gray-400 dark:placeholder-gray-600 pb-1"
            />
            <p className="text-gray-500 dark:text-gray-400 mt-1">Select pages to skip or keep in your presentation.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
               <label className="text-xs font-medium text-gray-600 dark:text-gray-300 ml-1">Theme:</label>
               <select 
                 value={themeMode} 
                 onChange={(e) => setThemeMode(e.target.value as 'system'|'light'|'dark')}
                 className="bg-white dark:bg-gray-900 text-sm border-none shadow-sm rounded-md py-1 px-2 outline-none cursor-pointer"
               >
                  <option value="system">System Default</option>
                  <option value="light">Always Light</option>
                  <option value="dark">Always Dark</option>
               </select>
            </div>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1.5 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
               <label className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer flex items-center space-x-2">
                 <input 
                   type="checkbox" 
                   checked={allowDownload} 
                   onChange={(e) => setAllowDownload(e.target.checked)}
                   className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                 />
                 <span>Allow PDF Download</span>
               </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 border-t border-gray-100 dark:border-gray-800 pt-4">
          <button
            onClick={handlePublish}
            disabled={isPublishing || isProcessing || numPages === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg outline-none hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
            {isPublishing ? 'Saving...' : 'Save & Share'}
          </button>
          
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg outline-none hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleStartPresentation}
            disabled={isProcessing || numPages === 0 || deletedPages.size === numPages}
            className="flex items-center px-6 py-2 text-sm font-medium text-white transition bg-blue-600 border border-transparent rounded-lg outline-none hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Presentation
              </>
            )}
          </button>
        </div>
      </div>

      {shareUrl && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-sm text-blue-800 dark:text-blue-300 truncate">{shareUrl}</span>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out this presentation: ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center px-4 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transition rounded-md shadow-sm"
            >
              Share on WhatsApp
            </a>
            <button
              onClick={copyToClipboard}
              className="flex-shrink-0 flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-800/50 dark:hover:bg-blue-800 transition rounded-md"
            >
              {copied ? <Check className="w-4 h-4 mr-1" /> : null}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex flex-wrap justify-center gap-6"
          loading={<div className="p-8 text-gray-500">Loading document...</div>}
        >
          {Array.from(new Array(numPages), (_el, index) => {
            const isDeleted = deletedPages.has(index);
            return (
              <LazyPage 
                key={`page_${index + 1}`}
                index={index}
                isDeleted={isDeleted}
                togglePageDeletion={togglePageDeletion}
              />
            );
          })}
        </Document>
      </div>
    </div>
  );
}
