import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { cn } from '../lib/utils';

interface UploadProps {
  onUpload: (file: File) => void;
}

export function Upload({ onUpload }: UploadProps) {
  const onDrop = useCallback((acceptedFiles: any) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0] as File);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  } as any);

  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div
        {...getRootProps()}
        className={cn(
          "w-full max-w-2xl p-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 ease-in-out flex flex-col items-center justify-center text-center",
          isDragActive 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
            : "border-gray-300 hover:border-blue-400 dark:border-gray-700 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800/50"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-16 h-16 mb-6 text-gray-400 dark:text-gray-500" />
        <h3 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
          Upload your presentation
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Drag and drop a PDF file here, or click to browse.
        </p>
        <div className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
          Select PDF
        </div>
      </div>
    </div>
  );
}
