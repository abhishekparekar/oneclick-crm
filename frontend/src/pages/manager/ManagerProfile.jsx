import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getManagerProfileApi, updateManagerProfileApi } from "../../api/managerApi";
import { uploadTaskMediaApi, getDepartmentsApi, getBranchesApi } from "../../api/companyAdminApi";
import {
  RefreshCw, Edit3, X, Lock, Mail, Phone, Briefcase,
  Building2, Calendar, FileText, Landmark, Award,
  Banknote, UploadCloud, User, Eye, Camera, Sparkles, Download, Shield
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { downloadAttachment } from "../../utils/attachmentUtils";
import AttachmentViewerModal from "../../components/common/AttachmentViewerModal";

const resolveDocUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
    .replace(/\/+api$/, "")
    .replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
};

const ManagerProfile = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState("personalInfo");
  const [form, setForm] = useState({});
  const [skillsList, setSkillsList] = useState([]);
  const [certList, setCertList] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [activeSlotKey, setActiveSlotKey] = useState("");
  const [activeSlotTitle, setActiveSlotTitle] = useState("");
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarInputRef = useRef(null);
  const docFileInputRef = useRef(null);
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["managerProfile"],
    queryFn: () => getManagerProfileApi().then((r) => r.data),
    retry: 1,
    staleTime: 30 * 1000,
  });

  const { data: deptRes } = useQuery({
    queryKey: ["allDepartmentsList"],
    queryFn: () => getDepartmentsApi().then((r) => r.data?.departments || r.data || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: branchRes } = useQuery({
    queryKey: ["allBranchesList"],
    queryFn: () => getBranchesApi().then((r) => r.data?.branches || r.data || []),
    staleTime: 5 * 60 * 1000,
  });

  const emp = data?.employee || {};
  const usr = data?.user || user || {};

  const profileName =
    emp.fullName ||
    (emp.firstName ? `${emp.firstName} ${emp.lastName || ""}`.trim() : "") ||
    usr.name ||
    usr.fullName ||
    user?.name ||
    "Manager Profile";

  const profileEmail = emp.email || usr.email || emp.personalEmail || user?.email || "";
  const profilePhone = emp.phone || usr.phone || user?.phone || "";
  const profileCode = emp.employeeCode || emp.employeeId || emp.empCode || "EMP-0001";
  const profilePhoto =
    emp.photo ||
    emp.documents?.photo ||
    usr.profileImage ||
    user?.profileImage ||
    "";

  // Merge so employee rich database records take precedence, falling back to user
  const profile = {
    ...usr,
    ...emp,
    name: profileName,
    email: profileEmail,
    phone: profilePhone,
    employeeCode: profileCode,
    photo: profilePhoto,
    profileImage: profilePhoto,
  };

  const departmentsMap = useMemo(() => {
    const map = new Map();
    const depts = Array.isArray(deptRes) ? deptRes : deptRes?.departments || [];
    depts.forEach((d) => {
      if (d && d._id) {
        map.set(String(d._id), d.name);
      }
    });
    return map;
  }, [deptRes]);

  const branchesMap = useMemo(() => {
    const map = new Map();
    const branches = Array.isArray(branchRes) ? branchRes : branchRes?.branches || [];
    branches.forEach((b) => {
      if (b && b._id) {
        map.set(String(b._id), b.branchName || b.name);
      }
    });
    return map;
  }, [branchRes]);

  const allDepartments = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addDept = (item) => {
      if (!item) return;
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return;
        if (departmentsMap.has(trimmed)) {
          const name = departmentsMap.get(trimmed);
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ id: trimmed, name });
          }
          return;
        }
        if (/^[a-f\d]{24}$/i.test(trimmed)) return;
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ name: trimmed });
        }
      } else if (typeof item === "object") {
        const id = item._id ? String(item._id) : null;
        let name = (item.name || item.departmentName || "").trim();
        if (!name && id && departmentsMap.has(id)) {
          name = departmentsMap.get(id);
        }
        if (name && !/^[a-f\d]{24}$/i.test(name)) {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ id, name });
          }
        }
      }
    };

    addDept(profile.departmentId);
    addDept(emp.departmentId);
    addDept(usr.departmentId);
    addDept(profile.department);
    addDept(profile.departmentName);

    if (Array.isArray(profile.departmentIds)) profile.departmentIds.forEach(addDept);
    if (Array.isArray(emp.departmentIds)) emp.departmentIds.forEach(addDept);
    if (Array.isArray(usr.departmentIds)) usr.departmentIds.forEach(addDept);

    if (Array.isArray(profile.accessibleDepartments)) profile.accessibleDepartments.forEach(addDept);
    if (Array.isArray(emp.accessibleDepartments)) emp.accessibleDepartments.forEach(addDept);
    if (Array.isArray(usr.accessibleDepartments)) usr.accessibleDepartments.forEach(addDept);

    return list.length > 0 ? list : [{ name: profile.departmentName || "IT" }];
  }, [profile, emp, usr, departmentsMap]);

  const allBranches = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addBranch = (item) => {
      if (!item) return;
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return;
        if (branchesMap.has(trimmed)) {
          const name = branchesMap.get(trimmed);
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ id: trimmed, name });
          }
          return;
        }
        if (/^[a-f\d]{24}$/i.test(trimmed)) return;
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ name: trimmed });
        }
      } else if (typeof item === "object") {
        const id = item._id ? String(item._id) : null;
        let name = (item.branchName || item.name || "").trim();
        if (!name && id && branchesMap.has(id)) {
          name = branchesMap.get(id);
        }
        if (name && !/^[a-f\d]{24}$/i.test(name)) {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ id, name });
          }
        }
      }
    };

    addBranch(profile.branchId);
    addBranch(emp.branchId);
    addBranch(usr.branchId);
    addBranch(profile.branch);
    addBranch(profile.branchName);
    addBranch(profile.location);

    if (Array.isArray(profile.branchIds)) profile.branchIds.forEach(addBranch);
    if (Array.isArray(emp.branchIds)) emp.branchIds.forEach(addBranch);
    if (Array.isArray(usr.branchIds)) usr.branchIds.forEach(addBranch);

    return list.length > 0 ? list : [{ name: profile.branchName || profile.location || "SID COMPANY" }];
  }, [profile, emp, usr, branchesMap]);

  const displayDepartment = allDepartments[0]?.name || "IT";
  const displayBranch = allBranches[0]?.name || "SID COMPANY";

  const displayDesignation =
    profile.designationId?.name ||
    profile.designation?.name ||
    profile.designationName ||
    profile.role ||
    user?.role ||
    "Manager";

  const displayReportingManager =
    profile.reportingManagerId?.fullName ||
    (profile.reportingManagerId?.firstName
      ? `${profile.reportingManagerId.firstName} ${profile.reportingManagerId.lastName || ""}`.trim()
      : "") ||
    profile.reportingManagerName ||
    "Company Admin / Management";

  // Salary calculations from salaryDetails
  const sal = profile.salaryDetails || {};
  const ctcVal = Number(sal.ctc || profile.ctc || 600000);
  const basicVal = Number(sal.basic || sal.basicSalary || profile.basicSalary || Math.round((ctcVal / 12) * 0.5));
  const hraVal = Number(sal.hra || 5000);
  const spAllowanceVal = Number(sal.specialAllowance || 3000);
  const allowancesVal = hraVal + spAllowanceVal || Number(sal.allowances || profile.allowances || 8000);
  const pfVal = Number(sal.pf || 5000);
  const tdsVal = Number(sal.tds || 1500);
  const esiVal = Number(sal.esi || 0);
  const deductionsVal = pfVal + tdsVal + esiVal;
  const netVal = Number(
    sal.netSalary ||
    sal.inHand ||
    (basicVal + allowancesVal - deductionsVal) ||
    profile.netTakeHome ||
    51500
  );

  useEffect(() => {
    if (profile?.name || profile?.email || profile?._id) {
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || profile.mobile || "",
        gender: profile.gender || "male",
        dob: profile.dateOfBirth
          ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
          : profile.dob
          ? new Date(profile.dob).toISOString().split("T")[0]
          : "2003-05-06",
        bloodGroup: profile.bloodGroup || "",
        maritalStatus: profile.maritalStatus || "",
        emergencyContact: profile.emergencyContact?.name
          ? `${profile.emergencyContact.name} - ${profile.emergencyContact.phone || ""}`
          : typeof profile.emergencyContact === "string"
          ? profile.emergencyContact
          : "",
        photo: profile.photo || profile.profileImage || user?.profileImage || "",
        bankName: profile.bankDetails?.bankName || "",
        accountHolderName: profile.bankDetails?.accountHolderName || profile.name || "",
        accountNumber: profile.bankDetails?.accountNumber || "",
        ifscCode: profile.bankDetails?.ifscCode || "",
        pan: profile.panNumber || "",
        aadhaar: profile.aadhaarNumber || "",
      });
      setSkillsList(profile.skills || ["Team Leadership", "Project Management", "Operations"]);
      setCertList(profile.certifications || ["Certified Manager", "Agile Practitioner"]);
    }
  }, [data, user]);

  const updateMut = useMutation({
    mutationFn: (data) => updateManagerProfileApi(data),
    onSuccess: (_, variables) => {
      toast.success("Profile updated successfully!");
      setShowEditModal(false);
      if (variables.photo || variables.profileImage) {
        const newImg = variables.photo || variables.profileImage;
        if (updateUser) updateUser({ profileImage: newImg });
      }
      queryClient.invalidateQueries({ queryKey: ["managerProfile"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update profile"),
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      let photoUrl = "";
      try {
        const res = await uploadTaskMediaApi(file);
        const fileData = res.data || res;
        photoUrl = fileData.fileUrl || fileData.url || "";
      } catch (err) {
        console.warn("Upload API failed, converting avatar to base64 fallback:", err);
      }

      if (!photoUrl) {
        photoUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(file);
        });
      }

      setForm((prev) => ({ ...prev, photo: photoUrl }));
      updateMut.mutate({ photo: photoUrl });
    } catch (err) {
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSlotFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlotKey) return;

    const toastId = toast.loading(`Uploading ${activeSlotTitle || "document"}...`);
    try {
      let fileUrl = "";
      try {
        const res = await uploadTaskMediaApi(file);
        const fileData = res.data || res;
        fileUrl = fileData.fileUrl || fileData.url || "";
      } catch (err) {
        console.warn("Upload API failed, converting doc to base64 fallback:", err);
      }

      if (!fileUrl) {
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(file);
        });
      }

      const existingDocs = profile.documents || {};
      const updatedDocuments = {
        ...existingDocs,
        [activeSlotKey]: fileUrl,
      };

      updateMut.mutate(
        { documents: updatedDocuments },
        {
          onSuccess: () => {
            toast.success(`${activeSlotTitle || "Document"} uploaded successfully!`, { id: toastId });
            setActiveSlotKey("");
            setActiveSlotTitle("");
          },
          onError: () => toast.error("Failed to update documents", { id: toastId }),
        }
      );
    } catch (err) {
      toast.error("Failed to upload file", { id: toastId });
    }
  };

  const handleCustomDocUpload = async (e) => {
    e.preventDefault();
    if (!docTitle.trim()) return toast.error("Please enter a document title");
    if (!docFile) return toast.error("Please select a document file to upload");

    setUploadingDoc(true);
    try {
      let fileUrl = "";
      try {
        const res = await uploadTaskMediaApi(docFile);
        const fileData = res.data || res;
        fileUrl = fileData.fileUrl || fileData.url || "";
      } catch (err) {
        console.warn("Upload API failed, converting document to base64 fallback:", err);
      }

      if (!fileUrl) {
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(docFile);
        });
      }

      const existingDocs = profile.documents || {};
      const customDocs = Array.isArray(existingDocs.customDocuments) ? [...existingDocs.customDocuments] : [];

      const newDoc = {
        title: docTitle.trim(),
        url: fileUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.name || "User",
      };

      customDocs.push(newDoc);

      const updatedDocuments = {
        ...existingDocs,
        customDocuments: customDocs,
      };

      updateMut.mutate(
        { documents: updatedDocuments },
        {
          onSuccess: () => {
            toast.success("Document uploaded to vault!");
            setShowDocUploadModal(false);
            setDocTitle("");
            setDocFile(null);
          },
        }
      );
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = (docIdToDelete) => {
    const existingDocs = profile.documents || {};
    let updatedDocs = { ...existingDocs };

    if (docIdToDelete.startsWith("custom_")) {
      const index = parseInt(docIdToDelete.replace("custom_", ""), 10);
      if (Array.isArray(existingDocs.customDocuments)) {
        const customDocs = existingDocs.customDocuments.filter((_, i) => i !== index);
        updatedDocs.customDocuments = customDocs;
      }
    } else {
      delete updatedDocs[docIdToDelete];
    }

    updateMut.mutate(
      { documents: updatedDocs },
      {
        onSuccess: () => toast.success("Document removed from vault!"),
      }
    );
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (payload.dob) payload.dateOfBirth = payload.dob;

    if (payload.emergencyContact && typeof payload.emergencyContact === "string") {
      const parts = payload.emergencyContact.split("-");
      payload.emergencyContact = { name: parts[0]?.trim() || "", phone: parts[1]?.trim() || "" };
    }

    if (payload.bankName || payload.accountNumber) {
      payload.bankDetails = {
        bankName: payload.bankName,
        accountHolderName: payload.accountHolderName,
        accountNumber: payload.accountNumber,
        ifscCode: payload.ifscCode,
      };
    }

    updateMut.mutate(payload);
  };

  const handleSaveSkills = (e) => {
    e.preventDefault();
    updateMut.mutate({ skills: skillsList, certifications: certList });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
        <p className="text-xs font-bold text-slate-400">Loading Manager Profile...</p>
      </div>
    );
  }

  const rawAvatar = form.photo || emp.photo || emp.documents?.photo || user?.profileImage || profile.profileImage || profile.photo;
  const avatarUrl = rawAvatar ? resolveDocUrl(rawAvatar) : null;
  const initials = (profile.name || user?.fullName || "Abhishek Parekar")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const TABS = [
    { id: "personalInfo", label: "Personal Info", icon: User },
    { id: "jobDetails", label: "Job & Organizational", icon: Briefcase },
    { id: "banking", label: "Banking & Identity", icon: Landmark },
    { id: "salary", label: "Salary & CTC", icon: Banknote },
    { id: "documents", label: "Official Vault Files", icon: FileText },
    { id: "skills", label: "Skills & Qualifications", icon: Award },
  ];

  return (
    <div className="space-y-4 w-full pb-16 font-sans">
      <input
        type="file"
        ref={avatarInputRef}
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/80 rounded-3xl overflow-hidden shadow-lg border border-slate-800 relative">
        <div className="p-5 md:p-6 flex flex-col md:flex-row items-center md:items-center gap-5">
          {/* Avatar Container with Hover Upload Badge */}
          <div className="relative group shrink-0">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-xl bg-slate-800 border-4 border-slate-700/80 overflow-hidden relative cursor-pointer group-hover:border-amber-500 transition-all bg-cover bg-center"
              style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : "none" }}
            >
              {!avatarUrl && initials}

              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                <Camera size={20} className="mb-1 text-amber-400" />
                <span>Upload</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-600 text-slate-950 p-2 rounded-2xl border-2 border-slate-900 shadow-md transition-all cursor-pointer"
              title="Upload Profile Picture"
            >
              {uploadingAvatar ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
          </div>

          <div className="flex-1 text-center md:text-left text-white space-y-1.5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{profile.name}</h1>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 border border-amber-500/40 text-amber-300">
                {user?.role === "HR"
                  ? "HR MANAGER"
                  : user?.role === "CompanyAdmin"
                  ? "COMPANY ADMIN"
                  : user?.role === "Employee"
                  ? "EMPLOYEE"
                  : "MANAGER"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
              <span className="text-xs md:text-sm font-semibold text-slate-300">
                {displayDesignation}
              </span>
              <span className="text-slate-600 dark:text-slate-500">•</span>
              <div className="inline-flex flex-wrap items-center gap-1.5">
                {allDepartments.map((dept, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                    title={`Assigned Department: ${dept.name}`}
                  >
                    <Building2 size={11} className="text-amber-400" />
                    {dept.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 text-xs font-semibold text-slate-400 pt-1">
              <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60 text-slate-200">
                <Briefcase size={12} className="text-amber-400" /> ID: {profile.employeeCode}
              </span>
              <span className="flex items-center gap-1">
                <Building2 size={12} className="text-slate-400" />
                {allBranches.map((b) => b.name).join(", ")}
              </span>
              {profile.joiningDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" /> Joined{" "}
                  {new Date(profile.joiningDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow-md cursor-pointer"
            >
              <Edit3 size={14} /> Edit Profile Info
            </button>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="bg-slate-950/60 border-t border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
              <Mail size={13} className="text-amber-400" /> {profile.email || "—"}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium">
              <Phone size={13} className="text-amber-400" /> {profile.phone || "—"}
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            ENTERPRISE USER PROFILE
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
              activeTab === tab.id
                ? "bg-amber-500 border-amber-500 text-slate-950 shadow-sm"
                : "bg-white dark:bg-[#111C24] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm min-h-[380px]">
        {/* ── TAB 1: Personal Details ─────────────────────────────────────── */}
        {activeTab === "personalInfo" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                  Personal Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={13} /> Edit Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Full Legal Name", val: profile.name || "—" },
                { label: "Employee Code", val: profile.employeeCode || "—" },
                { label: "Work Email", val: profile.email || "—" },
                { label: "Mobile / Phone", val: profile.phone || "—" },
                {
                  label: "Gender",
                  val: profile.gender
                    ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace(/_/g, " ")
                    : "Male",
                },
                {
                  label: "Date of Birth",
                  val: profile.dateOfBirth
                    ? new Date(profile.dateOfBirth).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : profile.dob
                    ? new Date(profile.dob).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "6 May 2003",
                },
                { label: "Blood Group", val: profile.bloodGroup || "Not Specified", color: profile.bloodGroup ? "text-rose-500" : "" },
                {
                  label: "Marital Status",
                  val: profile.maritalStatus
                    ? profile.maritalStatus.charAt(0).toUpperCase() + profile.maritalStatus.slice(1)
                    : "Not Specified",
                },
                {
                  label: "Emergency Contact",
                  val: profile.emergencyContact?.name
                    ? `${profile.emergencyContact.name} (${profile.emergencyContact.phone || "No phone"})`
                    : typeof profile.emergencyContact === "string" && profile.emergencyContact
                    ? profile.emergencyContact
                    : "Not Set",
                },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                  <p className={`text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate ${item.color || ""}`}>
                    {item.val}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: Job Details ─────────────────────────────────────────── */}
        {activeTab === "jobDetails" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                  Job & Employment Details
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold w-max">
                <Lock size={12} /> Admin Managed
              </div>
            </div>

            {/* All Assigned Departments Section */}
            <div className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                      Assigned Departments
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {allDepartments.length > 1
                        ? `Multiple departments assigned (${allDepartments.length} Departments)`
                        : "Primary organizational department"}
                    </p>
                  </div>
                </div>
                {allDepartments.length > 1 && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {allDepartments.length} Departments Active
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                {allDepartments.map((dept, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-700/80 shadow-xs"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      {dept.name}
                    </span>
                    {idx === 0 && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* If multiple branches, show all assigned branches card */}
            {allBranches.length > 1 && (
              <div className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                        Assigned Branches & Locations
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Roving multi-branch access ({allBranches.length} Locations)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {allBranches.length} Branches Active
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {allBranches.map((br, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#111C24] border border-slate-200/90 dark:border-slate-700/80 shadow-xs"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-black text-slate-800 dark:text-white">
                        {br.name}
                      </span>
                      {idx === 0 && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Primary Department", val: displayDepartment },
                { label: "Designation", val: displayDesignation },
                {
                  label: "Employment Type",
                  val: profile.employmentType
                    ? profile.employmentType === "full-time"
                      ? "Full Time"
                      : profile.employmentType
                    : "Full Time",
                },
                {
                  label: "Date of Joining",
                  val: profile.joiningDate
                    ? new Date(profile.joiningDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "13 Jul 2026",
                },
                { label: "Primary Work Location / Branch", val: displayBranch },
                { label: "Reporting Manager", val: displayReportingManager },
                {
                  label: "Account Status",
                  val: (profile.status || profile.accountStatus || "active").toUpperCase(),
                  color: "text-emerald-500",
                },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                  <p className={`text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate ${item.color || ""}`}>
                    {item.val}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: Banking & Identity ───────────────────────────────────── */}
        {activeTab === "banking" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark size={18} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                  Banking & Identity Numbers
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 size={13} /> Update Bank Info
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Bank Name", val: profile.bankDetails?.bankName || form.bankName || "Not Linked" },
                {
                  label: "Account Holder Name",
                  val: profile.bankDetails?.accountHolderName || form.accountHolderName || profile.name || "—",
                },
                {
                  label: "Account Number",
                  val: profile.bankDetails?.accountNumber
                    ? `XXXXXX${profile.bankDetails.accountNumber.slice(-4)}`
                    : "Not Linked",
                },
                { label: "IFSC Code", val: profile.bankDetails?.ifscCode || form.ifscCode || "Not Linked" },
                {
                  label: "PAN Card Number",
                  val: profile.panNumber
                    ? `XXXXXX${profile.panNumber.slice(-4)}`
                    : profile.documents?.panCard
                    ? "Document Uploaded"
                    : "Not Linked",
                },
                {
                  label: "Aadhaar Card Number",
                  val: profile.aadhaarNumber
                    ? `XXXX XXXX ${profile.aadhaarNumber.slice(-4)}`
                    : profile.documents?.aadhaarFront
                    ? "Document Uploaded"
                    : "Not Linked",
                },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                  <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: Salary & CTC ─────────────────────────────────────────── */}
        {activeTab === "salary" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                  Compensation Breakdown
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold w-max">
                <Shield size={12} /> Confidential
              </div>
            </div>

            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Annual CTC</p>
                <p className="text-xl sm:text-2xl font-black text-amber-500">₹{ctcVal.toLocaleString("en-IN")}</p>
              </div>

              <div className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Basic Monthly Salary</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                  ₹{basicVal.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Monthly Allowances</p>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
                  ₹{allowancesVal.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Monthly Net Take-Home</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-500">₹{netVal.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Detailed Salary Item Breakdown */}
            <div className="bg-slate-50/60 dark:bg-[#1E293B]/30 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                Monthly Line-Item Details
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-bold">
                <div className="p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-normal">Basic Pay</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">₹{basicVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-normal">HRA</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">₹{hraVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-normal">Special Allowance</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">₹{spAllowanceVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-normal">Provident Fund (PF)</span>
                  <span className="text-rose-500 font-extrabold">-₹{pfVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-normal">TDS / Tax</span>
                  <span className="text-rose-500 font-extrabold">-₹{tdsVal.toLocaleString("en-IN")}</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#111C24] rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-normal">ESI Deduction</span>
                  <span className="text-slate-500 font-extrabold">₹{esiVal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: Official Documents ───────────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <input
              type="file"
              ref={docFileInputRef}
              onChange={handleSlotFileChange}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={18} className="text-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                    Official Documents & Certificate Vault
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Upload, view, and download official identity proofs, offer letters, and certificates
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveSlotKey("custom");
                  setActiveSlotTitle("Custom Document");
                  setShowDocUploadModal(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow-sm cursor-pointer shrink-0"
              >
                <UploadCloud size={15} /> Upload Other Document
              </button>
            </div>

            {/* Standard Official Document Slots */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { key: "aadhaarFront", title: "Aadhaar Card", subtitle: "Identity Proof Document" },
                { key: "panCard", title: "PAN Card", subtitle: "Tax Identification Card" },
                { key: "offerLetter", title: "Appointment Letter", subtitle: "Official Employment Offer" },
                { key: "educationalCertificates", title: "Educational Certificates", subtitle: "Degree & Transcripts" },
                { key: "experienceCertificate", title: "Experience Certificate", subtitle: "Service / Relieving Letter" },
                { key: "resume", title: "Resume / CV", subtitle: "Professional Bio" },
              ].map((doc) => {
                const docObj = profile.documents || {};
                const docUrl = docObj[doc.key];
                const isUploaded = Boolean(docUrl && typeof docUrl === "string" && docUrl.trim() !== "");

                return (
                  <div
                    key={doc.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isUploaded
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-slate-200/60 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        <FileText size={18} />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">
                            {doc.title}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              isUploaded
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isUploaded ? "Uploaded" : "Pending"}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 truncate">{doc.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isUploaded && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFileForPreview({
                                fileName: doc.title,
                                url: resolveDocUrl(docUrl),
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadAttachment({
                                fileName: `${doc.title}.pdf`,
                                url: resolveDocUrl(docUrl),
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-colors cursor-pointer"
                            title="Download Document"
                          >
                            <Download size={13} /> Download
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSlotKey(doc.key);
                          setActiveSlotTitle(doc.title);
                          docFileInputRef.current?.click();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                          isUploaded
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                            : "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                        }`}
                        title={isUploaded ? "Upload a new version" : "Upload Document"}
                      >
                        <UploadCloud size={13} />
                        <span>{isUploaded ? "Re-upload" : "Upload Document"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Vault Attachments Section */}
            {profile.documents?.customDocuments && profile.documents.customDocuments.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Award size={14} className="text-amber-500" /> Additional Vault Documents (
                  {profile.documents.customDocuments.length})
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {profile.documents.customDocuments.map((cd, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 gap-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <FileText size={18} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">
                            {cd.title || `Document #${idx + 1}`}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 truncate">Custom Vault File</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFileForPreview({
                              fileName: cd.title,
                              url: resolveDocUrl(cd.url),
                            })
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadAttachment({
                              fileName: `${cd.title || "Document"}.pdf`,
                              url: resolveDocUrl(cd.url),
                            })
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          <Download size={13} /> Download
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(`custom_${idx}`)}
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

        {/* ── TAB 6: Skills & Certifications ─────────────────────────────── */}
        {activeTab === "skills" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                  Skills & Certifications
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveSkills} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                  Core Skills
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (skillInput.trim()) {
                          setSkillsList([...skillsList, skillInput.trim()]);
                          setSkillInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Project Management, Team Leadership, Operations"
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold outline-none bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (skillInput.trim()) {
                        setSkillsList([...skillsList, skillInput.trim()]);
                        setSkillInput("");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => setSkillsList(skillsList.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                  {skillsList.length === 0 && <span className="text-xs text-slate-400 italic">No skills added yet.</span>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                  Certifications
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (certInput.trim()) {
                          setCertList([...certList, certInput.trim()]);
                          setCertInput("");
                        }
                      }
                    }}
                    placeholder="e.g. Certified Manager, Agile Practitioner"
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold outline-none bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (certInput.trim()) {
                        setCertList([...certList, certInput.trim()]);
                        setCertInput("");
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {certList.map((cert, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-bold flex items-center gap-2"
                    >
                      <Award size={13} /> {cert}
                      <button
                        type="button"
                        onClick={() => setCertList(certList.filter((_, i) => i !== idx))}
                        className="text-amber-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                  {certList.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No certifications added yet.</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 cursor-pointer"
                >
                  {updateMut.isPending ? "Saving..." : "Save Skills & Certifications"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Edit Profile Modal ───────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#1E293B]/50">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-amber-500" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Edit Profile Information</h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Profile Image Upload Banner in Modal */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-200 dark:border-slate-800">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-xl font-bold bg-cover bg-center shrink-0 cursor-pointer relative group overflow-hidden"
                  style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : "none" }}
                >
                  {!avatarUrl && initials}
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-amber-400">
                    <Camera size={18} />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-0.5">Profile Avatar Photo</h4>
                  <p className="text-[11px] text-slate-400 mb-2">Click upload to update your official profile picture</p>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    Upload New Image
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Mobile / Phone
                  </label>
                  <input
                    type="tel"
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Gender
                  </label>
                  <select
                    value={form.gender || ""}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.dob || ""}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={form.bloodGroup || ""}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    placeholder="e.g. A+, O+, B+"
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Marital Status
                  </label>
                  <select
                    value={form.maritalStatus || ""}
                    onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  >
                    <option value="">Select Marital Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={form.emergencyContact || ""}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    placeholder="Name - Phone"
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Bank Details Section in Modal */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Banking & Statutory Identifiers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={form.bankName || ""}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank, SBI"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={form.accountNumber || ""}
                      onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                      placeholder="Enter account number"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={form.ifscCode || ""}
                      onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-1.5 text-slate-400">
                      PAN Card Number
                    </label>
                    <input
                      type="text"
                      value={form.pan || ""}
                      onChange={(e) => setForm({ ...form, pan: e.target.value })}
                      placeholder="ABCDE1234F"
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-500 uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors cursor-pointer"
                >
                  {updateMut.isPending ? "Saving Changes..." : "Save Profile Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Doc Upload Modal ──────────────────────────────────────── */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111C24] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Upload Custom Document</h3>
              <button
                onClick={() => setShowDocUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCustomDocUpload} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Previous Experience Letter"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Choose File
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 text-slate-950 hover:bg-amber-600 cursor-pointer"
                >
                  {uploadingDoc ? "Uploading..." : "Upload File"}
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
};

export default ManagerProfile;
