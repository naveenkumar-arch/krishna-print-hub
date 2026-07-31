'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  RefreshCw,
  FileText,
  RotateCw,
  Eye,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import PDFNavbar from '@/components/pdf/PDFNavbar';
import PDFFooter from '@/components/pdf/PDFFooter';
import PDFDropzone from '@/components/pdf/PDFDropzone';
import PDFThumbnailGrid, { ThumbnailPage } from '@/components/pdf/PDFThumbnailGrid';
import PDFViewerModal from '@/components/pdf/PDFViewerModal';
import { saveRecentOperation } from '@/components/pdf/RecentFilesSection';
import {
  mergePDFs,
  splitPDF,
  removePages,
  extractPages,
  reorderPages,
  rotatePDF,
  cropPDF,
  pdfToImages,
  createZipFromFiles,
  imagesToPDF,
  addWatermark,
  addPageNumbers,
  protectPDF,
  unlockPDF,
  compressPDF,
  downloadBlob,
} from '@/lib/pdfUtils';
import toast from 'react-hot-toast';
import { PDF_TOOLS, ToolMeta } from '@/lib/pdfToolsData';

export default function ToolWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const toolId = params?.tool as string;

  const toolMeta: ToolMeta =
    PDF_TOOLS.find((t) => t.id === toolId) || PDF_TOOLS[0];

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnailPages, setThumbnailPages] = useState<ThumbnailPage[]>([]);

  // Processing & Result State
  const [processing, setProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [resultFile, setResultFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [resultFilesList, setResultFilesList] = useState<{ name: string; bytes: Uint8Array | Blob }[]>([]);
  const [resultStats, setResultStats] = useState<{ originalSize: number; compressedSize: number; savedPercentage: number } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // PDF Viewer Modal
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  // Tool Specific Controls
  const [splitMode, setSplitMode] = useState<'every' | 'range' | 'custom'>('range');
  const [splitRangeText, setSplitRangeText] = useState<string>('1-2');

  const [cropMargins, setCropMargins] = useState({ top: 10, right: 10, bottom: 10, left: 10 });
  const [imgFormat, setImgFormat] = useState<'png' | 'jpeg'>('png');
  const [imgPageSize, setImgPageSize] = useState<'a4' | 'fit'>('a4');

  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkImageFile, setWatermarkImageFile] = useState<File | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.3);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [watermarkPosition, setWatermarkPosition] = useState<any>('diagonal');
  const [watermarkColor, setWatermarkColor] = useState<string>('#7c3aed');

  const [pageNumPos, setPageNumPos] = useState<any>('bottom-center');
  const [pageNumFormat, setPageNumFormat] = useState<string>('Page {n} of {total}');

  const [protectPassword, setProtectPassword] = useState<string>('');
  const [unlockPassword, setUnlockPassword] = useState<string>('');

  const [compressLevel, setCompressLevel] = useState<'low' | 'medium' | 'high'>('medium');

  // Clear state when changing tools
  useEffect(() => {
    setSelectedFiles([]);
    setResultFile(null);
    setResultFilesList([]);
    setResultStats(null);
    setThumbnailPages([]);
  }, [toolId]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setResultFile(null);
    setResultFilesList([]);
    setResultStats(null);

    if (toolId === 'view-pdf' && files.length > 0) {
      setIsViewerOpen(true);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setResultFile(null);
    setResultFilesList([]);
    setResultStats(null);
    setThumbnailPages([]);
  };

  // Perform PDF Action
  const handleExecuteTool = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please upload at least one file.');
      return;
    }

    try {
      setProcessing(true);
      setProgressPercent(20);

      const mainFile = selectedFiles[0];
      let processedName = mainFile.name.replace(/\.[^/.]+$/, '');

      if (toolId === 'merge-pdf') {
        const mergedBytes = await mergePDFs(selectedFiles);
        setProgressPercent(90);
        const name = `Merged_${Date.now()}.pdf`;
        setResultFile({ name, bytes: mergedBytes });
        saveRecentOperation(name, 'Merge PDF', mergedBytes.byteLength);
      } else if (toolId === 'split-pdf') {
        const splits = await splitPDF(mainFile, splitMode, {
          rangeStr: splitRangeText,
          selectedPages: thumbnailPages.filter((p) => p.selected).map((p) => p.originalPageIndex + 1),
        });
        setProgressPercent(90);
        if (splits.length === 1) {
          setResultFile({ name: splits[0].name, bytes: splits[0].bytes });
        }
        setResultFilesList(splits);
        saveRecentOperation(`${processedName}_split.pdf`, 'Split PDF', splits[0]?.bytes.byteLength || 1024);
      } else if (toolId === 'remove-pages') {
        const pagesToRemove = thumbnailPages.filter((p) => !p.selected).map((p) => p.originalPageIndex + 1);
        if (pagesToRemove.length === 0) {
          toast.error('No pages selected to remove.');
          setProcessing(false);
          return;
        }
        const bytes = await removePages(mainFile, pagesToRemove);
        const name = `${processedName}_removed.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Remove Pages', bytes.byteLength);
      } else if (toolId === 'extract-pages') {
        const pagesToExtract = thumbnailPages.filter((p) => p.selected).map((p) => p.originalPageIndex + 1);
        if (pagesToExtract.length === 0) {
          toast.error('Please select at least one page to extract.');
          setProcessing(false);
          return;
        }
        const bytes = await extractPages(mainFile, pagesToExtract);
        const name = `${processedName}_extracted.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Extract Pages', bytes.byteLength);
      } else if (toolId === 'reorder-pages') {
        const newOrder = thumbnailPages.map((p) => p.originalPageIndex + 1);
        const bytes = await reorderPages(mainFile, newOrder);
        const name = `${processedName}_reordered.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Reorder Pages', bytes.byteLength);
      } else if (toolId === 'rotate-pdf') {
        const rotations: Record<number, number> = {};
        thumbnailPages.forEach((p) => {
          if (p.rotation !== 0) {
            rotations[p.originalPageIndex] = p.rotation;
          }
        });
        const bytes = await rotatePDF(mainFile, rotations);
        const name = `${processedName}_rotated.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Rotate PDF', bytes.byteLength);
      } else if (toolId === 'crop-pdf') {
        const bytes = await cropPDF(mainFile, cropMargins);
        const name = `${processedName}_cropped.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Crop PDF', bytes.byteLength);
      } else if (toolId === 'pdf-to-images') {
        const images = await pdfToImages(mainFile, imgFormat);
        const list = images.map((img) => ({ name: img.name, bytes: img.blob }));
        setResultFilesList(list);
        if (images.length === 1) {
          const arrBuf = await images[0].blob.arrayBuffer();
          setResultFile({ name: images[0].name, bytes: new Uint8Array(arrBuf) });
        }
        saveRecentOperation(`${processedName}_images.zip`, 'PDF to Images', list.length * 50000);
      } else if (toolId === 'images-to-pdf') {
        const bytes = await imagesToPDF(selectedFiles, { pageSize: imgPageSize });
        const name = `Converted_Images_${Date.now()}.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Images to PDF', bytes.byteLength);
      } else if (toolId === 'add-watermark') {
        const bytes = await addWatermark(mainFile, {
          type: watermarkType,
          text: watermarkText,
          imageFile: watermarkImageFile || undefined,
          opacity: watermarkOpacity,
          rotation: watermarkRotation,
          position: watermarkPosition,
          color: watermarkColor,
        });
        const name = `${processedName}_watermarked.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Add Watermark', bytes.byteLength);
      } else if (toolId === 'add-page-numbers') {
        const bytes = await addPageNumbers(mainFile, {
          position: pageNumPos,
          format: pageNumFormat,
        });
        const name = `${processedName}_numbered.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Add Page Numbers', bytes.byteLength);
      } else if (toolId === 'protect-pdf') {
        if (!protectPassword) {
          toast.error('Please enter a password.');
          setProcessing(false);
          return;
        }
        const bytes = await protectPDF(mainFile, protectPassword);
        const name = `${processedName}_protected.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Password Protect', bytes.byteLength);
      } else if (toolId === 'unlock-pdf') {
        const bytes = await unlockPDF(mainFile, unlockPassword);
        const name = `${processedName}_unlocked.pdf`;
        setResultFile({ name, bytes });
        saveRecentOperation(name, 'Unlock PDF', bytes.byteLength);
      } else if (toolId === 'compress-pdf') {
        const result = await compressPDF(mainFile, compressLevel);
        const name = `${processedName}_compressed.pdf`;
        setResultFile({ name, bytes: result.bytes });
        setResultStats({
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          savedPercentage: result.savedPercentage,
        });
        saveRecentOperation(name, 'Compress PDF', result.compressedSize);
      } else if (toolId === 'view-pdf') {
        setIsViewerOpen(true);
      }

      setProgressPercent(100);
      toast.success('PDF processed successfully!');
    } catch (err: any) {
      console.error('Error processing PDF tool:', err);
      toast.error(err.message || 'Processing failed. Please check file format.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadSingle = () => {
    if (!resultFile) return;
    downloadBlob(resultFile.bytes, resultFile.name);
    toast.success(`Downloading ${resultFile.name}`);
  };

  const handleDownloadZip = async () => {
    if (resultFilesList.length === 0) return;
    toast.loading('Generating ZIP package...', { id: 'zip-task' });
    const items = resultFilesList.map((item) => ({
      name: item.name,
      blob: item.bytes instanceof Blob ? item.bytes : new Blob([item.bytes]),
    }));
    const zipBlob = await createZipFromFiles(items);
    downloadBlob(zipBlob, `${selectedFiles[0]?.name || 'files'}_processed.zip`, 'application/zip');
    toast.success('ZIP package downloaded!', { id: 'zip-task' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success('Tool link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const IconComponent = toolMeta.icon;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PDFNavbar />

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-200 py-2.5 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span>/</span>
          <Link href="/tools" className="hover:text-brand-600">PDF Tools</Link>
          <span>/</span>
          <span className="font-bold text-slate-800">{toolMeta.title}</span>
        </div>
      </div>

      {/* Header Banner */}
      <section className="bg-white border-b border-slate-200 py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className={`w-12 h-12 rounded-2xl ${toolMeta.iconBg} flex items-center justify-center shadow-sm`}>
              <IconComponent size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {toolMeta.title}
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  {toolMeta.num}
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">{toolMeta.description}</p>
            </div>
          </div>

          <Link href="/tools">
            <button className="btn-secondary py-1.5 px-4 text-xs font-bold flex items-center gap-1">
              <ArrowLeft size={14} /> Back to All Tools
            </button>
          </Link>
        </div>
      </section>

      {/* Main Workspace Area */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {/* State 1: Dropzone when no files selected */}
        {selectedFiles.length === 0 && !resultFile && (
          <div className="max-w-3xl mx-auto py-6">
            <PDFDropzone
              onFilesSelected={handleFilesSelected}
              multiple={toolId === 'merge-pdf' || toolId === 'images-to-pdf'}
              title={`Upload for ${toolMeta.title}`}
              subtitle="Drag & drop your files or click to browse"
            />
          </div>
        )}

        {/* State 2: Processing Animation */}
        {processing && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm my-8 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-4 animate-spin">
              <RefreshCw size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Processing your PDF...</h3>
            <p className="text-slate-500 text-xs mb-6">Running fast client-side transformation. Please wait.</p>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
              <div
                className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* State 3: Success Screen with Downloads */}
        {!processing && (resultFile || resultFilesList.length > 0) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 shadow-sm text-center max-w-2xl mx-auto my-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              PDF Processed Successfully!
            </h2>
            <p className="text-slate-500 text-xs mb-6">
              Your ready-to-download file is generated directly in your browser.
            </p>

            {/* Compression Stats */}
            {resultStats && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex justify-around items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Original Size</span>
                  <span className="font-bold text-slate-700">{(resultStats.originalSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <div className="text-emerald-600 font-extrabold text-lg">
                  -{resultStats.savedPercentage}%
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Compressed Size</span>
                  <span className="font-bold text-emerald-700">{(resultStats.compressedSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              {resultFile && (
                <button
                  onClick={handleDownloadSingle}
                  className="w-full sm:w-auto btn-primary py-3 px-8 text-sm font-bold shadow-lg bg-brand-600 hover:bg-brand-700 rounded-xl flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Download Processed PDF
                </button>
              )}

              {resultFilesList.length > 1 && (
                <button
                  onClick={handleDownloadZip}
                  className="w-full sm:w-auto btn-primary py-3 px-8 text-sm font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Download All as ZIP ({resultFilesList.length} files)
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto btn-secondary py-3 px-5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copiedLink ? 'Link Copied' : 'Share Tool'}
              </button>
            </div>

            <button
              onClick={handleReset}
              className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center justify-center gap-1 mx-auto"
            >
              <RefreshCw size={14} /> Process Another File
            </button>
          </div>
        )}

        {/* State 4: Configuration Workbench when files are loaded */}
        {!processing && selectedFiles.length > 0 && !resultFile && resultFilesList.length === 0 && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            {/* Left Panel: Preview or File List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-brand-600" />
                  <span className="font-extrabold text-sm text-slate-900">
                    File Workspace ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-red-600 font-bold flex items-center gap-1"
                >
                  <Trash2 size={14} /> Clear Files
                </button>
              </div>

              {/* Merge PDF files list view */}
              {toolId === 'merge-pdf' && (
                <div className="space-y-3">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 truncate max-w-xs">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...selectedFiles];
                            const temp = next[idx - 1];
                            next[idx - 1] = next[idx];
                            next[idx] = temp;
                            setSelectedFiles(next);
                          }}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          disabled={idx === selectedFiles.length - 1}
                          onClick={() => {
                            const next = [...selectedFiles];
                            const temp = next[idx + 1];
                            next[idx + 1] = next[idx];
                            next[idx] = temp;
                            setSelectedFiles(next);
                          }}
                          className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-red-50 text-red-600 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <label className="btn-secondary text-xs py-2 px-4 font-bold flex items-center justify-center gap-1.5 cursor-pointer w-full">
                      <Plus size={16} /> Add More PDFs
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Thumbnail grid for single PDF tools */}
              {toolId !== 'merge-pdf' && toolId !== 'images-to-pdf' && (
                <PDFThumbnailGrid
                  file={selectedFiles[0]}
                  pages={thumbnailPages}
                  setPages={setThumbnailPages}
                  allowRotate={toolId === 'rotate-pdf'}
                  allowDelete={toolId === 'remove-pages'}
                  allowReorder={toolId === 'reorder-pages'}
                  allowSelect={toolId === 'split-pdf' || toolId === 'extract-pages' || toolId === 'remove-pages'}
                  onPreviewPage={() => setIsViewerOpen(true)}
                />
              )}

              {/* Images to PDF upload grid */}
              {toolId === 'images-to-pdf' && (
                <div className="grid grid-cols-3 gap-3">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="border rounded-xl p-2 bg-slate-50 relative group text-center">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-28 object-contain mx-auto rounded mb-1"
                      />
                      <span className="text-[10px] font-bold text-slate-600 block truncate">{file.name}</span>
                      <button
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel: Tool Controls Sidebar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders size={16} className="text-brand-600" />
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight uppercase">Tool Settings</h3>
              </div>

              {/* Split PDF settings */}
              {toolId === 'split-pdf' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Split Mode</label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="input-field py-1.5"
                    >
                      <option value="range">By Page Range (e.g. 1-2, 3-5)</option>
                      <option value="every">Split Every Page</option>
                      <option value="custom">Extract Selected Thumbnails</option>
                    </select>
                  </div>
                  {splitMode === 'range' && (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Page Ranges</label>
                      <input
                        type="text"
                        value={splitRangeText}
                        onChange={(e) => setSplitRangeText(e.target.value)}
                        placeholder="e.g. 1-2, 3-5"
                        className="input-field py-1.5"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Crop PDF settings */}
              {toolId === 'crop-pdf' && (
                <div className="space-y-3 text-xs">
                  <label className="font-semibold text-slate-700 block">Margin Crops (%)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Top</span>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={cropMargins.top}
                        onChange={(e) => setCropMargins({ ...cropMargins, top: parseInt(e.target.value) || 0 })}
                        className="input-field py-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Bottom</span>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={cropMargins.bottom}
                        onChange={(e) => setCropMargins({ ...cropMargins, bottom: parseInt(e.target.value) || 0 })}
                        className="input-field py-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Left</span>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={cropMargins.left}
                        onChange={(e) => setCropMargins({ ...cropMargins, left: parseInt(e.target.value) || 0 })}
                        className="input-field py-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Right</span>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={cropMargins.right}
                        onChange={(e) => setCropMargins({ ...cropMargins, right: parseInt(e.target.value) || 0 })}
                        className="input-field py-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PDF to Images settings */}
              {toolId === 'pdf-to-images' && (
                <div className="space-y-3 text-xs">
                  <label className="font-semibold text-slate-700 block">Output Format</label>
                  <select
                    value={imgFormat}
                    onChange={(e) => setImgFormat(e.target.value as any)}
                    className="input-field py-1.5"
                  >
                    <option value="png">PNG (High Quality)</option>
                    <option value="jpeg">JPG (Compact)</option>
                  </select>
                </div>
              )}

              {/* Images to PDF settings */}
              {toolId === 'images-to-pdf' && (
                <div className="space-y-3 text-xs">
                  <label className="font-semibold text-slate-700 block">Page Size</label>
                  <select
                    value={imgPageSize}
                    onChange={(e) => setImgPageSize(e.target.value as any)}
                    className="input-field py-1.5"
                  >
                    <option value="a4">Standard A4 Page</option>
                    <option value="fit">Fit Page to Image Size</option>
                  </select>
                </div>
              )}

              {/* Add Watermark settings */}
              {toolId === 'add-watermark' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Watermark Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWatermarkType('text')}
                        className={`py-1.5 rounded-lg border font-bold ${
                          watermarkType === 'text' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-slate-200'
                        }`}
                      >
                        Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermarkType('image')}
                        className={`py-1.5 rounded-lg border font-bold ${
                          watermarkType === 'image' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-slate-200'
                        }`}
                      >
                        Image
                      </button>
                    </div>
                  </div>

                  {watermarkType === 'text' ? (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Text String</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="input-field py-1.5"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Upload Watermark Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setWatermarkImageFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Opacity: {Math.round(watermarkOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Position</label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value as any)}
                      className="input-field py-1.5"
                    >
                      <option value="diagonal">Diagonal Center</option>
                      <option value="center">Exact Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Add Page Numbers settings */}
              {toolId === 'add-page-numbers' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Position</label>
                    <select
                      value={pageNumPos}
                      onChange={(e) => setPageNumPos(e.target.value as any)}
                      className="input-field py-1.5"
                    >
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Text Format</label>
                    <input
                      type="text"
                      value={pageNumFormat}
                      onChange={(e) => setPageNumFormat(e.target.value)}
                      placeholder="Page {n} of {total}"
                      className="input-field py-1.5"
                    />
                  </div>
                </div>
              )}

              {/* Password Protect settings */}
              {toolId === 'protect-pdf' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Set Password</label>
                    <input
                      type="password"
                      value={protectPassword}
                      onChange={(e) => setProtectPassword(e.target.value)}
                      placeholder="Enter strong password"
                      className="input-field py-1.5"
                    />
                  </div>
                </div>
              )}

              {/* Unlock PDF settings */}
              {toolId === 'unlock-pdf' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Enter Password</label>
                    <input
                      type="password"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      placeholder="Current PDF password"
                      className="input-field py-1.5"
                    />
                  </div>
                </div>
              )}

              {/* Compress PDF settings */}
              {toolId === 'compress-pdf' && (
                <div className="space-y-3 text-xs">
                  <label className="font-semibold text-slate-700 block">Compression Level</label>
                  <div className="space-y-2">
                    {[
                      { id: 'low', label: 'Low Compression', desc: 'High quality, larger size' },
                      { id: 'medium', label: 'Recommended', desc: 'Balanced compression & quality' },
                      { id: 'high', label: 'High Compression', desc: 'Maximum size reduction' },
                    ].map((lvl) => (
                      <label
                        key={lvl.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          compressLevel === lvl.id ? 'border-brand-500 bg-brand-50/40 font-bold' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          <span className="block text-slate-800">{lvl.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{lvl.desc}</span>
                        </div>
                        <input
                          type="radio"
                          name="compress"
                          checked={compressLevel === lvl.id}
                          onChange={() => setCompressLevel(lvl.id as any)}
                          className="text-brand-600 focus:ring-brand-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                onClick={handleExecuteTool}
                className="w-full btn-primary py-3 text-sm font-bold rounded-xl shadow-md flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700"
              >
                <IconComponent size={18} /> {toolMeta.title}
              </button>

              <button
                onClick={() => setIsViewerOpen(true)}
                className="w-full btn-secondary py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Eye size={15} /> Preview PDF
              </button>
            </div>
          </div>
        )}
      </main>

      {/* PDF Viewer Modal */}
      {selectedFiles.length > 0 && (
        <PDFViewerModal
          file={selectedFiles[0]}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      )}

      <PDFFooter />
    </div>
  );
}
