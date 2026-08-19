import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfileApi, updateEmployeeProfileApi } from "../../api/employeeApi";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Mail,
  Phone,
  Calendar,
  MapPin,
  Camera,
  Briefcase,
  Building,
  Heart,
  FileText,
  ChevronRight,
  LogOut,
  X,
  Save,
  User,
  Edit2,
  Shield
} from "lucide-react";
import { format } from "date-fns";

const EmployeeProfile = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  const { data: profileRes, isLoading } = useQuery({
    queryKey: ["employeeMyProfile"],
    queryFn: () => getMyProfileApi().then((res) => res.data),
  });

  const profile = profileRes?.employee || profileRes?.data || profileRes?.user || user || {};

  const updateMutation = useMutation({
    mutationFn: (data) => updateEmployeeProfileApi(data),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["employeeMyProfile"] });
      setIsEditMode(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update profile.");
    },
  });

  const handleEditToggle = () => {
    setFormData({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone: profile.phone || "",
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split("T")[0] : "",
      gender: profile.gender || "",
      addressLine1: profile.currentAddress?.addressLine1 || "",
      city: profile.currentAddress?.city || "",
      state: profile.currentAddress?.state || "",
      pincode: profile.currentAddress?.pincode || "",
      bankName: profile.bankDetails?.bankName || "",
      accountHolderName: profile.bankDetails?.accountHolderName || "",
      accountNumber: profile.bankDetails?.accountNumber || "",
      ifscCode: profile.bankDetails?.ifscCode || "",
      emergencyName: profile.emergencyContact?.name || "",
      emergencyRelationship: profile.emergencyContact?.relationship || "",
      emergencyPhone: profile.emergencyContact?.phone || "",
    });
    setIsEditMode(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePersonalSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      currentAddress: {
        ...profile.currentAddress,
        addressLine1: formData.addressLine1,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      },
      bankDetails: {
        bankName: formData.bankName,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
      },
      emergencyContact: {
        name: formData.emergencyName,
        relationship: formData.emergencyRelationship,
        phone: formData.emergencyPhone,
      },
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4 pb-12 pt-1">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 h-36 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 h-64 animate-pulse" />
          <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  const fullName = profile.fullName || `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  const dobStr = profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "d MMM yyyy") : "N/A";
  const addressStr = profile.currentAddress
    ? [profile.currentAddress.addressLine1, profile.currentAddress.city, profile.currentAddress.state]
        .filter(Boolean)
        .join(", ")
    : "N/A";

  const renderField = (label, value) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800/80 last:border-0 gap-4">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-xs font-bold text-slate-900 dark:text-white text-right break-all">{value || "N/A"}</span>
    </div>
  );

  const renderInput = (label, name, type = "text") => (
    <div>
      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={formData[name] || ""}
        onChange={handleInputChange}
        className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
      />
    </div>
  );

  const AccordionPanel = ({ id, icon: Icon, title, children }) => {
    const isOpen = activePanel === id;
    return (
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setActivePanel(isOpen ? null : id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-[#0C1520]/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Icon size={14} strokeWidth={2.2} />
            </div>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</span>
          </div>
          <ChevronRight
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          />
        </button>
        <div className={`transition-all duration-300 ${isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
          <div className="px-4 pb-3 pt-2">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full font-sans pb-12 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            My Profile
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            View and update your personal, job, and bank information
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isEditMode ? (
            <>
              <button
                onClick={() => setIsEditMode(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-white dark:bg-[#111C24] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePersonalSubmit}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-2xs transition-all disabled:opacity-60"
              >
                <Save size={13} strokeWidth={2.5} />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditToggle}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-2xs transition-all"
            >
              <Edit2 size={13} strokeWidth={2.5} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Profile Identity Card */}
      <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Amber top strip */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-600" />
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              {profile.photo ? (
                <img src={profile.photo} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <User size={28} className="text-amber-500" />
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1.5 rounded-lg shadow-2xs hover:scale-105 transition-transform">
              <Camera size={11} strokeWidth={2.5} />
            </button>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">{fullName || "Employee Name"}</h2>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {profile.designationName || profile.designation?.name || "N/A"}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold uppercase tracking-wider border border-slate-200/80 dark:border-slate-700">
                {profile.employeeCode || "EMP-CODE"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/60">
                Active
              </span>
            </div>
          </div>

          {/* Contact Quick View */}
          <div className="flex flex-col gap-1.5 shrink-0 sm:items-end">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Mail size={12} className="text-amber-500" />
              <span className="font-medium truncate max-w-[180px]">{profile.email || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Phone size={12} className="text-amber-500" />
              <span className="font-medium">{profile.phone || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Building size={12} className="text-amber-500" />
              <span className="font-medium">{profile.departmentName || profile.department?.name || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: Personal Information */}
        <div className="bg-white dark:bg-[#111C24] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0C1520]/40 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <User size={13} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Personal Information</h3>
          </div>

          {isEditMode ? (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {renderInput("First Name", "firstName")}
                {renderInput("Last Name", "lastName")}
              </div>
              {renderInput("Phone Number", "phone", "tel")}
              {renderInput("Date of Birth", "dateOfBirth", "date")}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0C1520] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_say">Prefer Not To Say</option>
                </select>
              </div>
              <div className="pt-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-800">Address</div>
              {renderInput("Address Line 1", "addressLine1")}
              <div className="grid grid-cols-2 gap-3">
                {renderInput("City", "city")}
                {renderInput("State", "state")}
              </div>
              {renderInput("Pincode", "pincode")}
            </div>
          ) : (
            <div className="px-4 py-2">
              {renderField("Full Name", fullName)}
              {renderField("Email", profile.email)}
              {renderField("Phone", profile.phone)}
              {renderField("Date of Birth", dobStr)}
              {renderField("Gender", profile.gender?.replace("_", " "))}
              {renderField("Address", addressStr)}
            </div>
          )}
        </div>

        {/* Right: Accordion Panels */}
        <div className="space-y-3">

          {/* Job Information */}
          <AccordionPanel id="job" icon={Briefcase} title="Job Information">
            {renderField("Employment Type", profile.employmentType?.replace("-", " "))}
            {renderField("Work Mode", profile.workMode)}
            {renderField("Joining Date", profile.joiningDate ? format(new Date(profile.joiningDate), "MMMM d, yyyy") : null)}
            {renderField("Reporting Manager", profile.reportingManagerName)}
          </AccordionPanel>

          {/* Bank Details */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setActivePanel(activePanel === "bank" ? null : "bank")}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-[#0C1520]/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Building size={14} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">Bank Details</span>
              </div>
              <ChevronRight size={15} className={`text-slate-400 transition-transform duration-200 ${activePanel === "bank" ? "rotate-90" : ""}`} />
            </button>
            <div className={`transition-all duration-300 ${activePanel === "bank" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
              <div className="px-4 pb-3 pt-2">
                {isEditMode ? (
                  <div className="space-y-3">
                    {renderInput("Bank Name", "bankName")}
                    {renderInput("Account Holder Name", "accountHolderName")}
                    {renderInput("Account Number", "accountNumber")}
                    {renderInput("IFSC Code", "ifscCode")}
                  </div>
                ) : (
                  <>
                    {renderField("Bank Name", profile.bankDetails?.bankName)}
                    {renderField("Account Name", profile.bankDetails?.accountHolderName)}
                    {renderField("Account No", profile.bankDetails?.accountNumber)}
                    {renderField("IFSC Code", profile.bankDetails?.ifscCode)}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setActivePanel(activePanel === "emergency" ? null : "emergency")}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-[#0C1520]/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Heart size={14} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">Emergency Contact</span>
              </div>
              <ChevronRight size={15} className={`text-slate-400 transition-transform duration-200 ${activePanel === "emergency" ? "rotate-90" : ""}`} />
            </button>
            <div className={`transition-all duration-300 ${activePanel === "emergency" ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
              <div className="px-4 pb-3 pt-2">
                {isEditMode ? (
                  <div className="space-y-3">
                    {renderInput("Contact Name", "emergencyName")}
                    {renderInput("Relationship", "emergencyRelationship")}
                    {renderInput("Phone", "emergencyPhone", "tel")}
                  </div>
                ) : (
                  <>
                    {renderField("Contact Name", profile.emergencyContact?.name)}
                    {renderField("Relationship", profile.emergencyContact?.relationship)}
                    {renderField("Phone", profile.emergencyContact?.phone)}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Documents quick link */}
          <AccordionPanel id="documents" icon={FileText} title="My Documents">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {profile.documents?.resume ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0C1520] rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-amber-500" />
                    <span className="font-bold text-slate-900 dark:text-white text-xs">Resume.pdf</span>
                  </div>
                  <a href={profile.documents.resume} target="_blank" rel="noopener noreferrer" className="text-[10px] font-extrabold text-amber-600 hover:text-amber-700">View</a>
                </div>
              ) : (
                <p className="text-center py-3 text-slate-400">No documents uploaded yet.</p>
              )}
            </div>
          </AccordionPanel>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-extrabold text-xs transition-all border border-rose-200 dark:border-rose-900/60 shadow-2xs"
          >
            <LogOut size={14} strokeWidth={2.5} />
            Sign Out of Account
          </button>

        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
