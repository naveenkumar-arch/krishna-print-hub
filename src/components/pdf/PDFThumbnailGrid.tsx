'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RotateCw, Trash2, ArrowLeft, ArrowRight, Check, Eye } from 'lucide-react';
import { getPDFJSDocument, renderPageToCanvas } from '@/lib/pdfUtils';
import toast from 'react-hot-toast';

export interface ThumbnailPage {
  originalPageIndex: number; // 0-based
  displayNumber: number; // 1-based page number
  rotation: number; // 0, 90, 180, 270
  selected: boolean;
  dataUrl?: string;
}

interface PDFThumbnailGridProps {
  file: File;
  pages: ThumbnailPage[];
  setPages: React.Dispatch<React.SetStateAction<ThumbnailPage[]>>;
  allowReorder?: boolean;
  allowRotate?: boolean;
  allowDelete?: boolean;
  allowSelect?: boolean;
  onPreviewPage?: (pageNum: number) => void;
}

export const PDFThumbnailGrid: React.FC<PDFThumbnailGridProps> = ({
  file,
  pages,
  setPages,
  allowReorder = true,
  allowRotate = true,
  allowDelete = true,
  allowSelect = true,
  onPreviewPage,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPdfPages = async () => {
      try {
        setLoading(true);
        const pdf = await getPDFJSDocument(file);
        pdfDocRef.current = pdf;

        if (!isMounted) return;

        // Initialize pages array if empty
        if (pages.length === 0) {
          const initPages: ThumbnailPage[] = [];
          for (let i = 0; i < pdf.numPages; i++) {
            initPages.push({
              originalPageIndex: i,
              displayNumber: i + 1,
              rotation: 0,
              selected: true,
            });
          }
          setPages(initPages);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to load PDF thumbnails:', err);
        toast.error('Could not render PDF thumbnails.');
        setLoading(false);
      }
    };

    loadPdfPages();

    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleRotatePage = (index: number) => {
    setPages((prev) =>
      prev.map((page, idx) => (idx === index ? { ...page, rotation: (page.rotation + 90) % 360 } : page))
    );
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      toast.error('PDF must contain at least 1 page.');
      return;
    }
    setPages((prev) => prev.filter((_, idx) => idx !== index));
    toast.success(`Page deleted`);
  };

  const handleToggleSelect = (index: number) => {
    setPages((prev) =>
      prev.map((page, idx) => (idx === index ? { ...page, selected: !page.selected } : page))
    );
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-200 h-56 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
          {pages.map((page, index) => (
            <PageCard
              key={`${page.originalPageIndex}-${index}`}
              pdfDocProxy={pdfDocRef.current}
              page={page}
              index={index}
              totalCount={pages.length}
              allowReorder={allowReorder}
              allowRotate={allowRotate}
              allowDelete={allowDelete}
              allowSelect={allowSelect}
              onRotate={() => handleRotatePage(index)}
              onDelete={() => handleDeletePage(index)}
              onToggleSelect={() => handleToggleSelect(index)}
              onMoveLeft={() => handleMoveLeft(index)}
              onMoveRight={() => handleMoveRight(index)}
              onPreview={onPreviewPage ? () => onPreviewPage(page.originalPageIndex + 1) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface PageCardProps {
  pdfDocProxy: any;
  page: ThumbnailPage;
  index: number;
  totalCount: number;
  allowReorder: boolean;
  allowRotate: boolean;
  allowDelete: boolean;
  allowSelect: boolean;
  onRotate: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onPreview?: () => void;
}

const PageCard: React.FC<PageCardProps> = ({
  pdfDocProxy,
  page,
  index,
  totalCount,
  allowReorder,
  allowRotate,
  allowDelete,
  allowSelect,
  onRotate,
  onDelete,
  onToggleSelect,
  onMoveLeft,
  onMoveRight,
  onPreview,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (pdfDocProxy && canvasRef.current) {
      renderPageToCanvas(pdfDocProxy, page.originalPageIndex + 1, canvasRef.current, 0.4);
    }
  }, [pdfDocProxy, page.originalPageIndex]);

  return (
    <div
      className={`relative bg-white border rounded-xl p-2.5 flex flex-col items-center justify-between transition-all group ${
        page.selected ? 'border-brand-500 shadow-md ring-2 ring-brand-500/20' : 'border-slate-200 opacity-60'
      }`}
    >
      {/* Top action bar / checkbox */}
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
          #{index + 1} (P. {page.originalPageIndex + 1})
        </span>

        {allowSelect && (
          <button
            type="button"
            onClick={onToggleSelect}
            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
              page.selected
                ? 'bg-brand-600 border-brand-600 text-white'
                : 'bg-white border-slate-300 hover:border-brand-400'
            }`}
          >
            {page.selected && <Check size={14} className="stroke-[3]" />}
          </button>
        )}
      </div>

      {/* Page Canvas Render */}
      <div
        className="w-full flex-1 flex items-center justify-center bg-slate-50 rounded-lg p-1.5 overflow-hidden min-h-[140px] relative cursor-pointer"
        onClick={onPreview || onToggleSelect}
      >
        <div
          style={{ transform: `rotate(${page.rotation}deg)` }}
          className="transition-transform duration-300 max-w-full flex justify-center"
        >
          <canvas ref={canvasRef} className="shadow-sm rounded max-h-[160px] object-contain" />
        </div>

        {onPreview && (
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
            <span className="text-white text-xs font-bold bg-slate-800/90 px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Eye size={14} /> Preview
            </span>
          </div>
        )}
      </div>

      {/* Action buttons footer */}
      <div className="w-full flex items-center justify-around gap-1 mt-2 border-t border-slate-100 pt-2 text-slate-600">
        {allowReorder && (
          <>
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveLeft}
              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
              title="Move Left"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={onMoveRight}
              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
              title="Move Right"
            >
              <ArrowRight size={14} />
            </button>
          </>
        )}

        {allowRotate && (
          <button
            type="button"
            onClick={onRotate}
            className="p-1 hover:bg-brand-50 hover:text-brand-600 rounded"
            title="Rotate Clockwise"
          >
            <RotateCw size={14} />
          </button>
        )}

        {allowDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 hover:bg-red-50 hover:text-red-600 rounded"
            title="Remove Page"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default PDFThumbnailGrid;
