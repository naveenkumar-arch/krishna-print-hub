'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import PDFNavbar from '@/components/pdf/PDFNavbar';
import PDFFooter from '@/components/pdf/PDFFooter';
import PDFDropzone from '@/components/pdf/PDFDropzone';
import RecentFilesSection from '@/components/pdf/RecentFilesSection';
import { PDF_TOOLS, ToolMeta } from '@/lib/pdfToolsData';

export default function PDFToolsHubPage() {
  const router = useRouter();
  const [quickFiles, setQuickFiles] = useState<File[]>([]);

  const handleQuickUpload = (files: File[]) => {
    if (files.length > 0) {
      setQuickFiles(files);
      const isImage = files[0].type.startsWith('image/');
      if (isImage) {
        router.push(`/tools/images-to-pdf`);
      } else if (files.length > 1) {
        router.push(`/tools/merge-pdf`);
      } else {
        router.push(`/tools/compress-pdf`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <PDFNavbar />

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-200 py-2.5 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span>/</span>
          <span className="font-bold text-slate-800">PDF Tools</span>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-white to-slate-50 pt-10 pb-8 px-4 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 px-3.5 py-1 rounded-full text-xs font-bold mb-4 shadow-sm">
            <Sparkles size={14} className="text-brand-600" />
            100% Free Client-Side Utilities
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
            Free PDF Tools
          </h1>
          <p className="text-slate-600 text-sm md:text-base mt-3 max-w-xl mx-auto">
            Fast, Secure, and Completely Free PDF Utilities. All files processed directly in your browser without uploading to external servers.
          </p>

          <div className="mt-8 max-w-2xl mx-auto">
            <PDFDropzone
              onFilesSelected={handleQuickUpload}
              title="Drag & Drop PDF files or images here"
              subtitle="Supported: PDF, PNG, JPG (No limits, no watermarks)"
            />
          </div>
        </div>
      </section>

      {/* Tools Cards Grid Section */}
      <section className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Every PDF tool you need in one place
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            Choose a tool below to process, convert, edit, protect, or view your PDF files instantly.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-16">
          {PDF_TOOLS.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="group card-premium bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${tool.badgeColor}`}>
                      {tool.num}
                    </span>
                    <div className={`w-10 h-10 rounded-xl ${tool.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <IconComponent size={20} />
                    </div>
                  </div>

                  <h3 className={`text-sm font-extrabold ${tool.textColor} group-hover:text-brand-700 tracking-tight mb-1`}>
                    {tool.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-snug">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-brand-600 transition-colors">
                  <span>Open Tool</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Files Section */}
        <RecentFilesSection />

        {/* Value Highlights Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 mb-1">100% Free & Unlimited</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                All features are completely free to use without hidden subscriptions, daily upload limits, or mandatory software installations.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 mb-1">User Friendly & Secure</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Your files remain 100% private. All processing takes place locally inside your web browser. No data ever leaves your device.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PDFFooter />
    </div>
  );
}
