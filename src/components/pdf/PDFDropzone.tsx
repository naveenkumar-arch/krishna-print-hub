'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image as ImageIcon, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface PDFDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptTypes?: Record<string, string[]>;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  maxFiles?: number;
}

export const PDFDropzone: React.FC<PDFDropzoneProps> = ({
  onFilesSelected,
  acceptTypes = {
    'application/pdf': ['.pdf'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
  },
  multiple = true,
  title = 'Select PDF files',
  subtitle = 'or drop PDFs here',
  maxFiles = 20,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles && rejectedFiles.length > 0) {
        toast.error('Some files were rejected. Please upload valid PDF, PNG, or JPG files.');
      }
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptTypes,
    multiple,
    maxFiles,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-brand-600 bg-brand-50/90 scale-[1.01] shadow-lg'
            : 'border-brand-300 bg-white hover:border-brand-500 hover:bg-brand-50/30 shadow-sm'
        }`}
      >
        <input {...getInputProps()} />

        <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
          <Upload size={30} className={isDragActive ? 'animate-bounce text-brand-700' : ''} />
        </div>

        <h3 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1 tracking-tight">
          {isDragActive ? 'Drop files here...' : title}
        </h3>
        <p className="text-slate-500 text-xs md:text-sm mb-6">{subtitle}</p>

        <div className="btn-primary py-3 px-8 text-sm font-bold shadow-md rounded-xl flex items-center gap-2 mb-6">
          <FileText size={18} />
          Choose Files
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 py-2 px-4 rounded-xl">
          <span className="flex items-center gap-1">
            <FileText size={13} className="text-brand-600" /> PDF Supported
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <ImageIcon size={13} className="text-emerald-600" /> JPG / PNG Images
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-indigo-600" /> 100% Private (Browser Only)
          </span>
        </div>
      </div>
    </div>
  );
};

export default PDFDropzone;
