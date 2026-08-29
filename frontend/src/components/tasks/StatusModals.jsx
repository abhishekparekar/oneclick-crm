import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inProcessTaskApi, completeTaskApi, lateCompleteTaskApi, reopenTaskApi } from "../../api/companyAdminApi";
import api from "../../api/api";
import { X, AlertCircle } from "lucide-react";
import TaskAttachmentField from "./TaskAttachmentField";

const ModalWrapper = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-ca-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-ca-border flex items-center justify-between bg-ca-bg">
          <h2 className="text-md font-bold text-ca-text">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={18} className="text-ca-text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const InProcessModal = ({ isOpen, onClose, task }) => {
  const queryClient = useQueryClient();
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);

  const mut = useMutation({
    mutationFn: (data) => inProcessTaskApi(task._id, data),
    onSuccess: () => { queryClient.invalidateQueries(["tasks"]); queryClient.invalidateQueries(["task"]); onClose(); },
    onError: (err) => alert("Error: " + err.message)
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ nextFollowUpDate, remarks, attachments });
  };

  return (
    <ModalWrapper title="Mark In-Process" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit} className="p-5 space-y-4">
        <div>
          <label className="label-text">Next Follow-up Date &amp; Time *</label>
          <input required type="datetime-local" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label-text">Remarks / Progress</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="input-field h-20 resize-none" placeholder="What progress has been made?"></textarea>
        </div>
        <TaskAttachmentField attachments={attachments} onChange={setAttachments} />
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="btn-primary">Confirm</button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export const CompleteModal = ({ isOpen, onClose, task, isLate }) => {
  const queryClient = useQueryClient();
  const [finalRemarks, setFinalRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);

  const mut = useMutation({
    mutationFn: (data) => isLate ? lateCompleteTaskApi(task._id, data) : completeTaskApi(task._id, data),
    onSuccess: () => { queryClient.invalidateQueries(["tasks"]); queryClient.invalidateQueries(["task"]); onClose(); },
    onError: (err) => alert("Error: " + err.message)
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ finalRemarks, attachments });
  };

  return (
    <ModalWrapper title={isLate ? "Mark Late Complete" : "Mark Complete"} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit} className="p-5 space-y-4">
        {isLate && (
          <div className="bg-ca-primary-light text-red-700 p-3 rounded-lg text-xs font-semibold flex items-start space-x-2 border border-red-100">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              This task is overdue.
              {task?.delayedDuration
                ? ` Delay: ${task.delayedDuration.days || 0}d ${task.delayedDuration.hours || 0}h ${task.delayedDuration.minutes || 0}m.`
                : " Marking it complete now will record the delay duration permanently."}
            </p>
          </div>
        )}
        <div>
          <label className="label-text">Final Remarks *</label>
          <textarea required value={finalRemarks} onChange={e => setFinalRemarks(e.target.value)} className="input-field h-24 resize-none" placeholder="Add closing remarks..."></textarea>
        </div>
        <TaskAttachmentField attachments={attachments} onChange={setAttachments} />
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mut.isPending} className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isLate ? 'bg-ca-primary hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
            {isLate ? "Late Complete" : "Complete Task"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export const ReopenModal = ({ isOpen, onClose, task }) => {
  const queryClient = useQueryClient();
  const [newEndDate, setNewEndDate] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);

  const mut = useMutation({
    mutationFn: (data) => reopenTaskApi(task._id, data),
    onSuccess: () => { queryClient.invalidateQueries(["tasks"]); queryClient.invalidateQueries(["task"]); onClose(); },
    onError: (err) => alert("Error: " + err.message)
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ newEndDate, nextFollowUpDate, remarks, attachments });
  };

  return (
    <ModalWrapper title="Re-open Task" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit} className="p-5 space-y-4">
        <div className="bg-ca-primary-light text-amber-700 p-3 rounded-lg text-xs font-semibold border border-amber-100">
          Re-opening a task will set its status to Re-Pending and increment its reopen count.
        </div>
        <div>
          <label className="label-text">New End Date *</label>
          <input required type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label-text">Next Follow-up Date &amp; Time</label>
          <input type="datetime-local" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label-text">Reason for Re-opening *</label>
          <textarea required value={remarks} onChange={e => setRemarks(e.target.value)} className="input-field h-20 resize-none" placeholder="Why is this being reopened?"></textarea>
        </div>
        <TaskAttachmentField attachments={attachments} onChange={setAttachments} />
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">Re-open</button>
        </div>
      </form>
    </ModalWrapper>
  );
};


export const ShiftModal = ({ isOpen, onClose, task, employees = [] }) => {
  const queryClient = useQueryClient();
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [shiftReason, setShiftReason] = useState("");

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/tasks/${task._id}/shift`, data).then(res => res.data),
    onSuccess: () => { queryClient.invalidateQueries(["tasks"]); queryClient.invalidateQueries(["task"]); onClose(); },
    onError: (err) => alert("Error: " + (err.response?.data?.message || err.message))
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ newAssigneeId, shiftReason });
  };

  return (
    <ModalWrapper title="Shift Task" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit} className="p-5 space-y-4">
        <div>
          <label className="label-text">Select New Team Member *</label>
          <select required value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)} className="input-field bg-ca-surface">
            <option value="" disabled>Select Team Member</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-text">Reason for Shifting *</label>
          <textarea required value={shiftReason} onChange={e => setShiftReason(e.target.value)} className="input-field h-20 resize-none" placeholder="Why is this task being reassigned?"></textarea>
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={mut.isPending} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Shift Task</button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export const CancelModal = ({ isOpen, onClose, task }) => {
  const queryClient = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/tasks/${task._id}/cancel`, data).then(res => res.data),
    onSuccess: () => { queryClient.invalidateQueries(["tasks"]); queryClient.invalidateQueries(["task"]); onClose(); },
    onError: (err) => alert("Error: " + (err.response?.data?.message || err.message))
  });

  const onSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ cancelReason });
  };

  return (
    <ModalWrapper title="Cancel Task" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit} className="p-5 space-y-4">
        <div className="bg-ca-primary-light text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-100">
          Cancelling a task will permanently halt it. This action cannot be undone.
        </div>
        <div>
          <label className="label-text">Reason for Cancelling *</label>
          <textarea required value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="input-field h-20 resize-none" placeholder="Why is this task being cancelled?"></textarea>
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Go Back</button>
          <button type="submit" disabled={mut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Confirm Cancel</button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export const BulkShiftModal = ({ isOpen, onClose, taskIds = [], employees = [], onSuccess }) => {
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [shiftReason, setShiftReason] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!newAssigneeId || !shiftReason) return;
    try {
      setLoading(true);
      await api.patch("/tasks/bulk-shift", { taskIds, newAssigneeId, shiftReason });
      onSuccess?.();
      onClose();
    } catch (err) {
      alert("Error shifting tasks: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper title={`Bulk Shift Tasks (${taskIds.length})`} isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit} className="p-5 space-y-4">
        <div>
          <label className="label-text">Select New Team Member *</label>
          <select required value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)} className="input-field bg-ca-surface">
            <option value="" disabled>Select Team Member</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-text">Reason for Shifting *</label>
          <textarea required value={shiftReason} onChange={e => setShiftReason(e.target.value)} className="input-field h-20 resize-none" placeholder="Why are these tasks being reassigned?"></textarea>
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            {loading ? "Shifting Tasks..." : "Shift Tasks"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

