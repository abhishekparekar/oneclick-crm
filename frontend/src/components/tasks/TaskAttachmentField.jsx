import { useState } from "react";
import { Upload, X, FileText, Image as ImageIcon, Mic } from "lucide-react";
import { uploadTaskMediaApi } from "../../api/companyAdminApi";

export default function TaskAttachmentField({ attachments = [], onChange, label = "Attachments", compact = false }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        let fileObj = null;
        try {
          const res = await uploadTaskMediaApi(file);
          const data = res.data || res;
          if (data.success || data.fileUrl) {
            fileObj = {
              fileName: data.fileName || file.name || "Attachment",
              fileUrl: data.fileUrl,
              fileType: data.fileType || file.type || "",
            };
          }
        } catch (apiErr) {
          console.warn("Server file upload failed, falling back to client base64 storage:", apiErr);
        }

        if (!fileObj) {
          const base64Data = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
          fileObj = {
            fileName: file.name || "Attachment",
            fileUrl: base64Data,
            fileType: file.type || "",
          };
        }

        uploaded.push(fileObj);
      }
      onChange([...attachments, ...uploaded]);
    } catch (err) {
      console.error("Error processing attachments:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    onChange(attachments.filter((_, i) => i !== index));
  };

  const iconFor = (type = "") => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.startsWith("audio/")) return Mic;
    return FileText;
  };

  return (
    <div className="w-full">
      {!compact && <label className="label-text">{label}</label>}
      
      {compact ? (
        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-ca-border rounded-xl cursor-pointer hover:bg-ca-hover transition-colors bg-ca-surface shadow-sm">
          <Upload size={13} className="text-ca-text-secondary shrink-0" />
          <span className="text-xs text-ca-text-secondary font-bold">{uploading ? "Uploading..." : "Attach File"}</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,video/*,audio/*"
            className="hidden"
            disabled={uploading}
            onChange={handleFiles}
          />
        </label>
      ) : (
        <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-ca-border rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
          <Upload size={16} className="text-ca-text-secondary" />
          <span className="text-sm text-ca-text-secondary">{uploading ? "Uploading..." : "Upload images, documents, or voice notes"}</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,video/*,audio/*"
            className="hidden"
            disabled={uploading}
            onChange={handleFiles}
          />
        </label>
      )}

      {attachments.length > 0 && (
        <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
          {attachments.map((file, index) => {
            const Icon = iconFor(file.fileType);
            const displayName = file.fileName || file.name || "Attachment";
            return (
              <div key={`${file.fileUrl}-${index}`} className="flex items-center justify-between bg-ca-bg border border-ca-border rounded-lg px-2.5 py-1 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={12} className="text-ca-text-secondary shrink-0" />
                  <span className="text-[11px] font-semibold text-ca-text-secondary truncate">{decodeURIComponent(displayName)}</span>
                </div>
                <button type="button" onClick={() => removeAttachment(index)} className="p-0.5 hover:bg-slate-200 rounded transition-colors ml-2">
                  <X size={12} className="text-ca-text-secondary" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
