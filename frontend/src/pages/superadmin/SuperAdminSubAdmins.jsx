import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import {
  getSubSuperAdminsApi,
  createSubSuperAdminApi,
  updateSubSuperAdminApi,
  updateSubSuperAdminStatusApi,
  deleteSubSuperAdminApi,
} from "../../api/superAdminApi";
import { SUPERADMIN_MODULES } from "../../hooks/useSuperAdminPermissions";
import {
  ShieldCheck, UserPlus, Pencil, Trash2, Power, PowerOff,
  Key, Eye, EyeOff, X, Save, AlertTriangle,
  Users, Mail, Phone, Lock, CheckSquare,
} from "lucide-react";

const ACTIONS = ["view", "create", "edit", "delete"];
const ACTION_LABELS = { view: "View", create: "Create", edit: "Edit", delete: "Delete" };

const buildDefaultPerms = () => {
  const perms = {};
  SUPERADMIN_MODULES.forEach((m) => {
    perms[m.key] = { view: false, create: false, edit: false, delete: false };
  });
  return perms;
};

const normalizePerms = (raw = {}) => {
  const perms = buildDefaultPerms();
  Object.entries(raw).forEach(([mod, actions]) => {
    if (perms[mod] && typeof actions === "object") {
      perms[mod] = {
        view: Boolean(actions.view || actions.read),
        create: Boolean(actions.create || actions.add),
        edit: Boolean(actions.edit || actions.update),
        delete: Boolean(actions.delete),
      };
    }
  });
  return perms;
};

