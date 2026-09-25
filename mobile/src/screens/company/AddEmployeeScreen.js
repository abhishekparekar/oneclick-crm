import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  Switch,
  ScrollView,
  Image,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import PhotoPickerField from "../../components/PhotoPickerField";
import AppDatePicker from "../../components/AppDatePicker";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";
import {
  getDepartmentsApi,
  getDesignationsApi,
  getBranchesApi,
  createDepartmentApi,
  createDesignationApi,
  createBranchApi,
  getModuleUsageApi,
} from "../../api/companyService";
import { createEmployeeApi, getEmployeesApi } from "../../api/employeeService";
import { useAuth } from "../../context/AuthContext";
import { parseDDMMYYYYToISO } from "../../utils/dateFormatter";

const { width } = Dimensions.get("window");

// ── Palette & Design Tokens ───────────────────────────────────
const THEME = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  cardSubtle: "#F1F5F9",
  border: "#E2E8F0",
  borderActive: "#F59E0B",
  primary: "#F59E0B",
  primaryDark: "#D97706",
  primaryLight: "#FEF3C7",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  success: "#10B981",
  successBg: "#D1FAE5",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
};

// ── Modules Catalog matching Web ALL_MODULES ───────────────────
const ALL_MODULES = [
  { key: "tasks", label: "Tasks Management", desc: "Create, execute and review tasks", icon: "checkbox-outline" },
  { key: "leads", label: "Lead Engine & CRM", desc: "Manage leads & WhatsApp campaigns", icon: "magnet-outline" },
  { key: "attendance", label: "Attendance & Bio-Punch", desc: "Punches, shifts & regularization", icon: "finger-print-outline" },
  { key: "projects", label: "Project Workspace", desc: "Milestones, sprints & task boards", icon: "folder-open-outline" },
];

