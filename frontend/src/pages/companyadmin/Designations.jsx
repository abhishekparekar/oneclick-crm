import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDesignationsApi, createDesignationApi, updateDesignationApi, deleteDesignationApi, getDepartmentsApi } from "../../api/companyAdminApi";
import DataTable from "../../components/common/DataTable";
import { Edit2, Trash2, Plus, Briefcase, X, Save, AlertCircle, Building2 } from "lucide-react";

const Designations = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", departmentId: "" });
  const [error, setError] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ['designations'],
    queryFn: getDesignationsApi
  });

  const { data: deptRes } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartmentsApi
  });

  const createMutation = useMutation({
    mutationFn: createDesignationApi,
    onSuccess: () => {
      queryClient.invalidateQueries(['designations']);
      handleCloseModal();
    },
    onError: (err) => setError(err.response?.data?.message || "Failed to create designation")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateDesignationApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['designations']);
      handleCloseModal();
    },
    onError: (err) => setError(err.response?.data?.message || "Failed to update designation")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDesignationApi,
    onSuccess: () => queryClient.invalidateQueries(['designations'])
  });

  const handleOpenModal = (desig = null) => {
    setError("");
    if (desig) {
      setEditingDesig(desig);
      setFormData({ 
        name: desig.name, 
        description: desig.description || "",
        departmentId: desig.departmentId?._id || desig.departmentId || ""
      });
    } else {
      setEditingDesig(null);
      setFormData({ name: "", description: "", departmentId: "" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingDesig(null);
      setFormData({ name: "", description: "", departmentId: "" });
      setError("");
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingDesig) {
      updateMutation.mutate({ id: editingDesig._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this designation?")) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    { 
      header: "Designation", 
      accessor: "name", 
      render: (row) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-theme-3-light border border-theme-3-light flex items-center justify-center text-theme-3">
            <Briefcase size={14} />
          </div>
          <span className="font-bold text-ca-text">{row.name}</span>
        </div>
      ) 
    },
    { 
      header: "Department", 
      accessor: "department", 
      render: (row) => (
        row.departmentId?.name ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-ca-bg text-ca-text-secondary border border-ca-border">
            <Building2 size={12} className="mr-1.5 text-ca-text-secondary" />
            {row.departmentId.name}
          </span>
        ) : <span className="text-ca-text-secondary text-base">—</span>
      )
    },
    { 
      header: "Description", 
      accessor: "description", 
      render: (row) => <span className="text-ca-text-secondary text-base">{row.description || "—"}</span> 
    },
    { 
      header: "Actions", 
      accessor: "_id", 
      render: (row) => (
        <div className="flex space-x-2">
          <button onClick={() => handleOpenModal(row)} className="p-1.5 text-ca-primary bg-ca-bg hover:bg-blue-100 rounded-lg transition-colors" title="Edit">
            <Edit2 size={13} />
          </button>
          <button onClick={() => handleDelete(row._id)} className="p-1.5 text-ca-primary bg-ca-primary-light hover:bg-red-100 rounded-lg transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ) 
    }
  ];

  const designations = res?.data?.designations || res?.data || [];
  const departments = deptRes?.data?.departments || deptRes?.data || [];

  return (
    <div className="min-h-full pb-10">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 mb-3 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        {/* Decorative background shape */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-theme-3-light rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-8 h-8 bg-gradient-to-br from-theme-3 to-theme-4 rounded-lg flex items-center justify-center text-white shadow-md shadow-theme-3/30">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-ca-text tracking-tight">Designations</h1>
            <p className="text-base text-ca-text-secondary mt-0.5 font-medium">Manage job titles and roles across your company</p>
          </div>
        </div>
        
        <button onClick={() => handleOpenModal()} className="relative z-10 flex items-center space-x-2 px-5 py-2.5 bg-theme-3 text-white rounded-xl text-base font-bold hover:bg-theme-4 transition-colors shadow-sm focus:ring-4 focus:ring-slate-100">
          <Plus size={16} /> <span>Add Designation</span>
        </button>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div className="bg-ca-surface border border-ca-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-theme-3-light border-t-theme-3 rounded-full animate-spin mb-4" />
            <p className="text-base font-semibold text-ca-text-secondary">Loading designations...</p>
          </div>
        ) : designations.length === 0 ? (
          <div className="text-center py-24 px-6">
            <div className="w-20 h-20 bg-theme-3-light rounded-full flex items-center justify-center mx-auto mb-5 text-theme-3">
              <Briefcase size={32} />
            </div>
            <h3 className="text-xl font-bold text-ca-text mb-2">No designations found</h3>
            <p className="text-base text-ca-text-secondary max-w-sm mx-auto mb-3">You haven't added any job titles yet. Create your first designation to assign roles to employees.</p>
            <button onClick={() => handleOpenModal()} className="inline-flex items-center space-x-2 px-5 py-2.5 bg-theme-3 text-white rounded-xl text-base font-bold hover:bg-theme-4 transition-colors shadow-sm">
              <Plus size={16} /> <span>Add Designation</span>
            </button>
          </div>
        ) : (
          <DataTable columns={columns} data={designations} />
        )}
      </div>

      {/* ── SLIDE-OVER DRAWER MODAL ───────────────────────────────────────── */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity animate-fadeIn" onClick={handleCloseModal} />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-ca-surface shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 translate-x-0 animate-slideInRight border-l border-ca-border">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-ca-border bg-slate-50/80 flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-white uppercase tracking-wider">{editingDesig ? "Edit Designation" : "Add New Designation"}</h3>
                <p className="text-[12px] text-slate-300 mt-0.5">Configure role details</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 text-slate-300 hover:text-white hover:bg-ca-hover rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-5 flex items-center space-x-2.5 p-3 bg-ca-primary-light border border-ca-border rounded-xl text-base text-red-700">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <form id="desigForm" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                    Designation Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-ca-border rounded-xl text-base text-ca-text bg-ca-surface placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-3 focus:border-theme-3 transition-all"
                    placeholder="e.g. Senior Developer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full px-4 py-3 border border-ca-border rounded-xl text-base text-ca-text bg-ca-surface focus:outline-none focus:ring-2 focus:ring-theme-3 focus:border-theme-3 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Department (Optional)</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-ca-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ca-text-secondary mb-1.5 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-ca-border rounded-xl text-base text-ca-text bg-ca-surface placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-3 focus:border-theme-3 transition-all min-h-[120px] resize-none"
                    placeholder="Briefly describe the responsibilities of this role"
                  />
                </div>
              </form>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-ca-border bg-ca-bg flex items-center space-x-2">
              <button 
                type="button" 
                onClick={handleCloseModal} 
                className="flex-1 px-4 py-2.5 border border-ca-border text-ca-text-secondary bg-ca-surface rounded-xl text-base font-bold hover:bg-ca-hover transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="desigForm"
                disabled={createMutation.isPending || updateMutation.isPending} 
                className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5.5 bg-theme-3 text-white rounded-xl text-base font-bold hover:bg-theme-4 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Designation</span>
                  </>
                )}
              </button>
            </div>
            
          </div>
        </>
      )}
    </div>
  );
};

export default Designations;
