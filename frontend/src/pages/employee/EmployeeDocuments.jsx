import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfileApi, uploadMyDocumentApi, updateEmployeeProfileApi } from "../../api/employeeApi";
import { uploadTaskMediaApi } from "../../api/companyAdminApi";
import toast from "react-hot-toast";
import {
  FileText,
  UploadCloud,
  Eye,
  Download,
  Award,
  Briefcase,
  CreditCard,
  Banknote,
  FileCheck,
  CheckCircle2,
  FolderOpen,
  X,
  Plus,
  RefreshCw
} from "lucide-react";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../../components/common/AttachmentViewerModal";

export default function EmployeeDocuments() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const customFileInputRef = useRef(null);

  const [activeUploadKey, setActiveUploadKey] = useState(null);
  const [activeUploadTitle, setActiveUploadTitle] = useState(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);

  // Custom Upload Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customFile, setCustomFile] = useState(null);
  const [uploadingCustom, setUploadingCustom] = useState(false);

  const { data: profileRes, isLoading } = useQuery({
    queryKey: ["employeeMyProfile"],
    queryFn: () => getMyProfileApi().then((res) => res.data),
  });

  const employee = profileRes?.employee || {};
  const documents = employee.documents || {};

  const uploadMutation = useMutation({
    mutationFn: ({ file, title }) => uploadMyDocumentApi(file, title),
    onSuccess: () => {
      toast.success("Document uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["employeeMyProfile"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to upload document");
    },
    onSettled: () => {
      setActiveUploadKey(null);
      setActiveUploadTitle(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const profileUpdateMutation = useMutation({
    mutationFn: (data) => updateEmployeeProfileApi(data),
    onSuccess: () => {
      toast.success("Document vault updated!");
      queryClient.invalidateQueries({ queryKey: ["employeeMyProfile"] });
      setShowCustomModal(false);
      setCustomTitle("");
      setCustomFile(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update vault");
    },
    onSettled: () => setUploadingCustom(false),
  });

  const handleUploadClick = (key, title) => {
    setActiveUploadKey(key);
    setActiveUploadTitle(title);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }
    if (activeUploadTitle) {
      uploadMutation.mutate({ file, title: activeUploadTitle });
    }
  };

  const handleCustomUploadSubmit = async (e) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      toast.error("Please enter a document title");
      return;
    }
    if (!customFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploadingCustom(true);
    try {
      let fileUrl = "";
      try {
        const res = await uploadTaskMediaApi(customFile);
        const fileData = res.data || res;
        fileUrl = fileData.fileUrl || fileData.url || "";
      } catch (err) {
        console.warn("Upload API failed, converting to base64 fallback:", err);
      }

      if (!fileUrl) {
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(customFile);
        });
      }

      const existingDocs = employee.documents || {};
      const customDocs = Array.isArray(existingDocs.customDocuments) ? [...existingDocs.customDocuments] : [];
      
      customDocs.push({
        title: customTitle.trim(),
        url: fileUrl,
        uploadedAt: new Date().toISOString()
      });

      profileUpdateMutation.mutate({
        documents: {
          ...existingDocs,
          customDocuments: customDocs
        }
      });
    } catch (err) {
      toast.error("Failed to upload custom document");
      setUploadingCustom(false);
    }
  };

  const handleDeleteCustomDoc = (index) => {
    const existingDocs = employee.documents || {};
    if (!Array.isArray(existingDocs.customDocuments)) return;

    const customDocs = existingDocs.customDocuments.filter((_, i) => i !== index);
    profileUpdateMutation.mutate({
      documents: {
        ...existingDocs,
        customDocuments: customDocs
      }
    });
  };

  const coreDocs = [
    { title: "Offer Letter", key: "offerLetter", icon: Award, color: "orange" },
    { title: "Joining Letter", key: "joiningLetter", icon: Briefcase, color: "blue" },
    { title: "Aadhaar Card (Front)", key: "aadhaarFront", icon: CreditCard, color: "indigo" },
    { title: "Aadhaar Card (Back)", key: "aadhaarBack", icon: CreditCard, color: "indigo" },
    { title: "PAN Card", key: "panCard", icon: CreditCard, color: "violet" },
  ];

  const additionalDocs = [
    { title: "Previous Salary Slip", key: "salarySlipPrevious", icon: Banknote, color: "amber" },
    { title: "Resume / CV", key: "resume", icon: FileCheck, color: "emerald" },
  ];

  const colorMap = {
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };

  const renderDocumentRow = (doc) => {
    const fileUrl = documents[doc.key];
    const isAvailable = Boolean(fileUrl && typeof fileUrl === 'string' && fileUrl.trim() !== '');
    const Icon = doc.icon;
    const isUploading = uploadMutation.isPending && activeUploadKey === doc.key;
    const iconClass = colorMap[doc.color] || colorMap.amber;

    return (
      <div
        key={doc.key}
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
      >
        {/* Left: Icon + Title + Status */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${iconClass}`}>
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate leading-tight">
                {doc.title}
              </h3>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isAvailable ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'}`}>
                {isAvailable ? 'Uploaded' : 'Pending'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">PDF, JPG, PNG, DOCX · Max 10MB</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {isAvailable && (
            <>
              <button
                type="button"
                onClick={() => setSelectedFileForPreview({ fileName: doc.title, url: fileUrl })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Preview Document"
              >
                <Eye size={13} /> View
              </button>
              <button
                type="button"
                onClick={() => downloadAttachment({ fileName: `${doc.title}.pdf`, url: fileUrl })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Download Attachment"
              >
                <Download size={13} /> Download
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => handleUploadClick(doc.key, doc.title)}
            disabled={isUploading}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-2xs cursor-pointer disabled:opacity-50 ${
              isAvailable
                ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                : "bg-amber-500 hover:bg-amber-600 text-slate-950"
            }`}
          >
            {isUploading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <UploadCloud size={13} />
            )}
            <span>{isUploading ? "Uploading..." : isAvailable ? "Re-upload" : "Upload Document"}</span>
          </button>
        </div>
      </div>
    );
  };

  const allDocs = [...coreDocs, ...additionalDocs];
  const uploadedCount = allDocs.filter((d) => Boolean(documents[d.key] && typeof documents[d.key] === 'string' && documents[d.key].trim() !== '')).length;

  return (
    <div className="w-full font-sans pb-16 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            My Documents
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            View, upload, and manage your official identity proofs, offer letters, and certificates
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <UploadCloud size={15} /> Upload Other Document
        </button>
      </div>

      {/* Progress Summary Card */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
            <FolderOpen size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
              {uploadedCount} of {allDocs.length} core documents uploaded
            </h3>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              {allDocs.length - uploadedCount > 0
                ? `${allDocs.length - uploadedCount} core document(s) pending — click Upload Document below`
                : "All core documents are uploaded and complete ✓"}
            </p>
          </div>
        </div>
        <div className="flex-1 sm:max-w-[200px]">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion</span>
            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
              {Math.round((uploadedCount / allDocs.length) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((uploadedCount / allDocs.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hidden File Input for Standard Slots */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
      />

      {isLoading ? (
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3.5 flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-2 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Core Documents */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40 flex items-center gap-2">
              <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={13} className="text-amber-500" /> Core Documents
              </h2>
              <span className="text-[10px] font-bold text-slate-400 ml-1">
                ({coreDocs.filter((d) => Boolean(documents[d.key] && typeof documents[d.key] === 'string' && documents[d.key].trim() !== '')).length}/{coreDocs.length} uploaded)
              </span>
            </div>
            <div>{coreDocs.map(renderDocumentRow)}</div>
          </div>

          {/* Additional Documents */}
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40 flex items-center gap-2">
              <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Banknote size={13} className="text-amber-500" /> Additional Documents
              </h2>
              <span className="text-[10px] font-bold text-slate-400 ml-1">
                ({additionalDocs.filter((d) => Boolean(documents[d.key] && typeof documents[d.key] === 'string' && documents[d.key].trim() !== '')).length}/{additionalDocs.length} uploaded)
              </span>
            </div>
            <div>{additionalDocs.map(renderDocumentRow)}</div>
          </div>

          {/* Custom Uploaded Documents */}
          {documents.customDocuments && Array.isArray(documents.customDocuments) && documents.customDocuments.length > 0 && (
            <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40 flex items-center gap-2">
                <h2 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Award size={13} className="text-amber-500" /> Custom Uploaded Attachments ({documents.customDocuments.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {documents.customDocuments.map((cd, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <FileText size={18} />
                      </div>
                      <div className="truncate">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {cd.title || `Document #${idx + 1}`}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Custom Vault File</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedFileForPreview({ fileName: cd.title, url: cd.url })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadAttachment({ fileName: `${cd.title || 'Document'}.pdf`, url: cd.url })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Download size={13} /> Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomDoc(idx)}
                        className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Remove Document"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Document Upload Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud size={20} className="text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Upload Custom Document</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomTitle("");
                  setCustomFile(null);
                }}
                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCustomUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Degree Certificate, Passport, Driving License"
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Select File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  ref={customFileInputRef}
                  onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                />

                <div
                  onClick={() => customFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <UploadCloud size={32} className="text-amber-500 mb-2" />
                  {customFile ? (
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[260px]">{customFile.name}</p>
                      <p className="text-[10px] font-bold text-emerald-500 mt-0.5">{(customFile.size / 1024).toFixed(1)} KB • Ready to upload</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Click to browse or drop file here</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">Supports PDF, JPG, PNG, WEBP, DOCX (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomModal(false);
                    setCustomTitle("");
                    setCustomFile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploadingCustom || profileUpdateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {uploadingCustom || profileUpdateMutation.isPending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} /> Upload Document
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Viewer Lightbox Modal */}
      {selectedFileForPreview && (
        <AttachmentViewerModal
          file={selectedFileForPreview}
          onClose={() => setSelectedFileForPreview(null)}
        />
      )}
    </div>
  );
}