const PermissionMatrix = ({ permissions, onChange }) => {
  const toggleAction = (moduleKey, action) => {
    onChange({ ...permissions, [moduleKey]: { ...permissions[moduleKey], [action]: !permissions[moduleKey]?.[action] } });
  };
  const toggleAllForModule = (moduleKey) => {
    const allOn = ACTIONS.every((a) => permissions[moduleKey]?.[a]);
    onChange({ ...permissions, [moduleKey]: Object.fromEntries(ACTIONS.map((a) => [a, !allOn])) });
  };
  const toggleAllForAction = (action) => {
    const allOn = SUPERADMIN_MODULES.every((m) => permissions[m.key]?.[action]);
    const updated = { ...permissions };
    SUPERADMIN_MODULES.forEach((m) => { updated[m.key] = { ...updated[m.key], [action]: !allOn }; });
    onChange(updated);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-sa-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sa-bg border-b border-sa-border">
            <th className="py-3 px-4 text-left font-bold text-sa-text-secondary text-xs uppercase tracking-wider">Module</th>
            {ACTIONS.map((action) => (
              <th key={action} className="py-3 px-3 text-center font-bold text-sa-text-secondary text-xs uppercase tracking-wider">
                <button type="button" onClick={() => toggleAllForAction(action)} className="flex flex-col items-center gap-0.5 mx-auto hover:text-sa-primary transition-colors cursor-pointer" title={`Toggle all ${action}`}>
                  <span>{ACTION_LABELS[action]}</span>
                  <span className="text-[9px] font-normal opacity-60">(all)</span>
                </button>
              </th>
            ))}
            <th className="py-3 px-3 text-center font-bold text-sa-text-secondary text-xs uppercase tracking-wider">All</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sa-border">
          {SUPERADMIN_MODULES.map((mod) => {
            const modPerms = permissions[mod.key] || {};
            const allOn = ACTIONS.every((a) => modPerms[a]);
            const anyOn = ACTIONS.some((a) => modPerms[a]);
            return (
              <tr key={mod.key} className={`transition-colors ${anyOn ? "bg-sa-primary/5" : "hover:bg-sa-bg/50"}`}>
                <td className="py-3 px-4">
                  <p className="font-bold text-sa-text text-sm">{mod.label}</p>
                  <p className="text-xs text-sa-text-secondary mt-0.5 leading-tight hidden sm:block">{mod.desc}</p>
                </td>
                {ACTIONS.map((action) => (
                  <td key={action} className="py-3 px-3 text-center">
                    <button type="button" onClick={() => toggleAction(mod.key, action)} className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all cursor-pointer ${modPerms[action] ? "bg-sa-primary text-white shadow-sm" : "border-2 border-sa-border hover:border-sa-primary/60"}`}>
                      {modPerms[action] && <CheckSquare size={13} />}
                    </button>
                  </td>
                ))}
                <td className="py-3 px-3 text-center">
                  <button type="button" onClick={() => toggleAllForModule(mod.key)} className={`w-5 h-5 mx-auto rounded flex items-center justify-center transition-all cursor-pointer ${allOn ? "bg-emerald-500 text-white shadow-sm" : anyOn ? "bg-amber-400 text-white shadow-sm" : "border-2 border-sa-border hover:border-emerald-500/60"}`} title={allOn ? "Remove all" : "Grant all"}>
                    {allOn ? <CheckSquare size={13} /> : anyOn ? <div className="w-2 h-0.5 bg-white rounded" /> : null}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const SubAdminModal = ({ existingAdmin, onClose, onSaved }) => {
  const isEdit = Boolean(existingAdmin);
  const [form, setForm] = useState(() => isEdit
    ? { name: existingAdmin.name || "", email: existingAdmin.email || "", phone: existingAdmin.phone || "", password: "", permissions: normalizePerms(existingAdmin.permissions) }
    : { name: "", email: "", phone: "", password: "", permissions: buildDefaultPerms() }
  );
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) return setError("Name and email are required.");
    if (!isEdit && form.password.length < 6) return setError("Password must be at least 6 characters.");
    const cleanPerms = {};
    Object.entries(form.permissions).forEach(([mod, actions]) => {
      if (Object.values(actions).some(Boolean)) cleanPerms[mod] = actions;
    });
    const payload = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), permissions: cleanPerms };
    if (form.password) payload.password = form.password;
    setSaving(true);
    try {
      if (isEdit) await updateSubSuperAdminApi(existingAdmin._id, payload);
      else await createSubSuperAdminApi(payload);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-sa-surface border border-sa-border rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-sa-border bg-sa-bg/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sa-primary/15 text-sa-primary flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-sa-text">{isEdit ? "Edit Sub-SuperAdmin" : "Create Sub-SuperAdmin"}</h2>
              <p className="text-xs text-sa-text-secondary mt-0.5">{isEdit ? `Editing permissions for ${existingAdmin.name}` : "Create a new restricted admin account"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-sa-text-secondary hover:text-sa-danger hover:bg-sa-danger/10 transition-all cursor-pointer"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider mb-4 flex items-center space-x-2"><Users size={13} className="text-sa-primary" /><span>Account Information</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sa-text-secondary mb-1.5">Full Name *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ravi Sharma" className="w-full px-3.5 py-2.5 rounded-xl border border-sa-border bg-sa-bg text-sa-text text-sm font-medium focus:outline-none focus:border-sa-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-sa-text-secondary mb-1.5">Email Address *</label>
                  <div className="relative"><Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" /><input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-sa-border bg-sa-bg text-sa-text text-sm font-medium focus:outline-none focus:border-sa-primary/60 transition-colors" /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sa-text-secondary mb-1.5">Phone</label>
                  <div className="relative"><Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" /><input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-sa-border bg-sa-bg text-sa-text text-sm font-medium focus:outline-none focus:border-sa-primary/60 transition-colors" /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-sa-text-secondary mb-1.5">Password {isEdit && <span className="font-normal">(leave blank to keep)</span>}</label>
                  <div className="relative"><Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sa-text-secondary" /><input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={isEdit ? "New password (optional)" : "Min 6 characters"} required={!isEdit} minLength={isEdit ? 0 : 6} className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-sa-border bg-sa-bg text-sa-text text-sm font-medium focus:outline-none focus:border-sa-primary/60 transition-colors" /><button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sa-text-secondary hover:text-sa-text transition-colors cursor-pointer">{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-extrabold text-sa-text-secondary uppercase tracking-wider flex items-center space-x-2"><Key size={13} className="text-sa-primary" /><span>Module Access Permissions</span></h3>
                <span className="px-2 py-1 rounded-md bg-sa-primary/10 text-sa-primary font-bold text-xs">SuperAdmin = Source of Truth</span>
              </div>
              <PermissionMatrix permissions={form.permissions} onChange={(perms) => setForm((f) => ({ ...f, permissions: perms }))} />
            </div>
            {error && (<div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300"><AlertTriangle size={16} className="flex-shrink-0" /><span className="text-sm font-medium">{error}</span></div>)}
          </div>
          <div className="px-6 py-4 border-t border-sa-border bg-sa-bg/40 flex items-center justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-sa-border text-sa-text font-bold text-sm hover:bg-sa-bg transition-all cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 cursor-pointer disabled:opacity-60"><Save size={15} /><span>{saving ? "Saving..." : isEdit ? "Save Changes" : "Create Sub-Admin"}</span></button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SuperAdminSubAdmins = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalAdmin, setModalAdmin] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isSuperAdmin = user?.role === "SuperAdmin";

  const { data, isLoading } = useQuery({
    queryKey: ["subSuperAdmins"],
    queryFn: () => getSubSuperAdminsApi().then((r) => r.data?.data?.subAdmins || r.data?.subAdmins || []),
    enabled: isSuperAdmin,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }) => updateSubSuperAdminStatusApi(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subSuperAdmins"] }),
  });

  if (!isSuperAdmin) return <Navigate to="/superadmin/dashboard" replace />;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubSuperAdminApi(deleteTarget._id);
      queryClient.invalidateQueries({ queryKey: ["subSuperAdmins"] });
      setDeleteTarget(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete.");
    } finally { setDeleting(false); }
  };

  const subAdmins = data || [];
  const getGrantedCount = (perms = {}) => SUPERADMIN_MODULES.filter((m) => perms[m.key] && Object.values(perms[m.key]).some(Boolean)).length;

  return (
    <div className="w-full space-y-4 pb-12">
      <div className="bg-sa-surface p-5 rounded-2xl border border-sa-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-sa-primary/15 text-sa-primary flex items-center justify-center shadow-sm"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-sa-text">Sub-SuperAdmin Management</h1>
            <p className="text-sm text-sa-text-secondary mt-0.5">Create and manage restricted admin accounts with granular module permissions.</p>
          </div>
        </div>
        <button onClick={() => setModalAdmin({})} className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 cursor-pointer self-start sm:self-center shadow-md"><UserPlus size={16} /><span>Create Sub-Admin</span></button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300"><span className="font-black">SuperAdmin is the Source of Truth.</span> Sub-SuperAdmins share the SuperAdmin dashboard but only see modules you explicitly grant. They cannot create other Sub-SuperAdmins.</p>
      </div>

      {isLoading ? (
        <div className="py-24 text-center bg-sa-surface rounded-2xl border border-sa-border"><div className="animate-spin w-9 h-9 border-4 border-sa-primary border-t-transparent rounded-full mx-auto mb-4" /><p className="text-sa-text-secondary font-bold text-sm">Loading...</p></div>
      ) : subAdmins.length === 0 ? (
        <div className="py-24 text-center bg-sa-surface rounded-2xl border border-dashed border-sa-border">
          <div className="w-16 h-16 rounded-2xl bg-sa-primary/10 text-sa-primary flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32} /></div>
          <p className="text-sa-text font-black text-lg">No Sub-SuperAdmins Yet</p>
          <p className="text-sa-text-secondary text-sm mt-1 mb-5">Create your first restricted admin account to delegate access.</p>
          <button onClick={() => setModalAdmin({})} className="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer">Create Sub-Admin</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {subAdmins.map((admin) => {
            const initials = (admin.name || "SA").slice(0, 2).toUpperCase();
            const grantedCount = getGrantedCount(admin.permissions);
            return (
              <div key={admin._id} className="bg-sa-surface rounded-2xl border border-sa-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-sa-primary/30">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-purple-900 text-white font-black text-base flex items-center justify-center shadow-md flex-shrink-0">{initials}</div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <p className="font-black text-sa-text text-base">{admin.name}</p>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase ${admin.isActive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"}`}>{admin.isActive ? "Active" : "Inactive"}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300">{grantedCount} / {SUPERADMIN_MODULES.length} Modules</span>
                    </div>
                    <p className="text-sm text-sa-text-secondary mt-0.5 flex items-center flex-wrap gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1"><Mail size={12} className="text-sa-primary" />{admin.email}</span>
                      {admin.phone && <span className="flex items-center gap-1"><Phone size={12} />{admin.phone}</span>}
                    </p>
                    <div className="flex items-center flex-wrap gap-1.5 mt-2">
                      {SUPERADMIN_MODULES.map((mod) => {
                        const p = admin.permissions?.[mod.key];
                        if (!p || !Object.values(p).some(Boolean)) return null;
                        const granted = ACTIONS.filter((a) => p[a]).map((a) => ACTION_LABELS[a][0]).join("");
                        return (
                          <span key={mod.key} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sa-primary/10 text-sa-primary border border-sa-primary/20" title={`${ACTIONS.filter((a) => p[a]).join(", ")}`}>
                            {mod.label} <span className="opacity-60 text-[10px]">[{granted}]</span>
                          </span>
                        );
                      })}
                      {grantedCount === 0 && <span className="text-xs text-sa-text-secondary italic">No module access granted</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                  <button onClick={() => toggleStatus.mutate({ id: admin._id, isActive: !admin.isActive })} title={admin.isActive ? "Deactivate" : "Activate"} className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${admin.isActive ? "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"}`}>
                    {admin.isActive ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button onClick={() => setModalAdmin(admin)} title="Edit Permissions" className="w-9 h-9 rounded-xl flex items-center justify-center border border-sa-primary/30 bg-sa-primary/10 text-sa-primary hover:bg-sa-primary/20 transition-all cursor-pointer"><Pencil size={15} /></button>
                  <button onClick={() => setDeleteTarget(admin)} title="Delete" className="w-9 h-9 rounded-xl flex items-center justify-center border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all cursor-pointer"><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAdmin !== null && (
        <SubAdminModal
          existingAdmin={modalAdmin && Object.keys(modalAdmin).length > 0 ? modalAdmin : null}
          onClose={() => setModalAdmin(null)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ["subSuperAdmins"] }); setModalAdmin(null); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-sa-surface border border-sa-border rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} /></div>
            <h3 className="text-lg font-black text-sa-text">Delete Sub-Admin?</h3>
            <p className="text-sm text-sa-text-secondary mt-2 mb-6">Permanently delete <span className="font-bold text-sa-text">{deleteTarget.name}</span>? This cannot be undone.</p>
            <div className="flex items-center space-x-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-sa-border text-sa-text font-bold text-sm hover:bg-sa-bg transition-all cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-60">{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubAdmins;


