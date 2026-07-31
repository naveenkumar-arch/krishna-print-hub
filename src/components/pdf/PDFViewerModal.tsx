'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize, Download } from 'lucide-react';
import { getPDFJSDocument, renderPageToCanvas, downloadBlob } from '@/lib/pdfUtils';
import toast from 'react-hot-toast';

interface PDFViewerModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ file, isOpen, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);

  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!file || !isOpen) return;

    let isMounted = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        const pdf = await getPDFJSDocument(file);
        if (!isMounted) return;

        setPdfDocProxy(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load PDF for viewing:', err);
        toast.error('Could not load PDF document.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [file, isOpen]);

  useEffect(() => {
    if (pdfDocProxy && mainCanvasRef.current && currentPage <= numPages) {
      renderPageToCanvas(pdfDocProxy, currentPage, mainCanvasRef.current, scale);
    }
  }, [pdfDocProxy, currentPage, scale]);

  if (!isOpen || !file) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, numPages));

  const handleDownload = () => {
    downloadBlob(file, file.name, file.type || 'application/pdf');
    toast.success('Downloading original PDF...');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col">
      {/* Top Navbar */}
      <div className="bg-slate-900 text-white h-14 px-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 truncate max-w-sm">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-slate-400 hover:text-white text-xs font-semibold bg-slate-800 px-2.5 py-1 rounded"
          >
            {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          </button>
          <span className="font-bold text-xs truncate">{file.name}</span>
        </div>

        {/* Center Page Nav & Zoom */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg">
            <button
              disabled={currentPage <= 1}
              onClick={handlePrevPage}
              className="hover:text-brand-400 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-slate-300">
              {currentPage} / {numPages}
            </span>
            <button
              disabled={currentPage >= numPages}
              onClick={handleNextPage}
              className="hover:text-brand-400 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg">
            <button onClick={handleZoomOut} className="p-1 hover:text-brand-400">
              <ZoomOut size={16} />
            </button>
            <span className="text-[11px] font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-1 hover:text-brand-400">
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="btn-primary py-1.5 px-3 text-xs bg-brand-600 hover:bg-brand-700 font-semibold"
          >
            <Download size={14} /> Download
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar thumbnails */}
        {showSidebar && (
          <div className="w-56 bg-slate-900/90 border-r border-slate-800 p-3 overflow-y-auto hidden md:block space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Thumbnails ({numPages})
            </span>
            {Array.from({ length: numPages }).map((_, idx) => {
              const pNum = idx + 1;
              return (
                <SidebarThumbnail
                  key={pNum}
                  pdfDocProxy={pdfDocProxy}
                  pageNum={pNum}
                  isActive={currentPage === pNum}
                  onClick={() => setCurrentPage(pNum)}
                />
              );
            })}
          </div>
        )}

        {/* Main Canvas Viewport */}
        <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/80">
          {loading ? (
            <div className="text-white text-sm animate-pulse flex items-center gap-2 py-20">
              Loading PDF Document...
            </div>
          ) : (
            <div className="bg-white shadow-2xl rounded p-2 border border-slate-200">
              <canvas ref={mainCanvasRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarThumbnail: React.FC<{ pdfDocProxy: any; pageNum: number; isActive: boolean; onClick: () => void }> = ({
  pdfDocProxy,
  pageNum,
  isActive,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (pdfDocProxy && canvasRef.current) {
      renderPageToCanvas(pdfDocProxy, pageNum, canvasRef.current, 0.25);
    }
  }, [pdfDocProxy, pageNum]);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg p-2 flex flex-col items-center gap-1 transition-all ${
        isActive ? 'bg-brand-600/30 border-2 border-brand-500' : 'bg-slate-800 hover:bg-slate-700/60 border border-slate-700'
      }`}
    >
      <canvas ref={canvasRef} className="shadow max-h-28 rounded" />
      <span className={`text-[10px] font-bold ${isActive ? 'text-brand-300' : 'text-slate-400'}`}>
        Page {pageNum}
      </span>
    </div>
  );
};

export default PDFViewerModal;