// ── 7 Steps Definition matching Web ────────────────────────────
const STEPS = [
  { id: 1, label: "Basic Info", desc: "Personal info & photo", icon: "person-outline" },
  { id: 2, label: "Job Details", desc: "Role, dept & modules", icon: "briefcase-outline" },
  { id: 3, label: "Address", desc: "Location & emergency", icon: "location-outline" },
  { id: 4, label: "Salary", desc: "CTC & allowances", icon: "cash-outline" },
  { id: 5, label: "Bank & ID", desc: "Banking, PAN & Aadhaar", icon: "card-outline" },
  { id: 6, label: "Documents", desc: "Attach verified proofs", icon: "document-text-outline" },
  { id: 7, label: "Review", desc: "Verify & register", icon: "checkmark-done-circle-outline" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
];

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const WORK_MODES = [
  { value: "office", label: "On-Site / Office" },
  { value: "remote", label: "Remote / Work From Home" },
  { value: "hybrid", label: "Hybrid" },
];

const EMERGENCY_RELATIONSHIPS = [
  { value: "Parent", label: "Parent / Father / Mother" },
  { value: "Spouse", label: "Spouse" },
  { value: "Sibling", label: "Brother / Sister" },
  { value: "Friend", label: "Friend / Relative" },
];

const BANK_ACCOUNT_TYPES = [
  { value: "savings", label: "Savings Account" },
  { value: "current", label: "Salary / Current Account" },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const AddEmployeeScreen = ({ navigation }) => {
  const { user } = useAuth();

  // Company plan subscribed modules
  const authCompanyModules = useMemo(() => {
    const raw =
      user?.company?.subscribedModules ??
      user?.subscribedModules ??
      (typeof user?.companyId === "object" && user?.companyId !== null ? user?.companyId?.subscribedModules : null);
    return Array.isArray(raw) && raw.length > 0
      ? raw.map((m) => String(m).toLowerCase().trim())
      : null;
  }, [user]);

  const [activeStep, setActiveStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Reference data
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [managers, setManagers] = useState([]);
  const [moduleUsage, setModuleUsage] = useState({});
  const [planSubscribedModules, setPlanSubscribedModules] = useState([]);
  const [refsLoading, setRefsLoading] = useState(true);

  // Quick Create Modal states
  const [quickModal, setQuickModal] = useState(null); // 'dept' | 'desig' | 'branch'
  const [quickForm, setQuickForm] = useState({ name: "", code: "", departmentId: "", city: "" });
  const [quickSaving, setQuickSaving] = useState(false);

  // Dropdown Picker Modal states
  const [activePickerModal, setActivePickerModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Initial Form Data matching Web
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    photo: "",
    gender: "male",
    dateOfBirth: "",
    maritalStatus: "single",

    accessibleDepartments: [],
    departmentId: "",
    designationId: "",
    branchId: "",
    reportingManagerId: "",
    role: "Employee",
    managerAccessLevel: "department",
    employmentType: "full_time",
    workMode: "office",
    allowRemotePunch: false,
    isLocationTrackingEnabled: false,
    joiningDate: new Date().toISOString().slice(0, 10),
    confirmationDate: "",
    noticePeriod: "30_days",

    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
    permanentAddress: {
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      sameAsCurrent: false,
    },
    emergencyContact: {
      name: "",
      relationship: "Parent",
      phone: "",
    },

    salaryDetails: {
      ctc: 0,
      monthlyCtc: 0,
      basic: 0,
      basicSalary: 0,
      hra: 0,
      annualHra: 0,
      conveyance: 0,
      medicalAllowance: 0,
      specialAllowance: 0,
      annualSpecialAllowance: 0,
      otherAllowance: 0,
      grossSalary: 0,
      annualGross: 0,
      pf: 0,
      pfEmployee: 0,
      pfEmployer: 0,
      annualPfEmployee: 0,
      annualPfEmployer: 0,
      esi: 0,
      esiEmployee: 0,
      esiEmployer: 0,
      professionalTax: 0,
      annualProfessionalTax: 0,
      tds: 0,
      totalDeductions: 0,
      netSalary: 0,
      inHandSalary: 0,
      annualNetSalary: 0,
    },

    bankDetails: {
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      accountType: "savings",
    },
    aadhaarNumber: "",
    panNumber: "",
    documents: [],
    assignedModules: authCompanyModules || [
      "tasks", "leads", "attendance", "leave", "payroll", "projects", "reports"
    ],
  });

  // Effective subscribed modules
  const subscribedModules = useMemo(() => {
    if (Array.isArray(planSubscribedModules) && planSubscribedModules.length > 0) {
      return planSubscribedModules.map((m) => String(m).toLowerCase().trim());
    }
    if (Array.isArray(authCompanyModules) && authCompanyModules.length > 0) {
      return authCompanyModules;
    }
    return ["tasks", "leads", "attendance", "leave", "payroll", "projects", "reports"];
  }, [planSubscribedModules, authCompanyModules]);

  // Load all reference data on mount
  useEffect(() => {
    loadAllReferences();
  }, []);

  const loadAllReferences = async () => {
    setRefsLoading(true);
    try {
      const [deptRes, desigRes, branchRes, empRes, usageRes] = await Promise.allSettled([
        getDepartmentsApi(),
        getDesignationsApi(),
        getBranchesApi(),
        getEmployeesApi({ limit: 1000 }),
        getModuleUsageApi(),
      ]);

      const rawDepts = deptRes.status === "fulfilled"
        ? (deptRes.value?.data?.departments ?? deptRes.value?.departments ?? deptRes.value?.data ?? [])
        : [];
      if (Array.isArray(rawDepts) && rawDepts.length > 0) {
        setDepartments(rawDepts);
      }
      const rawDesigs = desigRes.status === "fulfilled"
        ? (desigRes.value?.data?.designations ?? desigRes.value?.designations ?? desigRes.value?.data ?? [])
        : [];
      if (Array.isArray(rawDesigs) && rawDesigs.length > 0) {
        setDesignations(rawDesigs);
      }
      const rawBranches = branchRes.status === "fulfilled"
        ? (branchRes.value?.data?.branches ?? branchRes.value?.branches ?? branchRes.value?.data ?? [])
        : [];
      if (Array.isArray(rawBranches) && rawBranches.length > 0) {
        setBranches(rawBranches);
      }
      const rawEmps = empRes.status === "fulfilled"
        ? (empRes.value?.data?.employees ?? empRes.value?.employees ?? empRes.value?.data ?? [])
        : [];
      if (Array.isArray(rawEmps) && rawEmps.length > 0) {
        setManagers(rawEmps);
      }
      if (usageRes.status === "fulfilled" && usageRes.value?.data) {
        const d = usageRes.value.data;
        if (d.usage) setModuleUsage(d.usage);
        if (Array.isArray(d.subscribedModules) && d.subscribedModules.length > 0) {
          setPlanSubscribedModules(d.subscribedModules);
          // Default assigned modules to subscribed modules
          setFormData((prev) => ({
            ...prev,
            assignedModules: d.subscribedModules.map((m) => String(m).toLowerCase().trim()),
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load employee reference data:", err);
    } finally {
      setRefsLoading(false);
    }
  };

  // Auto-calculate Indian Salary Split when CTC changes
  const handleCtcChange = (annualCtc) => {
    const ctc = Math.max(0, Number(annualCtc) || 0);
    if (ctc <= 0) {
      setFormData((prev) => ({
        ...prev,
        salaryDetails: {
          ...prev.salaryDetails,
          ctc: 0,
          monthlyCtc: 0,
          basic: 0,
          basicSalary: 0,
          hra: 0,
          annualHra: 0,
          conveyance: 0,
          medicalAllowance: 0,
          specialAllowance: 0,
          annualSpecialAllowance: 0,
          pf: 0,
          pfEmployee: 0,
          pfEmployer: 0,
          professionalTax: 0,
          annualProfessionalTax: 0,
          tds: 0,
          grossSalary: 0,
          netSalary: 0,
          totalDeductions: 0,
        },
      }));
      return;
    }
    const monthlyCtc = Math.round(ctc / 12);
    const basic = Math.round(monthlyCtc * 0.5);
    const hra = Math.round(basic * 0.4);
    const conveyance = 1600;
    const medical = 1250;
    const pfEmp = Math.round(basic * 0.12);
    const pfEmplr = Math.round(basic * 0.12);
    const pt = 200;
    const special = Math.max(0, monthlyCtc - (basic + hra + conveyance + medical + pfEmplr));
    const gross = basic + hra + conveyance + medical + special;
    const deductions = pfEmp + pt;
    const net = Math.max(0, gross - deductions);

    setFormData((prev) => ({
      ...prev,
      salaryDetails: {
        ...prev.salaryDetails,
        ctc,
        monthlyCtc,
        basic,
        basicSalary: basic * 12,
        hra,
        annualHra: hra * 12,
        conveyance,
        medicalAllowance: medical,
        specialAllowance: special,
        annualSpecialAllowance: special * 12,
        grossSalary: gross,
        annualGross: gross * 12,
        pf: pfEmp,
        pfEmployee: pfEmp,
        pfEmployer: pfEmplr,
        annualPfEmployee: pfEmp * 12,
        annualPfEmployer: pfEmplr * 12,
        professionalTax: pt,
        annualProfessionalTax: pt * 12,
        totalDeductions: deductions,
        netSalary: net,
      },
    }));
  };

  // Instant per-field validation matching Web
  const clearError = (field) => {
    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const validateField = (field, val) => {
    let err = "";
    const v = val !== undefined && val !== null ? String(val) : "";

    if (field === "firstName") {
      if (!v.trim()) err = "First name is required";
      else if (v.trim().length < 2) err = "First name must be at least 2 characters";
      else if (!/^[A-Za-z\s.'-]+$/.test(v.trim())) err = "Only letters allowed in first name";
    } else if (field === "email") {
      if (!v.trim()) err = "Email address is required";
      else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v.trim())) {
        err = "Enter a valid email address (e.g. name@company.com)";
      }
    } else if (field === "phone") {
      const digits = v.replace(/\D/g, "");
      if (!digits) err = "Mobile number is required";
      else if (!/^[6-9]/.test(digits)) err = "Mobile number must start with 6, 7, 8, or 9";
      else if (digits.length !== 10) err = `Mobile number must be 10 digits (${digits.length}/10)`;
    } else if (field === "role") {
      if (!v) err = "Please select a system role";
    } else if (field === "departmentId") {
      const hasDept = Array.isArray(val) ? val.length > 0 : Boolean(val && String(val).trim());
      if (!hasDept) err = "Department is required (select at least one)";
    } else if (field === "branchId") {
      if (!v.trim()) err = "Branch office is required";
    } else if (field === "emergencyPhone") {
      const digits = v.replace(/\D/g, "");
      if (digits && digits.length !== 10) err = `Emergency phone must be 10 digits (${digits.length}/10)`;
      else if (digits && !/^[6-9]/.test(digits)) err = "Phone number must start with 6, 7, 8, or 9";
    } else if (field === "pincode") {
      const digits = v.replace(/\D/g, "");
      if (digits && digits.length !== 6) err = "Pincode must be exactly 6 digits";
    } else if (field === "panNumber") {
      if (v.trim()) {
        const pan = v.trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) err = "Invalid PAN format (e.g. ABCDE1234F)";
      }
    } else if (field === "aadhaarNumber") {
      const digits = v.replace(/\D/g, "");
      if (digits && digits.length !== 12) err = `Aadhaar must be 12 digits (${digits.length}/12)`;
    } else if (field === "ifscCode") {
      if (v.trim()) {
        const ifsc = v.trim().toUpperCase();
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) err = "Invalid IFSC format (e.g. SBIN0001234)";
      }
    } else if (field === "accountNumber") {
      const digits = v.replace(/\D/g, "");
      if (digits && (digits.length < 9 || digits.length > 18)) err = "Account number must be 9-18 digits";
    }

    setFormErrors((prev) => {
      if (err) return { ...prev, [field]: err };
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });

    return err;
  };

  // Per-step validation
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      const fn = validateField("firstName", formData.firstName);
      const em = validateField("email", formData.email);
      const ph = validateField("phone", formData.phone);
      if (fn) errors.firstName = fn;
      if (em) errors.email = em;
      if (ph) errors.phone = ph;
    }
    if (step === 2) {
      const rl = validateField("role", formData.role);
      const br = validateField("branchId", formData.branchId);
      const dp = validateField(
        "departmentId",
        formData.accessibleDepartments?.length ? formData.accessibleDepartments : formData.departmentId
      );
      if (rl) errors.role = rl;
      if (br) errors.branchId = br;
      if (dp) errors.departmentId = dp;
    }
    if (step === 3) {
      if (formData.emergencyContact?.phone) {
        const ep = validateField("emergencyPhone", formData.emergencyContact.phone);
        if (ep) errors.emergencyPhone = ep;
      }
      if (formData.address?.pincode) {
        const pin = validateField("pincode", formData.address.pincode);
        if (pin) errors.pincode = pin;
      }
    }
    if (step === 5) {
      if (formData.panNumber) {
        const pan = validateField("panNumber", formData.panNumber);
        if (pan) errors.panNumber = pan;
      }
      if (formData.aadhaarNumber) {
        const aadh = validateField("aadhaarNumber", formData.aadhaarNumber);
        if (aadh) errors.aadhaarNumber = aadh;
      }
      if (formData.bankDetails?.ifscCode) {
        const ifsc = validateField("ifscCode", formData.bankDetails.ifscCode);
        if (ifsc) errors.ifscCode = ifsc;
      }
      if (formData.bankDetails?.accountNumber) {
        const acc = validateField("accountNumber", formData.bankDetails.accountNumber);
        if (acc) errors.accountNumber = acc;
      }
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(activeStep);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      Alert.alert("Required Fields", "Please correct the highlighted fields before proceeding.");
      return;
    }
    setFormErrors({});
    setActiveStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setFormErrors({});
    setActiveStep((s) => Math.max(s - 1, 1));
  };

  // Quick Create Handlers
  const handleQuickSubmit = async () => {
    if (!quickForm.name.trim()) {
      Alert.alert("Required", "Please enter a name");
      return;
    }
    setQuickSaving(true);
    try {
      if (quickModal === "dept") {
        const res = await createDepartmentApi({
          name: quickForm.name.trim(),
          code: quickForm.code.trim() || quickForm.name.trim().slice(0, 3).toUpperCase(),
        });
        const created = res?.data?.department || res?.data?.data || res?.data;
        if (created?._id) {
          setDepartments((prev) => [...prev, created]);
          setFormData((prev) => ({
            ...prev,
            accessibleDepartments: [...(prev.accessibleDepartments || []), created._id],
            departmentId: prev.departmentId || created._id,
          }));
          clearError("departmentId");
          Alert.alert("Success", "Department created and selected!");
        }
      } else if (quickModal === "desig") {
        const res = await createDesignationApi({
          name: quickForm.name.trim(),
          departmentId: quickForm.departmentId || formData.accessibleDepartments?.[0] || undefined,
        });
        const created = res?.data?.designation || res?.data?.data || res?.data;
        if (created?._id) {
          setDesignations((prev) => [...prev, created]);
          setFormData((prev) => ({ ...prev, designationId: created._id }));
          Alert.alert("Success", "Designation created and selected!");
        }
      } else if (quickModal === "branch") {
        const res = await createBranchApi({
          branchName: quickForm.name.trim(),
          city: quickForm.city.trim(),
        });
        const created = res?.data?.branch || res?.data?.data || res?.data;
        if (created?._id) {
          setBranches((prev) => [...prev, created]);
          setFormData((prev) => ({ ...prev, branchId: created._id }));
          clearError("branchId");
          Alert.alert("Success", "Branch created and selected!");
        }
      }
      setQuickModal(null);
      setQuickForm({ name: "", code: "", departmentId: "", city: "" });
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create item");
    } finally {
      setQuickSaving(false);
    }
  };

  // Final Registration Handler
  const handleFinalSubmit = async () => {
    if (submitting) return;

    // Validate all critical steps
    for (const s of [1, 2, 3, 5]) {
      const errs = validateStep(s);
      if (Object.keys(errs).length > 0) {
        setFormErrors(errs);
        setActiveStep(s);
        Alert.alert("Validation Error", `Please fix the errors in Step ${s} before registering.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const sanitizeEmploymentType = (v) => {
        if (!v) return "full-time";
        return v.toLowerCase().replace(/_/g, "-");
      };

      const payload = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName?.trim() || undefined,
        lastName: formData.lastName?.trim() || "",
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || "",
        password: formData.password?.trim() || undefined,
        photo: formData.photo || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        maritalStatus: formData.maritalStatus || undefined,

        departmentId: formData.accessibleDepartments?.[0] || formData.departmentId || undefined,
        accessibleDepartments: formData.accessibleDepartments || [],
        designationId: formData.designationId || undefined,
        branchId: formData.branchId || undefined,
        reportingManagerId: formData.reportingManagerId || undefined,
        role: formData.role || "Employee",
        loginRole: formData.role || "Employee",
        managerAccessLevel:
          formData.role === "Manager" || formData.role === "HR" ? formData.managerAccessLevel : undefined,
        employmentType: sanitizeEmploymentType(formData.employmentType),
        workMode: formData.workMode || "office",
        allowRemotePunch: Boolean(formData.allowRemotePunch),
        isLocationTrackingEnabled: Boolean(formData.isLocationTrackingEnabled),
        joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : undefined,
        confirmationDate: formData.confirmationDate ? new Date(formData.confirmationDate).toISOString() : undefined,
        noticePeriod: formData.noticePeriod || undefined,

        address: formData.address,
        permanentAddress: formData.permanentAddress,
        emergencyContact: formData.emergencyContact,
        salaryDetails: formData.salaryDetails || undefined,
        bankDetails: formData.bankDetails || undefined,
        aadhaarNumber: formData.aadhaarNumber?.trim() || undefined,
        panNumber: formData.panNumber?.trim() || undefined,
        documents: {},
        assignedModules: (formData.assignedModules || []).filter((m) => subscribedModules.includes(m)),
      };

      const { data } = await createEmployeeApi(payload);

      Alert.alert(
        "🎉 Employee Registered!",
        `Employee Code: ${data?.employee?.employeeCode || "Created"}\nName: ${data?.employee?.firstName} ${data?.employee?.lastName || ""}\n\nLogin Credentials:\nEmail: ${data?.login?.email || formData.email}\nTemp Password: ${data?.login?.temporaryPassword || "Assigned"}\nRole: ${data?.login?.role || formData.role}\n\nThe employee can now log in using these credentials.`,
        [{ text: "Done", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Registration Failed", err.response?.data?.message || "Failed to create employee.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper names
  const displayName = `${formData.firstName || "New"} ${formData.lastName || "Employee"}`.trim();
  const selectedDeptName =
    departments.find((d) => formData.accessibleDepartments?.includes(d._id))?.name || "General";
  const selectedDesigName = designations.find((d) => d._id === formData.designationId)?.name || "Staff";

  // ── Render Step Content ───────────────────────────────────────
  const renderCurrentStep = () => {
    switch (activeStep) {
      // ═════════ STEP 1: Basic Info ═════════
      case 1:
        return (
          <View style={styles.stepPane}>
            <View style={styles.stepPaneHeader}>
              <View style={styles.stepPaneIconBox}>
                <Ionicons name="person" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.stepPaneTitle}>Basic Information</Text>
                <Text style={styles.stepPaneSubtitle}>Candidate personal identity & contact details</Text>
              </View>
            </View>

            <PhotoPickerField
              photo={formData.photo}
              onPhotoChange={(uri) => setFormData((p) => ({ ...p, photo: uri }))}
              label="Candidate Photo"
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                First Name <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, formErrors.firstName && styles.inputError]}
                placeholder="Enter first name"
                placeholderTextColor={THEME.textMuted}
                value={formData.firstName}
                onChangeText={(v) => {
                  setFormData((p) => ({ ...p, firstName: v }));
                  if (formErrors.firstName || v.trim().length >= 2) validateField("firstName", v);
                }}
              />
              {formErrors.firstName && <Text style={styles.errorText}>{formErrors.firstName}</Text>}
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>Middle Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Middle name"
                  placeholderTextColor={THEME.textMuted}
                  value={formData.middleName}
                  onChangeText={(v) => setFormData((p) => ({ ...p, middleName: v }))}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Last name"
                  placeholderTextColor={THEME.textMuted}
                  value={formData.lastName}
                  onChangeText={(v) => setFormData((p) => ({ ...p, lastName: v }))}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email Address (Login ID) <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, formErrors.email && styles.inputError]}
                placeholder="name@company.com"
                placeholderTextColor={THEME.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(v) => {
                  const clean = v.trim();
                  setFormData((p) => ({ ...p, email: clean }));
                  if (formErrors.email || clean.includes("@")) validateField("email", clean);
                }}
              />
              {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Mobile / WhatsApp Phone <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, formErrors.phone && styles.inputError]}
                placeholder="10-digit mobile number"
                placeholderTextColor={THEME.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={formData.phone}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, "").slice(0, 10);
                  setFormData((p) => ({ ...p, phone: digits }));
                  validateField("phone", digits);
                }}
              />
              {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.chipsRow}>
                {GENDER_OPTIONS.map((g) => {
                  const isSel = formData.gender === g.value;
                  return (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.chipPill, isSel && styles.chipPillActive]}
                      onPress={() => setFormData((p) => ({ ...p, gender: g.value }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipPillText, isSel && styles.chipPillTextActive]}>{g.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <AppDatePicker
                  label="Date of Birth"
                  value={formData.dateOfBirth}
                  onChangeText={(val) => setFormData((p) => ({ ...p, dateOfBirth: val }))}
                  placeholder="DD/MM/YYYY"
                  compact
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>Marital Status</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePickerModal("maritalStatus")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>
                    {MARITAL_OPTIONS.find((m) => m.value === formData.maritalStatus)?.label || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Custom Initial Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter password (optional)"
                placeholderTextColor={THEME.textMuted}
                value={formData.password}
                onChangeText={(v) => setFormData((p) => ({ ...p, password: v }))}
              />
              <Text style={styles.helperText}>Default is employee's phone number or auto-generated secure code.</Text>
            </View>
          </View>
        );

      // ═════════ STEP 2: Job Details & Module Access ═════════
      case 2:
        return (
          <View style={styles.stepPane}>
            <View style={styles.stepPaneHeader}>
              <View style={styles.stepPaneIconBox}>
                <Ionicons name="briefcase" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.stepPaneTitle}>Job & Organizational Hierarchy</Text>
                <Text style={styles.stepPaneSubtitle}>Role, branch, department & suite module licensing</Text>
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>
                  System Role <Text style={styles.req}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.dropdownBtn, formErrors.role && styles.inputError]}
                  onPress={() => setActivePickerModal("role")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>{formData.role || "Select Role"}</Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
                {formErrors.role && <Text style={styles.errorText}>{formErrors.role}</Text>}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.label}>
                    Branch Office <Text style={styles.req}>*</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setQuickModal("branch")}>
                    <Text style={styles.linkActionText}>+ New</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.dropdownBtn, formErrors.branchId && styles.inputError]}
                  onPress={() => setActivePickerModal("branch")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText} numberOfLines={1}>
                    {branches.find((b) => b._id === formData.branchId)?.branchName || "Select Branch"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
                {formErrors.branchId && <Text style={styles.errorText}>{formErrors.branchId}</Text>}
              </View>
            </View>

            {/* Multi-Select Accessible Departments */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.label}>
                  Accessible Departments (Multi-Select) <Text style={styles.req}>*</Text>
                </Text>
                <TouchableOpacity onPress={() => setQuickModal("dept")}>
                  <Text style={styles.linkActionText}>+ New Dept</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.dropdownBtn, formErrors.departmentId && styles.inputError]}
                onPress={() => setActivePickerModal("accessibleDepartments")}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownBtnText} numberOfLines={1}>
                  {formData.accessibleDepartments?.length > 0
                    ? `${formData.accessibleDepartments.length} Departments Selected`
                    : "Select accessible departments..."}
                </Text>
                <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
              </TouchableOpacity>
              {formErrors.departmentId && <Text style={styles.errorText}>{formErrors.departmentId}</Text>}

              {/* Selected Department Chips */}
              {formData.accessibleDepartments?.length > 0 && (
                <View style={styles.chipsRow}>
                  {formData.accessibleDepartments.map((deptId) => {
                    const dept = departments.find((d) => d._id === deptId);
                    if (!dept) return null;
                    return (
                      <View key={deptId} style={styles.badgeChip}>
                        <Text style={styles.badgeChipText}>{dept.name}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            const updated = formData.accessibleDepartments.filter((id) => id !== deptId);
                            setFormData((p) => ({
                              ...p,
                              accessibleDepartments: updated,
                              departmentId: updated[0] || "",
                            }));
                          }}
                        >
                          <Ionicons name="close-circle" size={14} color="#D97706" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.label}>Designation</Text>
                  <TouchableOpacity onPress={() => setQuickModal("desig")}>
                    <Text style={styles.linkActionText}>+ New</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePickerModal("designation")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText} numberOfLines={1}>
                    {designations.find((d) => d._id === formData.designationId)?.name || "Select Designation"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>Reporting Manager</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePickerModal("manager")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText} numberOfLines={1}>
                    {managers.find((m) => m._id === formData.reportingManagerId)
                      ? `${managers.find((m) => m._id === formData.reportingManagerId).firstName} ${managers.find((m) => m._id === formData.reportingManagerId).lastName || ""}`
                      : "Select Manager"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>Employment Type</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePickerModal("employmentType")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>
                    {EMPLOYMENT_TYPES.find((t) => t.value === formData.employmentType)?.label || "Full Time"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>Work Mode</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePickerModal("workMode")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>
                    {WORK_MODES.find((m) => m.value === formData.workMode)?.label || "On-Site"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <AppDatePicker
              label="Joining Date"
              value={formData.joiningDate}
              onChangeText={(val) => setFormData((p) => ({ ...p, joiningDate: val }))}
              placeholder="DD/MM/YYYY"
              compact
            />

            {/* ═════════ MODULE LICENSE & FEATURE ACCESS ═════════ */}
            <View style={styles.moduleSectionCard}>
              <View style={styles.moduleHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moduleSectionTitle}>MODULE LICENSE & FEATURE ACCESS</Text>
                  <Text style={styles.moduleSectionSub}>
                    Select suite modules this employee can access according to company plan seat limits.
                  </Text>
                </View>
                <View style={styles.modulePlanBadge}>
                  <Text style={styles.modulePlanBadgeText}>Plan Enforced</Text>
                </View>
              </View>

              <View style={styles.modulesGrid}>
                {ALL_MODULES.filter((m) => subscribedModules.includes(m.key)).map((m) => {
                  const usageInfo = moduleUsage[m.key];
                  const isFull = usageInfo && !usageInfo.isUnlimited && usageInfo.remaining <= 0;
                  const isChecked = (formData.assignedModules || []).includes(m.key);

                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.moduleCard,
                        isChecked && styles.moduleCardChecked,
                        isFull && !isChecked && styles.moduleCardFull,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (isFull && !isChecked) {
                          Alert.alert(
                            "Plan Limit Reached",
                            `The seat limit for "${m.label}" (${usageInfo?.limit || 0} seats) has been fully reached. Upgrade your plan to assign more employees.`
                          );
                          return;
                        }
                        setFormData((prev) => {
                          const cur = prev.assignedModules || [];
                          return {
                            ...prev,
                            assignedModules: isChecked ? cur.filter((x) => x !== m.key) : [...cur, m.key],
                          };
                        });
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons
                              name={m.icon || "cube-outline"}
                              size={14}
                              color={isChecked ? THEME.primaryDark : THEME.textSecondary}
                              style={{ marginRight: 5 }}
                            />
                            <Text style={[styles.moduleCardTitle, isChecked && styles.moduleCardTitleActive]}>
                              {m.label}
                            </Text>
                          </View>
                          <Text style={styles.moduleCardDesc} numberOfLines={2}>
                            {m.desc}
                          </Text>
                        </View>

                        <View style={[styles.checkboxCircle, isChecked && styles.checkboxCircleActive]}>
                          {isChecked && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                        </View>
                      </View>

                      {/* Seat Usage Indicator */}
                      <View style={styles.moduleCardFooter}>
                        {usageInfo?.isUnlimited ? (
                          <Text style={{ color: THEME.success, fontSize: 10, fontFamily: FONTS.bodyBold }}>
                            Unlimited ({usageInfo.used} used)
                          </Text>
                        ) : isFull && !isChecked ? (
                          <Text style={{ color: THEME.danger, fontSize: 10, fontFamily: FONTS.bodyBold }}>
                            Quota Full ({usageInfo?.limit} max)
                          </Text>
                        ) : (
                          <Text style={{ color: THEME.primaryDark, fontSize: 10, fontFamily: FONTS.bodyMedium }}>
                            {usageInfo?.used || 0}/{usageInfo?.limit || 0} seats used
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Remote Punch & Location Tracking Switches */}
            <View style={styles.toggleRowCard}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.toggleTitle}>Allow Remote GPS Punch</Text>
                <Text style={styles.toggleSubtitle}>Allows marking attendance outside office geofence</Text>
              </View>
              <Switch
                trackColor={{ false: "#CBD5E1", true: "#FDE68A" }}
                thumbColor={formData.allowRemotePunch ? THEME.primary : "#F8FAFC"}
                onValueChange={(val) => setFormData((p) => ({ ...p, allowRemotePunch: val }))}
                value={formData.allowRemotePunch}
              />
            </View>

            <View style={styles.toggleRowCard}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.toggleTitle}>Live GPS Location Tracking (Field Staff)</Text>
                <Text style={styles.toggleSubtitle}>
                  Enable live travel route tracking on mobile punch-in. Keep OFF for office staff.
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#CBD5E1", true: "#FDE68A" }}
                thumbColor={formData.isLocationTrackingEnabled ? THEME.primary : "#F8FAFC"}
                onValueChange={(val) => setFormData((p) => ({ ...p, isLocationTrackingEnabled: val }))}
                value={formData.isLocationTrackingEnabled}
              />
            </View>
          </View>
        );

      // ═════════ STEP 3: Address & Emergency Contact ═════════
      case 3:
        return (
          <View style={styles.stepPane}>
            <View style={styles.stepPaneHeader}>
              <View style={styles.stepPaneIconBox}>
                <Ionicons name="location" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.stepPaneTitle}>Address & Emergency Contact</Text>
                <Text style={styles.stepPaneSubtitle}>Residential location and family emergency contacts</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Residential Street</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter street address"
                placeholderTextColor={THEME.textMuted}
                value={formData.address?.street}
                onChangeText={(v) =>
                  setFormData((p) => ({ ...p, address: { ...p.address, street: v } }))
                }
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter city"
                  placeholderTextColor={THEME.textMuted}
                  value={formData.address?.city}
                  onChangeText={(v) =>
                    setFormData((p) => ({ ...p, address: { ...p.address, city: v } }))
                  }
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter state"
                  placeholderTextColor={THEME.textMuted}
                  value={formData.address?.state}
                  onChangeText={(v) =>
                    setFormData((p) => ({ ...p, address: { ...p.address, state: v } }))
                  }
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={[styles.textInput, formErrors.pincode && styles.inputError]}
                placeholder="6-digit pincode"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                maxLength={6}
                value={formData.address?.pincode}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, "").slice(0, 6);
                  setFormData((p) => ({ ...p, address: { ...p.address, pincode: digits } }));
                  if (digits) validateField("pincode", digits);
                  else clearError("pincode");
                }}
              />
              {formErrors.pincode && <Text style={styles.errorText}>{formErrors.pincode}</Text>}
            </View>

            <View style={styles.subSectionDivider}>
              <Text style={styles.subSectionTitle}>EMERGENCY CONTACT</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Person Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter emergency contact person"
                placeholderTextColor={THEME.textMuted}
                value={formData.emergencyContact?.name}
                onChangeText={(v) =>
                  setFormData((p) => ({ ...p, emergencyContact: { ...p.emergencyContact, name: v } }))
                }
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>Relationship</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePickerModal("relationship")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>
                    {EMERGENCY_RELATIONSHIPS.find((r) => r.value === formData.emergencyContact?.relationship)?.label ||
                      "Parent"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>Emergency Phone</Text>
                <TextInput
                  style={[styles.textInput, formErrors.emergencyPhone && styles.inputError]}
                  placeholder="10-digit number"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={formData.emergencyContact?.phone}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 10);
                    setFormData((p) => ({
                      ...p,
                      emergencyContact: { ...p.emergencyContact, phone: digits },
                    }));
                    if (digits) validateField("emergencyPhone", digits);
                    else clearError("emergencyPhone");
                  }}
                />
                {formErrors.emergencyPhone && (
                  <Text style={styles.errorText}>{formErrors.emergencyPhone}</Text>
                )}
              </View>
            </View>
          </View>
        );

      // ═════════ STEP 4: Salary & Compensation ═════════
      case 4:
        return (
          <View style={styles.stepPane}>
            <View style={styles.stepPaneHeader}>
              <View style={styles.stepPaneIconBox}>
                <Ionicons name="cash" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.stepPaneTitle}>Salary Structure & Allowances</Text>
                <Text style={styles.stepPaneSubtitle}>Standard Indian payroll breakup with auto CTC calculation</Text>
              </View>
            </View>

            {/* CTC Auto Split Card */}
            <View style={styles.ctcHighlightCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctcHighlightLabel}>ANNUAL COST TO COMPANY (CTC)</Text>
                <Text style={styles.ctcHighlightAmount}>
                  ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}
                </Text>
                <Text style={styles.ctcHighlightNote}>Auto-splits Basic, HRA, PF & Special Allowance</Text>
              </View>
              <View style={{ width: 130 }}>
                <Text style={styles.label}>Set CTC (₹)</Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: FONTS.mono, fontWeight: "bold" }]}
                  keyboardType="numeric"
                  value={String(formData.salaryDetails?.ctc || "")}
                  onChangeText={handleCtcChange}
                />
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>Basic Salary (Annual)</Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: FONTS.mono }]}
                  keyboardType="numeric"
                  value={String(formData.salaryDetails?.basicSalary || "")}
                  onChangeText={(v) =>
                    setFormData((p) => ({
                      ...p,
                      salaryDetails: { ...p.salaryDetails, basicSalary: Number(v) || 0 },
                    }))
                  }
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>House Rent Allowance (HRA)</Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: FONTS.mono }]}
                  keyboardType="numeric"
                  value={String(formData.salaryDetails?.hra || "")}
                  onChangeText={(v) =>
                    setFormData((p) => ({
                      ...p,
                      salaryDetails: { ...p.salaryDetails, hra: Number(v) || 0 },
                    }))
                  }
                />
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>Special Allowance</Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: FONTS.mono }]}
                  keyboardType="numeric"
                  value={String(formData.salaryDetails?.specialAllowance || "")}
                  onChangeText={(v) =>
                    setFormData((p) => ({
                      ...p,
                      salaryDetails: { ...p.salaryDetails, specialAllowance: Number(v) || 0 },
                    }))
                  }
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>Provident Fund (Employee)</Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: FONTS.mono }]}
                  keyboardType="numeric"
                  value={String(formData.salaryDetails?.pfEmployee || "")}
                  onChangeText={(v) =>
                    setFormData((p) => ({
                      ...p,
                      salaryDetails: { ...p.salaryDetails, pfEmployee: Number(v) || 0 },
                    }))
                  }
                />
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>Professional Tax (PT)</Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: FONTS.mono }]}
                  keyboardType="numeric"
                  value={String(formData.salaryDetails?.professionalTax || "")}
                  onChangeText={(v) =>
                    setFormData((p) => ({
                      ...p,
                      salaryDetails: { ...p.salaryDetails, professionalTax: Number(v) || 0 },
                    }))
                  }
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>TDS / Tax Withholding</Text>
                <TextInput
                  style={[styles.textInput, { fontFamily: FONTS.mono }]}
                  keyboardType="numeric"
                  value={String(formData.salaryDetails?.tds || "")}
                  onChangeText={(v) =>
                    setFormData((p) => ({
                      ...p,
                      salaryDetails: { ...p.salaryDetails, tds: Number(v) || 0 },
                    }))
                  }
                />
              </View>
            </View>
          </View>
        );

      // ═════════ STEP 5: Bank & Identity Proofs ═════════
      case 5:
        return (
          <View style={styles.stepPane}>
            <View style={styles.stepPaneHeader}>
              <View style={styles.stepPaneIconBox}>
                <Ionicons name="card" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.stepPaneTitle}>Banking & Identity Proofs</Text>
                <Text style={styles.stepPaneSubtitle}>Salary bank deposit and PAN/Aadhaar compliance</Text>
              </View>
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>Aadhaar Card Number</Text>
                <TextInput
                  style={[styles.textInput, formErrors.aadhaarNumber && styles.inputError]}
                  placeholder="12-digit Aadhaar"
                  placeholderTextColor={THEME.textMuted}
                  keyboardType="numeric"
                  maxLength={12}
                  value={formData.aadhaarNumber}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, 12);
                    setFormData((p) => ({ ...p, aadhaarNumber: digits }));
                    if (digits) validateField("aadhaarNumber", digits);
                    else clearError("aadhaarNumber");
                  }}
                />
                {formErrors.aadhaarNumber && (
                  <Text style={styles.errorText}>{formErrors.aadhaarNumber}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>PAN Number</Text>
                <TextInput
                  style={[styles.textInput, formErrors.panNumber && styles.inputError]}
                  placeholder="ABCDE1234F"
                  placeholderTextColor={THEME.textMuted}
                  autoCapitalize="characters"
                  maxLength={10}
                  value={formData.panNumber}
                  onChangeText={(v) => {
                    const pan = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                    setFormData((p) => ({ ...p, panNumber: pan }));
                    if (pan) validateField("panNumber", pan);
                    else clearError("panNumber");
                  }}
                />
                {formErrors.panNumber && <Text style={styles.errorText}>{formErrors.panNumber}</Text>}
              </View>
            </View>

            <View style={styles.subSectionDivider}>
              <Text style={styles.subSectionTitle}>SALARY BANK ACCOUNT</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter bank name (e.g. HDFC Bank)"
                placeholderTextColor={THEME.textMuted}
                value={formData.bankDetails?.bankName}
                onChangeText={(v) =>
                  setFormData((p) => ({
                    ...p,
                    bankDetails: { ...p.bankDetails, bankName: v },
                  }))
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bank Account Number</Text>
              <TextInput
                style={[styles.textInput, formErrors.accountNumber && styles.inputError]}
                placeholder="Account number"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                maxLength={18}
                value={formData.bankDetails?.accountNumber}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, "").slice(0, 18);
                  setFormData((p) => ({
                    ...p,
                    bankDetails: { ...p.bankDetails, accountNumber: digits },
                  }));
                  if (digits) validateField("accountNumber", digits);
                  else clearError("accountNumber");
                }}
              />
              {formErrors.accountNumber && (
                <Text style={styles.errorText}>{formErrors.accountNumber}</Text>
              )}
            </View>

            <View style={styles.rowTwo}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput
                  style={[styles.textInput, formErrors.ifscCode && styles.inputError]}
                  placeholder="SBIN0001234"
                  placeholderTextColor={THEME.textMuted}
                  autoCapitalize="characters"
                  maxLength={11}
                  value={formData.bankDetails?.ifscCode}
                  onChangeText={(v) => {
                    const ifsc = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
                    setFormData((p) => ({
                      ...p,
                      bankDetails: { ...p.bankDetails, ifscCode: ifsc },
                    }));
                    if (ifsc) validateField("ifscCode", ifsc);
                    else clearError("ifscCode");
                  }}
                />
                {formErrors.ifscCode && <Text style={styles.errorText}>{formErrors.ifscCode}</Text>}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                <Text style={styles.label}>Account Type</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePickerModal("accountType")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownBtnText}>
                    {BANK_ACCOUNT_TYPES.find((t) => t.value === formData.bankDetails?.accountType)?.label ||
                      "Savings"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      // ═════════ STEP 6: Document Vault ═════════
      case 6:
        return (
          <View style={styles.stepPane}>
            <View style={styles.stepPaneHeader}>
              <View style={styles.stepPaneIconBox}>
                <Ionicons name="document-text" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.stepPaneTitle}>Candidate Document Vault</Text>
                <Text style={styles.stepPaneSubtitle}>Attach Aadhaar, PAN, Resume, Offer Letter or Certificates</Text>
              </View>
            </View>

            <View style={styles.docUploadCard}>
              <Ionicons name="cloud-upload-outline" size={32} color={THEME.primary} />
              <Text style={styles.docUploadTitle}>Upload Candidate Verified Proofs</Text>
              <Text style={styles.docUploadSub}>PDF, PNG, JPG files up to 5MB supported</Text>
              <TouchableOpacity
                style={styles.docChooseBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    "Attach Proof",
                    "Choose document type to attach",
                    [
                      {
                        text: "Resume / CV",
                        onPress: () => {
                          setFormData((prev) => ({
                            ...prev,
                            documents: [
                              ...(prev.documents || []),
                              { title: "Resume_Candidate.pdf", type: "pdf", date: new Date().toLocaleDateString() },
                            ],
                          }));
                        },
                      },
                      {
                        text: "Aadhaar Card",
                        onPress: () => {
                          setFormData((prev) => ({
                            ...prev,
                            documents: [
                              ...(prev.documents || []),
                              { title: "Aadhaar_Verified.pdf", type: "pdf", date: new Date().toLocaleDateString() },
                            ],
                          }));
                        },
                      },
                      {
                        text: "PAN Card",
                        onPress: () => {
                          setFormData((prev) => ({
                            ...prev,
                            documents: [
                              ...(prev.documents || []),
                              { title: "PAN_Card.jpg", type: "image", date: new Date().toLocaleDateString() },
                            ],
                          }));
                        },
                      },
                      { text: "Cancel", style: "cancel" },
                    ]
                  );
                }}
              >
                <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.docChooseBtnText}>Add Document Proof</Text>
              </TouchableOpacity>
            </View>

            {/* Attached Documents List */}
            {formData.documents?.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="folder-outline" size={24} color={THEME.textMuted} />
                <Text style={styles.emptyBoxText}>No document proofs attached yet (optional)</Text>
              </View>
            ) : (
              <View style={{ gap: 8, marginTop: 10 }}>
                {formData.documents.map((doc, idx) => (
                  <View key={idx} style={styles.docItemRow}>
                    <Ionicons
                      name={doc.type === "pdf" ? "document-text" : "image"}
                      size={18}
                      color={THEME.primaryDark}
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docItemTitle} numberOfLines={1}>{doc.title}</Text>
                      <Text style={styles.docItemDate}>{doc.date}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          documents: prev.documents.filter((_, i) => i !== idx),
                        }));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={THEME.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      // ═════════ STEP 7: Review & Create ═════════
      case 7:
        return (
          <View style={styles.stepPane}>
            <View style={styles.stepPaneHeader}>
              <View style={styles.stepPaneIconBox}>
                <Ionicons name="checkmark-done-circle" size={16} color="#D97706" />
              </View>
              <View>
                <Text style={styles.stepPaneTitle}>Final Review & Registration</Text>
                <Text style={styles.stepPaneSubtitle}>Verify candidate details before creating account</Text>
              </View>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewAvatarRow}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarLetter}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.reviewName}>{displayName}</Text>
                  <Text style={styles.reviewSub}>{formData.email}</Text>
                  <Text style={styles.reviewSub}>{formData.phone}</Text>
                </View>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{formData.role}</Text>
                </View>
              </View>

              <View style={styles.reviewGrid}>
                <View style={styles.reviewGridItem}>
                  <Text style={styles.reviewGridKey}>Department</Text>
                  <Text style={styles.reviewGridVal}>{selectedDeptName}</Text>
                </View>
                <View style={styles.reviewGridItem}>
                  <Text style={styles.reviewGridKey}>Designation</Text>
                  <Text style={styles.reviewGridVal}>{selectedDesigName}</Text>
                </View>
                <View style={styles.reviewGridItem}>
                  <Text style={styles.reviewGridKey}>Annual CTC</Text>
                  <Text style={[styles.reviewGridVal, { color: THEME.success, fontWeight: "bold" }]}>
                    ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.reviewGridItem}>
                  <Text style={styles.reviewGridKey}>Work Mode</Text>
                  <Text style={styles.reviewGridVal}>
                    {WORK_MODES.find((m) => m.value === formData.workMode)?.label || "Office"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Assigned Module Licenses Chips */}
            <View style={styles.reviewModulesCard}>
              <Text style={styles.reviewModulesTitle}>
                ASSIGNED MODULE LICENSES ({(formData.assignedModules || []).filter((m) => subscribedModules.includes(m)).length})
              </Text>
              <View style={styles.chipsRow}>
                {(formData.assignedModules || [])
                  .filter((m) => subscribedModules.includes(m))
                  .map((mKey) => {
                    const mod = ALL_MODULES.find((x) => x.key === mKey);
                    return (
                      <View key={mKey} style={styles.moduleBadgePill}>
                        <Ionicons name="checkmark-circle" size={12} color="#D97706" style={{ marginRight: 4 }} />
                        <Text style={styles.moduleBadgeText}>{mod?.label || mKey}</Text>
                      </View>
                    );
                  })}
              </View>
            </View>

            <View style={styles.securityNoticeCard}>
              <Ionicons name="shield-checkmark" size={16} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.securityNoticeText}>
                Credentials will be auto-generated and permissions instantly applied. The employee will be required to change password on first login.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.screen}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Add New Employee</Text>
          <Text style={styles.headerSubtitle}>
            Step {activeStep} of {STEPS.length}: {STEPS[activeStep - 1]?.label}
          </Text>
        </View>
      </View>

      {/* ── Live Mini Candidate Header ── */}
      <View style={styles.miniCandidateBar}>
        <View style={styles.miniAvatar}>
          <Text style={styles.miniAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.miniName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.miniMeta} numberOfLines={1}>
            {selectedDesigName} • {selectedDeptName} • {formData.role}
          </Text>
        </View>
        <View style={styles.miniCtcTag}>
          <Text style={styles.miniCtcText}>
            ₹{(Number(formData.salaryDetails?.ctc) || 0).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {/* ── 7-Step Horizontal Stepper ── */}
      <View style={styles.stepperContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepperScroll}
        >
          {STEPS.map((s) => {
            const isActive = activeStep === s.id;
            const isDone = activeStep > s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.stepTab,
                  isActive && styles.stepTabActive,
                  isDone && styles.stepTabDone,
                ]}
                onPress={() => {
                  // Allow navigating back or to steps that are validated
                  if (s.id <= activeStep) setActiveStep(s.id);
                  else {
                    const errs = validateStep(activeStep);
                    if (Object.keys(errs).length === 0) setActiveStep(s.id);
                    else Alert.alert("Required", "Complete current step before proceeding.");
                  }
                }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.stepNumberCircle,
                    isActive && styles.stepNumberActive,
                    isDone && styles.stepNumberDone,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.stepNumberText, isActive && styles.stepNumberTextActive]}>
                      {s.id}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTabText,
                    isActive && styles.stepTabTextActive,
                    isDone && styles.stepTabTextDone,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Form Body Scroll View ── */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.bodyScrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={80}
      >
        {renderCurrentStep()}
      </KeyboardAwareScrollView>

      {/* ── Bottom Action Footer ── */}
      <View style={styles.bottomBar}>
        {activeStep > 1 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={submitting}>
            <Ionicons name="arrow-back" size={16} color={THEME.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}

        {activeStep < STEPS.length ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>Next Step</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.registerButton, submitting && { opacity: 0.7 }]}
            onPress={handleFinalSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.registerButtonText}>Register Employee</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ═════════ SELECTION MODALS ═════════ */}
      {/* 1. Generic Selection Modal */}
      <Modal visible={!!activePickerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activePickerModal === "role" && "Select System Role"}
                {activePickerModal === "branch" && "Select Branch Office"}
                {activePickerModal === "designation" && "Select Job Designation"}
                {activePickerModal === "manager" && "Select Reporting Manager"}
                {activePickerModal === "employmentType" && "Select Employment Type"}
                {activePickerModal === "workMode" && "Select Work Mode"}
                {activePickerModal === "maritalStatus" && "Select Marital Status"}
                {activePickerModal === "relationship" && "Select Relationship"}
                {activePickerModal === "accountType" && "Select Account Type"}
                {activePickerModal === "accessibleDepartments" && "Select Accessible Departments"}
              </Text>
              <TouchableOpacity onPress={() => { setActivePickerModal(null); setSearchQuery(""); }}>
                <Ionicons name="close-circle" size={22} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Department Multi-Select Items */}
            {activePickerModal === "accessibleDepartments" && (
              <FlatList
                data={departments}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const isChecked = formData.accessibleDepartments?.includes(item._id);
                  return (
                    <TouchableOpacity
                      style={[styles.modalListItem, isChecked && styles.modalListItemChecked]}
                      onPress={() => {
                        const cur = formData.accessibleDepartments || [];
                        const next = isChecked ? cur.filter((id) => id !== item._id) : [...cur, item._id];
                        setFormData((p) => ({
                          ...p,
                          accessibleDepartments: next,
                          departmentId: next[0] || "",
                        }));
                        if (next.length > 0) {
                          clearError("departmentId");
                        }
                      }}
                    >
                      <Text style={[styles.modalListText, isChecked && styles.modalListTextChecked]}>
                        {item.name}
                      </Text>
                      <View style={[styles.checkboxSquare, isChecked && styles.checkboxSquareActive]}>
                        {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  <TouchableOpacity
                    style={styles.modalDoneBtn}
                    onPress={() => setActivePickerModal(null)}
                  >
                    <Text style={styles.modalDoneBtnText}>Done Selecting</Text>
                  </TouchableOpacity>
                }
              />
            )}

            {/* Role List */}
            {activePickerModal === "role" && (
              <FlatList
                data={["Employee", "Manager", "HR"]}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.role === item && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, role: item }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.role === item && styles.modalListTextChecked]}>
                      {item === "Employee" ? "Employee (Standard Staff)" : item === "Manager" ? "Manager (Team & Task Leader)" : "HR (Human Resources Manager)"}
                    </Text>
                    {formData.role === item && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Branch List */}
            {activePickerModal === "branch" && (
              <FlatList
                data={branches}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.branchId === item._id && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, branchId: item._id }));
                      clearError("branchId");
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.branchId === item._id && styles.modalListTextChecked]}>
                      {item.branchName} ({item.city || "Headquarters"})
                    </Text>
                    {formData.branchId === item._id && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Designation List */}
            {activePickerModal === "designation" && (
              <FlatList
                data={designations}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.designationId === item._id && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, designationId: item._id }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.designationId === item._id && styles.modalListTextChecked]}>
                      {item.name}
                    </Text>
                    {formData.designationId === item._id && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Reporting Manager List */}
            {activePickerModal === "manager" && (
              <FlatList
                data={managers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.reportingManagerId === item._id && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, reportingManagerId: item._id }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.reportingManagerId === item._id && styles.modalListTextChecked]}>
                      {item.firstName} {item.lastName} ({item.employeeCode || "Staff"})
                    </Text>
                    {formData.reportingManagerId === item._id && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Employment Type List */}
            {activePickerModal === "employmentType" && (
              <FlatList
                data={EMPLOYMENT_TYPES}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.employmentType === item.value && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, employmentType: item.value }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.employmentType === item.value && styles.modalListTextChecked]}>
                      {item.label}
                    </Text>
                    {formData.employmentType === item.value && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Work Mode List */}
            {activePickerModal === "workMode" && (
              <FlatList
                data={WORK_MODES}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.workMode === item.value && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, workMode: item.value }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.workMode === item.value && styles.modalListTextChecked]}>
                      {item.label}
                    </Text>
                    {formData.workMode === item.value && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Marital Status List */}
            {activePickerModal === "maritalStatus" && (
              <FlatList
                data={MARITAL_OPTIONS}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.maritalStatus === item.value && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, maritalStatus: item.value }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.maritalStatus === item.value && styles.modalListTextChecked]}>
                      {item.label}
                    </Text>
                    {formData.maritalStatus === item.value && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Emergency Relationship List */}
            {activePickerModal === "relationship" && (
              <FlatList
                data={EMERGENCY_RELATIONSHIPS}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.emergencyContact?.relationship === item.value && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({
                        ...p,
                        emergencyContact: { ...p.emergencyContact, relationship: item.value },
                      }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.emergencyContact?.relationship === item.value && styles.modalListTextChecked]}>
                      {item.label}
                    </Text>
                    {formData.emergencyContact?.relationship === item.value && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Account Type List */}
            {activePickerModal === "accountType" && (
              <FlatList
                data={BANK_ACCOUNT_TYPES}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalListItem, formData.bankDetails?.accountType === item.value && styles.modalListItemChecked]}
                    onPress={() => {
                      setFormData((p) => ({
                        ...p,
                        bankDetails: { ...p.bankDetails, accountType: item.value },
                      }));
                      setActivePickerModal(null);
                    }}
                  >
                    <Text style={[styles.modalListText, formData.bankDetails?.accountType === item.value && styles.modalListTextChecked]}>
                      {item.label}
                    </Text>
                    {formData.bankDetails?.accountType === item.value && <Ionicons name="checkmark" size={16} color={THEME.primaryDark} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 2. Quick Create Modal (Dept / Desig / Branch) */}
      <Modal visible={!!quickModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {quickModal === "dept" && "Create New Department"}
                {quickModal === "desig" && "Create New Designation"}
                {quickModal === "branch" && "Create New Branch"}
              </Text>
              <TouchableOpacity onPress={() => setQuickModal(null)}>
                <Ionicons name="close-circle" size={22} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {quickModal === "branch" ? "Branch Name *" : "Name *"}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter name"
                  placeholderTextColor={THEME.textMuted}
                  value={quickForm.name}
                  onChangeText={(v) => setQuickForm((p) => ({ ...p, name: v }))}
                />
              </View>

              {quickModal === "dept" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Department Code (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. ENG, HR, SLS"
                    placeholderTextColor={THEME.textMuted}
                    value={quickForm.code}
                    onChangeText={(v) => setQuickForm((p) => ({ ...p, code: v }))}
                  />
                </View>
              )}

              {quickModal === "branch" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>City (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Mumbai, Bangalore"
                    placeholderTextColor={THEME.textMuted}
                    value={quickForm.city}
                    onChangeText={(v) => setQuickForm((p) => ({ ...p, city: v }))}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveActionBtn, quickSaving && { opacity: 0.7 }]}
                onPress={handleQuickSubmit}
                disabled={quickSaving}
              >
                {quickSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveActionBtnText}>Save & Select</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: THEME.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerBackBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: THEME.cardSubtle,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  miniCandidateBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: "#FFFFFF",
    fontFamily: FONTS.displayBold,
    fontSize: 15,
  },
  miniName: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  miniMeta: {
    fontSize: 10.5,
    fontFamily: FONTS.body,
    color: "#92400E",
    marginTop: 1,
  },
  miniCtcTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  miniCtcText: {
    fontSize: 11,
    fontFamily: FONTS.mono,
    fontWeight: "bold",
    color: "#B45309",
  },
  stepperContainer: {
    backgroundColor: THEME.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  stepperScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  stepTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: THEME.cardSubtle,
  },
  stepTabActive: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  stepTabDone: {
    backgroundColor: "#ECFDF5",
  },
  stepNumberCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  stepNumberActive: {
    backgroundColor: THEME.primary,
  },
  stepNumberDone: {
    backgroundColor: THEME.success,
  },
  stepNumberText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: THEME.textSecondary,
  },
  stepNumberTextActive: {
    color: "#FFFFFF",
  },
  stepTabText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textSecondary,
  },
  stepTabTextActive: {
    fontFamily: FONTS.bodyBold,
    color: "#92400E",
  },
  stepTabTextDone: {
    color: "#065F46",
  },
  bodyScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepPane: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
  },
  stepPaneHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardSubtle,
    paddingBottom: 10,
  },
  stepPaneIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepPaneTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  stepPaneSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
    marginBottom: 5,
  },
  req: {
    color: THEME.danger,
    fontWeight: "bold",
  },
  textInput: {
    height: 42,
    backgroundColor: THEME.cardSubtle,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
  },
  inputError: {
    borderColor: THEME.danger,
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: THEME.danger,
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    marginTop: 3,
  },
  helperText: {
    color: THEME.textMuted,
    fontSize: 10,
    fontFamily: FONTS.body,
    marginTop: 3,
  },
  rowTwo: {
    flexDirection: "row",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: THEME.cardSubtle,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  chipPillActive: {
    backgroundColor: "#FEF3C7",
    borderColor: THEME.primary,
  },
  chipPillText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textSecondary,
  },
  chipPillTextActive: {
    fontFamily: FONTS.bodyBold,
    color: "#92400E",
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#92400E",
  },
  dropdownBtn: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.cardSubtle,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  dropdownBtnText: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
    flex: 1,
  },
  linkActionText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#D97706",
  },
  moduleSectionCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    marginVertical: 10,
  },
  moduleHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  moduleSectionTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  moduleSectionSub: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  modulePlanBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  modulePlanBadgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: "#B45309",
  },
  modulesGrid: {
    gap: 8,
  },
  moduleCard: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 10,
  },
  moduleCardChecked: {
    backgroundColor: "#FFFBEB",
    borderColor: THEME.primary,
  },
  moduleCardFull: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  moduleCardTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  moduleCardTitleActive: {
    color: "#92400E",
  },
  moduleCardDesc: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: THEME.textMuted,
    marginTop: 2,
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircleActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  moduleCardFooter: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.cardSubtle,
  },
  toggleRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.cardSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    marginTop: 8,
  },
  toggleTitle: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  toggleSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  subSectionDivider: {
    borderTopWidth: 1,
    borderTopColor: THEME.cardSubtle,
    paddingTop: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    color: THEME.textSecondary,
    letterSpacing: 0.5,
  },
  ctcHighlightCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
    padding: 14,
    marginBottom: 14,
  },
  ctcHighlightLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#92400E",
    letterSpacing: 0.5,
  },
  ctcHighlightAmount: {
    fontSize: 18,
    fontFamily: FONTS.mono,
    fontWeight: "bold",
    color: "#B45309",
    marginVertical: 2,
  },
  ctcHighlightNote: {
    fontSize: 9.5,
    fontFamily: FONTS.body,
    color: "#B45309",
  },
  docUploadCard: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: THEME.border,
    borderRadius: 14,
    backgroundColor: THEME.cardSubtle,
    padding: 18,
  },
  docUploadTitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
    marginTop: 8,
  },
  docUploadSub: {
    fontSize: 10,
    fontFamily: FONTS.body,
    color: THEME.textMuted,
    marginTop: 2,
  },
  docChooseBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  docChooseBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyBoxText: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: THEME.textMuted,
    marginTop: 6,
  },
  docItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.cardSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 10,
  },
  docItemTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  docItemDate: {
    fontSize: 9.5,
    fontFamily: FONTS.body,
    color: THEME.textMuted,
  },
  reviewCard: {
    backgroundColor: THEME.cardSubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 12,
  },
  reviewAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarLetter: {
    color: "#FFFFFF",
    fontFamily: FONTS.displayBold,
    fontSize: 20,
  },
  reviewName: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: THEME.textPrimary,
  },
  reviewSub: {
    fontSize: 11,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  roleTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  roleTagText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#B45309",
    textTransform: "uppercase",
  },
  reviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reviewGridItem: {
    width: "48%",
    backgroundColor: THEME.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 8,
  },
  reviewGridKey: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    color: THEME.textMuted,
    textTransform: "uppercase",
  },
  reviewGridVal: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: THEME.textPrimary,
    marginTop: 2,
  },
  reviewModulesCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
    padding: 12,
    marginBottom: 12,
  },
  reviewModulesTitle: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: "#92400E",
    marginBottom: 8,
  },
  moduleBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  moduleBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: "#B45309",
  },
  securityNoticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: THEME.cardSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: FONTS.body,
    color: THEME.textSecondary,
    lineHeight: 15,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  backButtonText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: THEME.textSecondary,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  nextButtonText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  registerButtonText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: THEME.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: THEME.textPrimary,
  },
  modalListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.cardSubtle,
  },
  modalListItemChecked: {
    backgroundColor: "#FFFBEB",
  },
  modalListText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: THEME.textPrimary,
  },
  modalListTextChecked: {
    fontFamily: FONTS.bodyBold,
    color: "#92400E",
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSquareActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  modalDoneBtn: {
    backgroundColor: THEME.primary,
    margin: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalDoneBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  saveActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  saveActionBtnText: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
});

export default AddEmployeeScreen;
