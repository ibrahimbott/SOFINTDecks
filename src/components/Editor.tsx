import React, { useState, useEffect } from 'react';
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

interface EditorProps {
  file: File;
  onPresent: (deleted: Set<number>) => void;
  onCancel: () => void;
  initialDeletedPages?: Set<number>;
  existingProjectId?: string | null;
  initialTitle?: string;
}

export function Editor({ file, onPresent, onCancel, initialDeletedPages, existingProjectId, initialTitle }: EditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(initialDeletedPages || new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [title, setTitle] = useState(initialTitle || 'Untitled Presentation');

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
    onPresent(deletedPages);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setShareUrl(null);
    try {
      let projectId = existingProjectId;

      if (existingProjectId) {
         // UPDATE Mode (Admin edit)
         const { error: updateError } = await supabase
            .from('projects')
            .update({
               deleted_pages: Array.from(deletedPages),
               title: title
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
         const { data: projectData, error: insertError } = await supabase
           .from('projects')
           .insert({
             file_path: fileName,
             deleted_pages: deletedArray,
             title: title
           })
           .select('id')
           .single();

         if (insertError || !projectData) throw insertError;
         projectId = projectData.id;
      }

      // 3. Construct URL
      const url = `${window.location.origin}?project=${projectId}`;
      setShareUrl(url);

    } catch (error: any) {
      console.error("Publish error:", error);
      alert("Failed to save. Did you remember to run the SQL snippet in your Supabase dashboard? Note: For Edits, you must upgrade the SQL table.");
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Presentation Title"
            className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 outline-none w-full max-w-md transition-colors placeholder-gray-400 dark:placeholder-gray-600 pb-1"
          />
          <p className="text-gray-500 dark:text-gray-400 mt-1">Select pages to skip or keep in your presentation.</p>
        </div>
        <div className="flex items-center space-x-3">
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
              <div 
                key={`page_${index + 1}`} 
                className="flex flex-col items-center group"
              >
                <div 
                  className={cn(
                    "relative overflow-hidden rounded-lg shadow-sm border-2 transition-all cursor-pointer",
                    isDeleted 
                      ? "border-red-500 opacity-50 grayscale" 
                      : "border-transparent hover:border-blue-400 hover:shadow-md"
                  )}
                  onClick={() => togglePageDeletion(index)}
                >
                  <Page 
                    pageNumber={index + 1} 
                    width={200} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false}
                    loading={<div className="w-[200px] h-[282px] bg-gray-200 dark:bg-gray-800 animate-pulse" />}
                  />
                  {isDeleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 backdrop-blur-[1px]">
                      <Trash className="w-10 h-10 text-red-600" />
                    </div>
                  )}
                  {!isDeleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <div className="bg-white dark:bg-gray-800 rounded-full p-2 text-gray-700 dark:text-gray-200 shadow-lg">
                        Skip Page
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Slide {index + 1}
                </div>
              </div>
            );
          })}
        </Document>
      </div>
    </div>
  );
}
