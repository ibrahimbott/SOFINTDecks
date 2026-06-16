import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X, Sun, Moon, Download } from 'lucide-react';
import { cn } from '../lib/utils';

// Configure the worker to use the local Vite-bundled version for instant caching
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface ViewerProps {
  file: File;
  deletedPages: Set<number>;
  onClose: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isSharedView?: boolean;
  allowDownload?: boolean;
}

export function Viewer({ file, deletedPages, onClose, isDarkMode, toggleDarkMode, isSharedView, allowDownload = true }: ViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [validPages, setValidPages] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderWindow, setRenderWindow] = useState<number[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [docFile, setDocFile] = useState<{ url: string } | null>(null);
  const [hasClickedStart, setHasClickedStart] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setDocFile({ url: objectUrl });
    
    if (!isSharedView) {
      setDownloadUrl(objectUrl);
    }
    
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isSharedView]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isGeneratingPdf) return;
    
    // If it's already generated and cached in state, just download it
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = "Presentation.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const totalPages = pdfDoc.getPageCount();
      
      // Remove deleted pages iteratively backwards to preserve index alignment!
      for (let i = totalPages - 1; i >= 0; i--) {
        if (deletedPages.has(i)) {
          pdfDoc.removePage(i);
        }
      }
      
      // Add watermark to remaining pages
      const pages = pdfDoc.getPages();
      pages.forEach((page) => {
        const { width } = page.getSize();
        const watermarkText = 'SOFINT Decks';
        
        // Dynamically scale font size based on page width so it's always readable but not overwhelming (approx 2.5% of width, min 16pt)
        const fontSize = Math.max(16, width * 0.025);
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        
        page.drawText(watermarkText, {
          x: width - textWidth - (width * 0.04), // Dynamic padding from right edge
          y: Math.max(20, width * 0.04), // Dynamic padding from bottom edge
          size: fontSize,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.5,
        });
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const newUrl = URL.createObjectURL(blob);
      setDownloadUrl(newUrl);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = newUrl;
      a.download = "Presentation.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      // Fallback to original file
      const originalUrl = URL.createObjectURL(file);
      setDownloadUrl(originalUrl);
      const a = document.createElement('a');
      a.href = originalUrl;
      a.download = "Presentation.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    if (numPages > 0) {
      const valid = [];
      for (let i = 0; i < numPages; i++) {
        if (!deletedPages.has(i)) {
          valid.push(i + 1); // 1-indexed for pdf.js canvas page lookup
        }
      }
      setValidPages(valid);
      setCurrentIndex(0);
    }
  }, [numPages, deletedPages]);

  useEffect(() => {
    if (validPages.length > 0) {
      const windowPages = new Set<number>();
      for (let i = currentIndex - 1; i <= currentIndex + 2; i++) {
        if (i >= 0 && i < validPages.length) {
          windowPages.add(validPages[i]);
        }
      }
      setRenderWindow(Array.from(windowPages));
    }
  }, [currentIndex, validPages]);

  const changePage = useCallback((offset: number) => {
    setCurrentIndex((prev) => {
      const next = prev + offset;
      if (next < 0) return 0;
      if (next >= validPages.length) return validPages.length - 1;
      return next;
    });
  }, [validPages]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === ' ') {
      changePage(1);
    } else if (event.key === 'ArrowLeft') {
      changePage(-1);
    } else if (event.key === 'Escape') {
      if (isFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else {
        onClose();
      }
    }
  }, [changePage, isFullscreen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to disable fullscreen: ${err.message}`);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col items-center w-full h-full relative transition-colors duration-300",
        isFullscreen ? "bg-black" : "bg-gray-100 dark:bg-gray-900 rounded-xl"
      )}
    >
      {/* Top toolbar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 transition-opacity",
        isFullscreen ? "opacity-0 hover:opacity-100 bg-gradient-to-b from-black/60 to-transparent" : "bg-transparent"
      )}>
        <div>
          {!isSharedView && (
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-full transition-colors",
                isFullscreen 
                  ? "text-white hover:bg-white/20" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              )}
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isSharedView && allowDownload && (
            <button
              onClick={handleDownload}
              className={cn(
                "p-2 rounded-full transition-colors",
                isFullscreen 
                  ? "text-white hover:bg-white/20" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800",
                isGeneratingPdf ? "opacity-30 cursor-wait" : ""
              )}
              title="Download PDF Presentation"
            >
              <Download className={cn("w-5 h-5", isGeneratingPdf && "animate-pulse")} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={toggleDarkMode}
              className={cn(
                "p-2 rounded-full transition-colors",
                isFullscreen 
                  ? "text-white hover:bg-white/20" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              )}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <div className="relative group/fullscreen">
            <button
              onClick={toggleFullscreen}
              className={cn(
                "p-2 rounded-full transition-colors relative z-10",
                isFullscreen 
                  ? "text-white hover:bg-white/20" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              )}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {isSharedView && !hasClickedStart && (
        <div 
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity duration-300"
          onClick={() => {
             setHasClickedStart(true);
             toggleFullscreen();
          }}
        >
           <div className="bg-white/10 p-6 rounded-2xl border border-white/20 text-center shadow-2xl backdrop-blur-md">
              <Maximize2 className="w-12 h-12 text-white mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-bold text-white mb-2">Start Presentation</h2>
              <p className="text-white/70">Click anywhere to load presentation in full screen</p>
           </div>
        </div>
      )}

      {/* Main viewer area */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative group py-8 px-4 md:px-16">
        {/* Previous Button */}
        <button
          onClick={() => changePage(-1)}
          disabled={currentIndex <= 0}
          className={cn(
            "absolute left-4 md:left-4 top-1/2 -translate-y-1/2 z-30 p-3 md:p-4 rounded-full transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] backdrop-blur-[10px]",
            "opacity-100 disabled:opacity-0 disabled:pointer-events-none shadow-xl hover:scale-105 active:scale-95",
            isFullscreen 
              ? "bg-white/10 text-white hover:bg-white/20 border border-white/20" 
              : "bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 border border-black/10 dark:border-white/10"
          )}
        >
          <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
        </button>

        <div className={cn(
          "relative flex items-center justify-center w-full h-full transition-all duration-300 ease-in-out",
          // The magic dark mode filter for the PDF canvas
          isDarkMode ? "invert hue-rotate-180" : ""
        )}>
          {docFile && (
            <Document
              file={docFile}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="text-gray-500 animate-pulse font-medium tracking-wide">Loading engine...</div>}
              className="flex justify-center items-center w-full h-full relative"
            >
              {renderWindow.map((p) => {
                  const isActive = p === validPages[currentIndex];
                  return (
                    <div
                      key={p}
                      className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isActive ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-[0.95] pointer-events-none"
                      )}
                    >
                      <Page
                        pageNumber={p}
                        width={1200}
                        devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
                        className={cn(
                           "flex items-center justify-center max-w-full max-h-full transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                           "[&_div]:max-w-full [&_div]:max-h-full [&_div]:flex [&_div]:items-center [&_div]:justify-center",
                           "[&_canvas]:max-w-full [&_canvas]:max-h-full [&_canvas]:w-auto! [&_canvas]:h-auto! [&_canvas]:object-contain [&_canvas]:shadow-2xl [&_canvas]:rounded-xl"
                        )}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={null}
                      />
                    </div>
                  );
                })}
            </Document>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={() => changePage(1)}
          disabled={currentIndex >= validPages.length - 1}
          className={cn(
            "absolute right-4 md:right-4 top-1/2 -translate-y-1/2 z-30 p-3 md:p-4 rounded-full transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] backdrop-blur-[10px]",
            "opacity-100 disabled:opacity-0 disabled:pointer-events-none shadow-xl hover:scale-105 active:scale-95",
            isFullscreen 
              ? "bg-white/10 text-white hover:bg-white/20 border border-white/20" 
              : "bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 border border-black/10 dark:border-white/10"
          )}
        >
          <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
        </button>
      </div>

      {/* Visual Screen Watermark */}
      {isSharedView && (
        <div className="absolute bottom-6 right-8 z-30 pointer-events-none select-none opacity-50 mix-blend-difference flex items-center">
          <span className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            SOFINT<span className="font-light">Decks</span>
          </span>
        </div>
      )}

      {/* Bottom Counter */}
      <div className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-all z-20",
        "backdrop-blur-md shadow-sm",
        isFullscreen 
          ? "bg-black/50 text-white/90" 
          : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50"
      )}>
        Slide {currentIndex + 1 || '--'} of {validPages.length || '--'}
      </div>
    </div>
  );
}
