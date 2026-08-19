import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitDailyReportApi } from "../../api/companyAdminApi";
import { X, CheckCircle, AlertCircle } from "lucide-react";

export default function DailyReportModal({ isOpen, onClose, tasks = [], onCompleteAll }) {
  const queryClient = useQueryClient();
  const [remarksMap, setRemarksMap] = useState({});

  const mut = useMutation({
    mutationFn: (data) => submitDailyReportApi(data.taskId, { remarks: data.remarks }),
    onSuccess: () => queryClient.invalidateQueries(["tasks"]),
    onError: (err) => alert("Failed to submit report: " + err.message)
  });

  if (!isOpen) return null;

  const handleSubmitAll = async () => {
    // Check if all remarks are filled
    for (const t of tasks) {
      if (!remarksMap[t._id] || remarksMap[t._id].trim() === "") {
        alert(`Please enter a remark for task: ${t.title}`);
        return;
      }
    }

    try {
      for (const t of tasks) {
        await mut.mutateAsync({ taskId: t._id, remarks: remarksMap[t._id] });
      }
      onCompleteAll(); // proceed to logout
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-ca-surface rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-5 border-b border-ca-border bg-ca-primary-light flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-ca-primary" size={24} />
            <div>
              <h2 className="text-xl font-bold text-red-800">End of Day Update Required</h2>
              <p className="text-sm text-ca-primary">You must update the following tasks before you can log out.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-lg transition-colors">
            <X size={20} className="text-ca-primary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-ca-bg">
          {tasks.map(task => (
            <div key={task._id} className="bg-ca-surface p-4 rounded-xl border border-ca-border shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-ca-text text-base">{task.taskId}: {task.title}</h3>
                <span className="text-[12px] uppercase font-bold bg-ca-bg text-ca-text-secondary px-2 py-0.5 rounded-full">{task.status.replace("_", " ")}</span>
              </div>
              <textarea 
                required
                className="input-field h-20 resize-none text-base" 
                placeholder="What did you work on today for this task?"
                value={remarksMap[task._id] || ""}
                onChange={(e) => setRemarksMap(prev => ({...prev, [task._id]: e.target.value}))}
              ></textarea>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-ca-border flex items-center justify-end space-x-3 bg-ca-surface">
          <button onClick={onClose} className="btn-outline">Cancel Logout</button>
          <button onClick={handleSubmitAll} disabled={mut.isPending} className="btn-primary">
            {mut.isPending ? "Submitting..." : "Submit Updates & Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
