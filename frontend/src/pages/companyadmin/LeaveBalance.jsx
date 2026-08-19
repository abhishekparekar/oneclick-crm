import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLeaveBalanceApi, updateLeaveBalanceApi } from "../../api/companyAdminApi";
import { Hourglass, Search, Edit2, X, Check } from "lucide-react";
import toast from "react-hot-toast";

const LeaveBalance = () => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [editForm, setEditForm] = useState({ casual: 0, sick: 0, annual: 0, unpaid: 0 });

  const { data: res, isLoading } = useQuery({ queryKey: ["leaveBalance"], queryFn: () => getLeaveBalanceApi() });
  const balances = res?.data?.balances || res?.data || [];

  const updateMutation = useMutation({
    mutationFn: (data) => updateLeaveBalanceApi(data.id, data.payload),
    onSuccess: () => {
      toast.success("Leave balance updated successfully");
      queryClient.invalidateQueries(["leaveBalance"]);
      setEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update balance");
    }
  });

  const handleEditClick = (b) => {
    setSelectedEmp(b);
    const getVal = (key) => b.balances?.[key] ?? b[key] ?? 0;
    setEditForm({
      casual: getVal("casual"),
      sick: getVal("sick"),
      annual: getVal("annual"),
      unpaid: getVal("unpaid"),
    });
    setEditModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedEmp) return;
    updateMutation.mutate({
      id: selectedEmp.employeeId?._id || selectedEmp.employeeId,
      payload: editForm
    });
  };

  const filtered = balances.filter((b) => {
    const name = `${b.employeeId?.user?.name || b.employeeId?.firstName || ""}`.toLowerCase();
    const code = (b.employeeId?.employeeCode || "").toLowerCase();
    return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase());
  });

  const leaveTypes = ["casual", "sick", "annual", "unpaid"];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-ca-text">Leave Balances</h1>
          <p className="text-ca-text-secondary mt-1">View and manage remaining leave entitlements</p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-2.5 text-ca-text-secondary" />
          <input type="text" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-ca-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-56" />
        </div>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="text-center py-12 text-ca-text-secondary">Loading leave balances...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ca-text-secondary">
            <Hourglass size={40} className="mx-auto text-slate-200 mb-3" />
            <p>No leave balance data found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ca-border">
                <th className="text-left text-xs font-semibold text-ca-text-secondary pb-3 pr-4">Team Member</th>
                {leaveTypes.map((t) => (
                  <th key={t} className="text-center text-xs font-semibold text-ca-text-secondary pb-3 px-3 capitalize">{t}</th>
                ))}
                <th className="text-center text-xs font-semibold text-ca-text-secondary pb-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((b) => {
                const empName = b.employeeId?.user?.name || `${b.employeeId?.firstName || ""} ${b.employeeId?.lastName || ""}`;
                return (
                  <tr key={b._id} className="hover:bg-ca-hover transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {empName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-ca-text">{empName}</p>
                          <p className="text-xs text-ca-text-secondary">{b.employeeId?.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    {leaveTypes.map((t) => {
                      const val = b.balances?.[t] ?? b[t] ?? "—";
                      const low = typeof val === "number" && val <= 1;
                      return (
                        <td key={t} className="py-3 px-3 text-center">
                          <span className={`text-sm font-bold ${low ? "text-ca-primary" : "text-ca-text-secondary"}`}>{val}</span>
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center">
                      <button onClick={() => handleEditClick(b)} className="p-1.5 text-ca-text-secondary hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ca-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-ca-border flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-ca-text">Update Leave Balance</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-ca-text-secondary hover:text-ca-text">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {leaveTypes.map(t => (
                <div key={t} className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ca-text-secondary capitalize">{t} Leaves</label>
                  <input 
                    type="number" 
                    value={editForm[t]} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, [t]: Number(e.target.value) }))}
                    className="w-24 px-3 py-2 border border-ca-border rounded-lg text-center font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-ca-border flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-ca-text-secondary hover:bg-ca-hover rounded-xl transition-colors">Cancel</button>
              <button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                {updateMutation.isPending ? "Saving..." : <><Check size={16} /> Save Balance</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
