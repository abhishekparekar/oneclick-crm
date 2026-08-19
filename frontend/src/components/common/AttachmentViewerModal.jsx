import React from "react";
import { FileText, Download, X, Image as ImageIcon } from "lucide-react";
import { isImageFile, getFileName, downloadAttachment } from "../../utils/attachmentUtils";

export default function AttachmentViewerModal({ file, onClose }) {
  if (!file) return null;

  const fileName = getFileName(file);
  const fileUrl = file.fileUrl || file.url || file.fileData || "";
  const isImg = isImageFile(file);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#1E293B]/60">
          <div className="flex items-center gap-2.5 truncate pr-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              {isImg ? <ImageIcon size={16} /> : <FileText size={16} />}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {fileName}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadAttachment(file)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
            >
              <Download size={13} strokeWidth={2.2} /> Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="p-6 flex-1 flex items-center justify-center overflow-auto bg-slate-950/30 min-h-[300px]">
          {isImg && fileUrl ? (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-lg border border-white/10"
            />
          ) : (
            <div className="p-8 text-center text-slate-400 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-2xs">
                <FileText size={32} />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                {fileName}
              </h4>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Direct browser preview is not available for this document type. Click download to save and open this file.
              </p>
              <button
                type="button"
                onClick={() => downloadAttachment(file)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
              >
                <Download size={14} /> Download Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
