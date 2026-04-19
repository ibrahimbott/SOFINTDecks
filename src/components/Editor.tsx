import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Play, Trash } from 'lucide-react';
import { cn } from '../lib/utils';
import { PDFDocument } from 'pdf-lib';

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
}

export function Editor({ file, onPresent, onCancel, initialDeletedPages }: EditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(initialDeletedPages || new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');

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

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Prepare Slides</h2>
          <p className="text-gray-500 dark:text-gray-400">Select pages to skip or keep in your presentation.</p>
        </div>
        <div className="flex items-center space-x-4">
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
