import { useState, useEffect } from "react";
import { Layers, Calendar, Paperclip, X, FileText, CheckCircle, Clock } from "lucide-react";
import { uploadTaskMediaApi } from "../../api/employeeApi";

const getSmartStatusOptions = (task) => {
  if (!task) return [];
  const rawStatus = (task.status || "pending").toLowerCase().replace(/-/g, "_");
  const due = task.dueDate || task.endDateTime ? new Date(task.dueDate || task.endDateTime) : null;
  const isOverdue = due && !["complete", "completed", "done", "late_complete", "re_complete", "cancelled"].includes(rawStatus) && due < new Date();

  // 1. Pending / Open state
  if (rawStatus === "pending" || rawStatus === "todo" || rawStatus === "open") {
    if (isOverdue) {
      return [
        { value: "in_process", label: "In Process" },
        { value: "late_complete", label: "Late Completed" },
      ];
    }
    return [
      { value: "in_process", label: "In Process" },
      { value: "complete", label: "Completed" },
    ];
  }

  // 2. In Process state
  if (rawStatus === "in_process" || rawStatus === "in_progress") {
    if (isOverdue) {
      return [
        { value: "in_process", label: "In Process (Update Follow-up)" },
        { value: "late_complete", label: "Late Completed" },
      ];
    }
    return [
      { value: "in_process", label: "In Process (Update Follow-up)" },
      { value: "complete", label: "Completed" },
    ];
  }

  // 3. Overdue state
  if (rawStatus === "overdue" || isOverdue) {
    return [
      { value: "in_process", label: "In Process" },
      { value: "late_complete", label: "Late Completed" },
    ];
  }

  // 4. Re-pending state
  if (rawStatus === "re_pending") {
    return [
      { value: "re_in_process", label: "Re-In Process" },
      { value: "re_complete", label: "Re-Completed" },
    ];
  }

  // 5. Re-in-process state
  if (rawStatus === "re_in_process") {
    return [
      { value: "re_in_process", label: "Re-In Process (Update Follow-up)" },
      { value: "re_complete", label: "Re-Completed" },
      ...(isOverdue ? [{ value: "late_complete", label: "Late Completed" }] : [])
    ];
  }

  // 6. Completed / Late completed state
  if (["complete", "completed", "done", "late_complete", "re_complete"].includes(rawStatus)) {
    return [
      { value: rawStatus, label: rawStatus === "late_complete" ? "Late Completed" : "Completed" },
      { value: "re_pending", label: "Re-Open Task" },
    ];
  }

  return [
    { value: "in_process", label: "In Process" },
    { value: "complete", label: "Completed" },
    { value: "late_complete", label: "Late Completed" },
  ];
};

export default function TaskStatusModal({
  isOpen,
  onClose,
  task,
  onSave,
  isSubmitting = false,
  statusOptions,
}) {
  const availableStatuses = statusOptions && statusOptions.length > 0 ? statusOptions : getSmartStatusOptions(task);

  const [status, setStatus] = useState("in_process");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      const opts = statusOptions && statusOptions.length > 0 ? statusOptions : getSmartStatusOptions(task);
      const rawStatus = (task.status || "pending").toLowerCase().replace(/-/g, "_");
      const due = task.dueDate || task.endDateTime ? new Date(task.dueDate || task.endDateTime) : null;
      const isOverdue = due && !["complete", "completed", "done", "late_complete", "re_complete", "cancelled"].includes(rawStatus) && due < new Date();

      let defaultTarget = opts[0]?.value || "in_process";
      if (rawStatus === "pending" || rawStatus === "todo") {
        defaultTarget = "in_process";
      } else if (rawStatus === "in_process") {
        defaultTarget = isOverdue ? "late_complete" : "complete";
      } else if (rawStatus === "overdue" || isOverdue) {
        defaultTarget = "late_complete";
      } else if (rawStatus === "re_pending") {
        defaultTarget = "re_in_process";
      } else if (rawStatus === "re_in_process") {
        defaultTarget = "re_complete";
      }

      const matchOpt = opts.find((o) => o.value === defaultTarget);
      setStatus(matchOpt ? matchOpt.value : (opts[0]?.value || "in_process"));

      if (task.nextFollowUpDate) {
        try {
          const d = new Date(task.nextFollowUpDate);
          if (!isNaN(d.getTime())) {
            // format YYYY-MM-DDTHH:mm
            const isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setNextFollowUpDate(isoStr);
          } else {
            setNextFollowUpDate("");
          }
        } catch {
          setNextFollowUpDate("");
        }
      } else {
        setNextFollowUpDate("");
      }
      setRemarks("");
      setAttachedFile(null);
    }
  }, [task, isOpen, statusOptions]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    let attachments = [];

    if (attachedFile) {
      try {
        setIsUploading(true);
        const res = await uploadTaskMediaApi(attachedFile);
        const data = res?.data || res;
        if (data && (data.fileUrl || data.url)) {
          attachments.push({
            fileUrl: data.fileUrl || data.url,
            fileName: data.fileName || data.filename || attachedFile.name,
            fileType: data.fileType || attachedFile.type,
          });
        }
      } catch (uploadErr) {
        console.warn("Upload failed:", uploadErr);
      } finally {
        setIsUploading(false);
      }
    }

    onSave({
      status,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
      remarks: remarks.trim(),
      attachments,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 animate-scaleUp text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Layers size={18} className="text-[#1268D9]" /> UPDATE TASK STATUS
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Select Status */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Select Pipeline / Task Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-hidden focus:border-[#1268D9] shadow-2xs cursor-pointer"
            >
              {availableStatuses.map((s) => (
                <option key={s.value || s.id || s._id} value={s.value || s.id || s._id}>
                  {s.label || s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Next Follow-Up Date & Time */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                <Calendar size={13} /> Next Follow-Up Date &amp; Time
              </span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">(when to contact/follow-up next)</span>
            </label>
            <input
              type="datetime-local"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-hidden focus:border-[#1268D9] shadow-2xs cursor-pointer"
            />
          </div>

          {/* Stage Transition Remark */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Stage Transition Remark / Work Summary (Optional)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Why is this status being updated? (e.g. Completed initial design, sent updates to client, waiting on review...)"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0B101B] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-[#1268D9] shadow-2xs resize-none"
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Paperclip size={13} className="text-[#1268D9]" /> Attach Proposal / Quotation / Work Doc (Optional)
            </label>
            {attachedFile ? (
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileText size={16} className="text-[#1268D9] shrink-0" />
                  <div className="truncate">
                    <p className="font-black text-slate-900 dark:text-white truncate">{attachedFile.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-[#0B101B] dark:hover:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold">
                <Paperclip size={15} />
                <span>Upload Proposal / Quotation / Doc</span>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-5 py-2.5 bg-[#1268D9] hover:bg-[#0D50B8] text-white rounded-xl text-xs font-black shadow-md shadow-[#1268D9]/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle size={14} />
              <span>{isSubmitting || isUploading ? "Saving..." : "Save Stage & Follow-Up"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
