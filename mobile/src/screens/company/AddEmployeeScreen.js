import React, { useEffect, useState } from "react";
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
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import PhotoPickerField from "../../components/PhotoPickerField";
import DatePickerModal from "../../components/DatePickerModal";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";
import {
  getDepartmentsApi,
  getDesignationsApi,
  getBranchesApi,
  createDepartmentApi,
  createDesignationApi,
  createBranchApi,
} from "../../api/companyService";
import { createEmployeeApi } from "../../api/employeeService";
import { EMPLOYMENT_TYPES, WORK_MODES, LOGIN_ROLES } from "./employeeConstants";
import { useAuth } from "../../context/AuthContext";
import { isValidDDMMYYYY, parseDDMMYYYYToISO } from "../../utils/dateFormatter";

const { width } = Dimensions.get("window");

// ── Design Tokens ────────────────────────────────────────────
const C = {
  bg:      COLORS.background,
  card:    COLORS.white,
  border:  "#cbd5e1",
  primary: COLORS.primary,
  pBg:     "#f0fdfa", // Teal light background
  pBorder: "#ccfbf1", // Teal light border
  text:    COLORS.text.dark,
  sub:     COLORS.text.muted,
  muted:   COLORS.text.light,
  red:     COLORS.danger,
  redBg:   "#fee2e2",
  green:   COLORS.success,
  greenBg: "#d1fae5",
};

const STEPS = [
  { key: "personal", label: "Personal",  icon: "person-outline"        },
  { key: "job",      label: "Job Info",  icon: "briefcase-outline"      },
  { key: "salary",   label: "Salary",    icon: "cash-outline"           },
  { key: "access",   label: "Access",    icon: "shield-checkmark-outline"},
];

const labelFor = (opts, val) => opts.find((o) => o.value === val)?.label || "";

// ─── Field Label ──────────────────────────────────────────────
const FieldLabel = ({ text, required }) => (
  <Text style={styles.fieldLabel}>
    {text}
    {required && <Text style={{ color: C.red }}> *</Text>}
  </Text>
);

// ─── Text Field ───────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <View style={styles.fieldWrap}>
    <FieldLabel text={label} required={required} />
    {children}
  </View>
);

// ─── Styled Input ─────────────────────────────────────────────
const SInput = ({ style, ...props }) => (
  <TextInput style={[styles.input, style]} placeholderTextColor={C.muted} {...props} />
);

// ─── Picker Row ───────────────────────────────────────────────
const PickerRow = ({ label, required, display, placeholder = "Tap to select", onPress, icon }) => (
  <Field label={label} required={required}>
    <TouchableOpacity style={styles.picker} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon || "chevron-down"} size={16} color={display ? C.primary : C.muted} style={{ marginRight: 8 }} />
      <Text style={[styles.pickerText, !display && styles.pickerPh]} numberOfLines={1}>
        {display || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={14} color={C.muted} />
    </TouchableOpacity>
  </Field>
);

// ─── Option Chips ─────────────────────────────────────────────
const ChipGroup = ({ options, value, onChange }) => (
  <View style={styles.chipRow}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt.value}
        style={[styles.chip, value === opt.value && styles.chipActive]}
        onPress={() => onChange(opt.value)}
        activeOpacity={0.75}
      >
        <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Step Indicator ───────────────────────────────────────────
const StepIndicator = ({ steps, current }) => (
  <View style={styles.stepRow}>
    {steps.map((s, i) => {
      const done    = i < current;
      const active  = i === current;
      return (
        <React.Fragment key={s.key}>
          <View style={styles.stepItem}>
            <View style={[
              styles.stepDot,
              done   && styles.stepDotDone,
              active && styles.stepDotActive,
            ]}>
              {done
                ? <Ionicons name="checkmark" size={13} color="#fff" />
                : <Text style={[styles.stepNum, active && { color: "#fff" }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive, done && styles.stepLabelDone]}>
              {s.label}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[styles.stepLine, done && styles.stepLineDone]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

// ─── Inline Add-New Form (inside sheet) ───────────────────────
const AddNewForm = ({ type, departments, onSave, onCancel }) => {
  const [name,       setName]       = useState("");
  const [desc,       setDesc]       = useState("");
  const [deptId,     setDeptId]     = useState("");
  const [deptName,   setDeptName]   = useState("");
  const [city,       setCity]       = useState("");
  const [address,    setAddress]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [deptModal,  setDeptModal]  = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Required", "Name is required"); return; }
    if (type === "designation" && !deptId) { Alert.alert("Required", "Please select a department"); return; }
    setSaving(true);
    try {
      let res;
      if (type === "department") {
        res = await createDepartmentApi({ name: name.trim(), description: desc.trim() });
        const created = res?.data?.department || res?.data?.data || res?.data;
        if (!created) throw new Error("Could not create department");
        onSave(created, "department");
      } else if (type === "designation") {
        res = await createDesignationApi({ name: name.trim(), description: desc.trim(), departmentId: deptId });
        const created = res?.data?.designation || res?.data?.data || res?.data;
        if (!created) throw new Error("Could not create designation");
        onSave(created, "designation");
      } else if (type === "branch") {
        res = await createBranchApi({ branchName: name.trim(), city: city.trim(), address: address.trim() });
        const created = res?.data?.branch || res?.data?.data || res?.data;
        if (!created) throw new Error("Could not create branch");
        onSave(created, "branch");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message || `Failed to create ${type}`);
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = { department: "Department", designation: "Designation", branch: "Branch" }[type];

  return (
    <View style={styles.addForm}>
      <View style={styles.addFormHeader}>
        <Text style={styles.addFormTitle}>New {typeLabel}</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      <SInput placeholder={type === "branch" ? "Branch name *" : "Name *"} value={name} onChangeText={setName} />

      {type === "designation" && (
        <>
          <TouchableOpacity style={styles.input} onPress={() => setDeptModal(true)}>
            <Text style={[styles.pickerText, !deptId && styles.pickerPh]}>
              {deptName || "Select Department *"}
            </Text>
          </TouchableOpacity>
          <Modal visible={deptModal} transparent animationType="fade">
            <View style={styles.subOverlay}>
              <View style={styles.subBox}>
                <Text style={styles.subTitle}>Select Department</Text>
                <FlatList
                  data={departments}
                  keyExtractor={(d) => d._id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.subItem} onPress={() => { setDeptId(item._id); setDeptName(item.name); setDeptModal(false); }}>
                      <Text style={styles.subItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>No departments yet.</Text>}
                />
                <TouchableOpacity style={styles.subCancel} onPress={() => setDeptModal(false)}>
                  <Text style={styles.subCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      {type === "branch" && (
        <SInput placeholder="City" value={city} onChangeText={setCity} />
      )}

      <SInput
        placeholder={type === "branch" ? "Address (optional)" : "Description (optional)"}
        value={type === "branch" ? address : desc}
        onChangeText={type === "branch" ? setAddress : setDesc}
        multiline
        style={{ height: 64, textAlignVertical: "top" }}
      />

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <>
              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Save & Select</Text>
            </>
        }
      </TouchableOpacity>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
const AddEmployeeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const availableRoles = user?.role === "CompanyAdmin"
    ? LOGIN_ROLES
    : user?.role === "Manager"
      ? LOGIN_ROLES.filter((r) => r.value === "Employee")
      : LOGIN_ROLES.filter((r) => r.value !== "HR");

  // Reference data
  const [departments,  setDepartments]  = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches,     setBranches]     = useState([]);
  const [refsLoading,  setRefsLoading]  = useState(true);

  // Step control
  const [step, setStep] = useState(0);

  // ── Step 1: Personal ─────────────────────────────────────────
  const [photo,      setPhoto]      = useState("");
  const [firstName,  setFirstName]  = useState("");
  const [lastName,   setLastName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [gender,     setGender]     = useState("prefer_not_say");

  // ── Step 2: Job ──────────────────────────────────────────────
  const [joiningDate,     setJoiningDate]     = useState("");
  const [departmentId,    setDepartmentId]    = useState("");   // primary (first selected)
  const [departmentName,  setDepartmentName]  = useState("");
  const [departmentIds,   setDepartmentIds]   = useState([]);   // multi-select array
  const [departmentNames, setDepartmentNames] = useState([]);   // labels for display
  const [designationId,   setDesignationId]   = useState("");
  const [designationName, setDesignationName] = useState("");
  const [branchId,        setBranchId]        = useState("");
  const [branchName,      setBranchName]      = useState("");
  const [employmentType,  setEmploymentType]  = useState("full-time");
  const [workMode,        setWorkMode]        = useState("office");
  const [allowRemotePunch,setAllowRemotePunch]= useState(false);
  const [datePickerOpen,  setDatePickerOpen]  = useState(false);

  // ── Step 3: Salary ───────────────────────────────────────────
  const [basicSalary,  setBasicSalary]  = useState("");
  const [hra,          setHra]          = useState("");
  const [ta,           setTa]           = useState("");
  const [otherAllow,   setOtherAllow]   = useState("");
  const [pf,           setPf]           = useState("");
  const [tax,          setTax]          = useState("");
  const [otherDeduct,  setOtherDeduct]  = useState("");

  // ── Step 3: Leaves (Leave Balance) ───────────────────────────
  const [casualLeaves, setCasualLeaves] = useState("0");
  const [sickLeaves,   setSickLeaves]   = useState("0");
  const [annualLeaves, setAnnualLeaves] = useState("0");
  const [unpaidLeaves, setUnpaidLeaves] = useState("0");

  // ── Step 4: Access ───────────────────────────────────────────
  const [loginRole, setLoginRole] = useState("Employee");

  // Pickers / modals
  const [modal,    setModal]    = useState(null); // "department"|"designation"|"branch"|"workMode"
  const [addingNew, setAddingNew] = useState(null);

  // Form state
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => { loadRefs(); }, []);

  const loadRefs = async () => {
    setRefsLoading(true);
    try {
      const [d, des, b] = await Promise.all([getDepartmentsApi(), getDesignationsApi(), getBranchesApi()]);
      
      let fetchedDepts = d.data.departments || [];
      if (user?.role === "Manager") {
        const primaryDeptId = user.departmentId?._id || user.departmentId;
        const allowedDeptIds = (user.accessibleDepartments || []).map(dept => dept._id || dept);
        
        const managerDeptIds = [];
        if (primaryDeptId) managerDeptIds.push(primaryDeptId.toString());
        allowedDeptIds.forEach(id => {
          if (id) managerDeptIds.push(id.toString());
        });

        fetchedDepts = fetchedDepts.filter(dept => managerDeptIds.includes((dept._id || dept).toString()));
      }

      setDepartments(fetchedDepts);
      setDesignations(des.data.designations || []);
      setBranches(b.data.branches       || []);
    } catch { setError("Failed to load reference data"); }
    finally { setRefsLoading(false); }
  };

  const filteredDesignations = departmentIds.length > 0
    ? designations.filter((d) => {
        const dId = d.departmentId?._id || d.departmentId;
        return departmentIds.includes(dId);
      })
    : designations;

  const handleNewItemSaved = (item, type) => {
    if (!item) return;
    const itemId = item._id || item.id;
    if (type === "department") {
      setDepartments((p) => [...p.filter(d => (d._id || d.id) !== itemId), item]);
      setDepartmentId(itemId);
      setDepartmentName(item.name);
      setDepartmentIds((p) => [...p.filter(id => id !== itemId), itemId]);
      setDepartmentNames((p) => [...p.filter(n => n !== item.name), item.name]);
      setDesignationId("");
      setDesignationName("");
    } else if (type === "designation") {
      setDesignations((p) => [...p.filter(d => (d._id || d.id) !== itemId), item]);
      setDesignationId(itemId);
      setDesignationName(item.name);
      if (item.departmentId) {
        const dId = item.departmentId._id || item.departmentId.id || item.departmentId;
        const dObj = departments.find((d) => (d._id || d.id) === dId);
        if (dObj) {
          setDepartmentId(dObj._id || dObj.id);
          setDepartmentName(dObj.name);
          setDepartmentIds((p) => (p.includes(dObj._id || dObj.id) ? p : [...p, dObj._id || dObj.id]));
          setDepartmentNames((p) => (p.includes(dObj.name) ? p : [...p, dObj.name]));
        }
      }
    } else if (type === "branch") {
      setBranches((p) => [...p.filter(b => (b._id || b.id) !== itemId), item]);
      setBranchId(itemId);
      setBranchName(item.branchName || item.name);
    }
    setAddingNew(null);
    setModal(null);
  };

  // ── Computed salary totals ────────────────────────────────────
  const n = (v) => parseFloat(v) || 0;
  const grossSalary  = n(basicSalary) + n(hra) + n(ta) + n(otherAllow);
  const totalDeduct  = n(pf) + n(tax) + n(otherDeduct);
  const netSalary    = grossSalary - totalDeduct;

  // ── Validation per step ───────────────────────────────────────
  const validateStep = (s) => {
    if (s === 0) {
      if (!firstName.trim())      return "First name is required";
      if (!lastName.trim())       return "Last name is required";
      if (!email.trim())          return "Email is required";
      if (!/\S+@\S+\.\S+/.test(email)) return "Enter a valid email address";
      if (!phone.trim())          return "Phone number is required";
      if (!/^\d{10}$/.test(phone.trim())) return "Phone must be exactly 10 digits";
    }
    if (s === 1) {
      if (!joiningDate.trim())    return "Joining date is required";
      if (!isValidDDMMYYYY(joiningDate)) return "Joining date format must be DD/MM/YYYY";
      if (departmentIds.length === 0 && !departmentId) return "Please select at least one department";
    }
    if (s === 2) {
      if (!basicSalary.trim())    return "Basic salary is required";
      if (isNaN(parseFloat(basicSalary)) || parseFloat(basicSalary) <= 0) return "Basic salary must be a positive number";
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  };

  const handleBack = () => { setError(""); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        phone:     phone.trim(),
        photo:     photo || "",
        gender,
        joiningDate:    parseDDMMYYYYToISO(joiningDate.trim()),
        departmentId: departmentIds.length > 0 ? departmentIds[0] : departmentId,
        departmentIds: departmentIds.length > 0 ? departmentIds : (departmentId ? [departmentId] : []),
        designationId,
        branchId,
        employmentType,
        workMode,
        allowRemotePunch,
        loginRole,
        salary:        basicSalary ? parseFloat(basicSalary) : 0,
        salaryDetails: {
          basic:         n(basicSalary),
          hra:           n(hra),
          travelAllowance: n(ta),
          otherAllowances: n(otherAllow),
          grossSalary,
          pf:            n(pf),
          incomeTax:     n(tax),
          otherDeductions: n(otherDeduct),
          netSalary,
        },
        leaveBalance: {
          casual: parseInt(casualLeaves) || 0,
          sick: parseInt(sickLeaves) || 0,
          annual: parseInt(annualLeaves) || 0,
          unpaid: parseInt(unpaidLeaves) || 0,
        },
        address: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        documents: { aadhaar: "", pan: "", offerLetter: "" },
      };
      const { data } = await createEmployeeApi(payload);
      Alert.alert(
        "✅ Employee Created!",
        `Employee ID: ${data.employee?.employeeCode || "—"}\nName: ${data.employee?.firstName} ${data.employee?.lastName}\n\nLogin Credentials:\nEmail: ${data.login?.email}\nTemp Password: ${data.login?.temporaryPassword}\nRole: ${data.login?.role}\n\n⚠️ Ask employee to change password on first login.`,
        [{ text: "Done", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  // ── Modal helpers ─────────────────────────────────────────────
  const getModalTitle = () =>
    ({ department: "Department", designation: "Designation", branch: "Branch", workMode: "Work Mode", loginRole: "Role" }[modal] || "Select");
  const getModalData = () =>
    modal === "department"  ? departments :
    modal === "designation" ? filteredDesignations :
    modal === "branch"      ? branches :
    modal === "loginRole"   ? availableRoles :
    modal === "workMode"    ? WORK_MODES : [];
  const canAddNew = user?.role !== "Manager" && ["department", "designation", "branch"].includes(modal);

  // ── Render step content ───────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── STEP 1: Personal ─────────────────────────────────────
      case 0:
        return (
          <View>
            <PhotoPickerField photo={photo} onPhotoChange={setPhoto} label="Profile Photo (Optional)" />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Field label="First Name" required>
                  <SInput placeholder="John" value={firstName} onChangeText={setFirstName} />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Field label="Last Name" required>
                  <SInput placeholder="Doe" value={lastName} onChangeText={setLastName} />
                </Field>
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Field label="Email Address" required>
                  <SInput placeholder="john@company.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </Field>
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Field label="Phone Number" required>
                  <SInput placeholder="9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
                </Field>
              </View>
            </View>

            <Field label="Gender">
              <ChipGroup
                options={[
                  { value: "male",           label: "Male"         },
                  { value: "female",         label: "Female"       },
                  { value: "other",          label: "Other"        },
                  { value: "prefer_not_say", label: "Prefer not to say" },
                ]}
                value={gender}
                onChange={setGender}
              />
            </Field>
          </View>
        );

      // ── STEP 2: Job ──────────────────────────────────────────
      case 1:
        return (
          <View>
            <Field label="Joining Date" required>
              <TouchableOpacity style={styles.datePicker} onPress={() => setDatePickerOpen(true)}>
                <Ionicons name="calendar-outline" size={18} color={joiningDate ? C.primary : C.muted} style={{ marginRight: 8 }} />
                <Text style={[styles.pickerText, !joiningDate && styles.pickerPh]}>
                  {joiningDate || "DD/MM/YYYY"}
                </Text>
                <Ionicons name="chevron-down" size={14} color={C.muted} />
              </TouchableOpacity>
            </Field>


            {/* ── Multi-Select Department ─────────────────────── */}
            <Field label="Department" required>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => { setAddingNew(null); setModal("department"); }}
                activeOpacity={0.75}
              >
                <Ionicons name="business-outline" size={16} color={departmentIds.length > 0 ? C.primary : C.muted} style={{ marginRight: 8 }} />
                <Text style={[styles.pickerText, departmentIds.length === 0 && styles.pickerPh]} numberOfLines={1}>
                  {departmentIds.length > 0 ? `${departmentIds.length} selected` : "Tap to select departments"}
                </Text>
                <Ionicons name="chevron-down" size={14} color={C.muted} />
              </TouchableOpacity>
              {departmentNames.length > 0 && (
                <View style={styles.chipRow}>
                  {departmentNames.map((name, idx) => (
                    <TouchableOpacity
                      key={departmentIds[idx]}
                      style={styles.selectedChip}
                      onPress={() => {
                        const newIds = departmentIds.filter((_, i) => i !== idx);
                        const newNames = departmentNames.filter((_, i) => i !== idx);
                        setDepartmentIds(newIds);
                        setDepartmentNames(newNames);
                        setDepartmentId(newIds[0] || "");
                        setDepartmentName(newNames[0] || "");
                      }}
                    >
                      <Text style={styles.selectedChipText}>{name}</Text>
                      <Ionicons name="close-circle" size={14} color={C.primary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>

            <PickerRow
              label="Role" required
              display={availableRoles.find(r => r.value === loginRole)?.label || loginRole}
              placeholder="Select role"
              icon="people-outline"
              onPress={() => { setAddingNew(null); setModal("loginRole"); }}
            />
            <PickerRow
              label="Branch"
              display={branchName}
              placeholder="Select branch"
              icon="location-outline"
              onPress={() => { setAddingNew(null); setModal("branch"); }}
            />

            <Field label="Employment Type">
              <ChipGroup options={EMPLOYMENT_TYPES} value={employmentType} onChange={setEmploymentType} />
            </Field>

            <PickerRow
              label="Work Mode"
              display={labelFor(WORK_MODES, workMode)}
              icon="laptop-outline"
              onPress={() => setModal("workMode")}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginTop: 10 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 }}>Allow Remote Punch</Text>
                <Text style={{ fontSize: 12, color: C.sub }}>Bypass office location restriction for field work.</Text>
              </View>
              <Switch
                trackColor={{ false: "#cbd5e1", true: "#34d399" }}
                thumbColor={allowRemotePunch ? "#10b981" : "#f1f5f9"}
                ios_backgroundColor="#cbd5e1"
                onValueChange={setAllowRemotePunch}
                value={allowRemotePunch}
              />
            </View>
          </View>
        );

      // ── STEP 3: Salary ───────────────────────────────────────
      case 2:
        return (
          <View>
            {/* Earnings */}
            <View style={styles.salarySection}>
              <View style={styles.salarySectionHeader}>
                <Ionicons name="trending-up-outline" size={16} color={C.green} style={{ marginRight: 6 }} />
                <Text style={styles.salarySectionTitle}>Earnings (Monthly)</Text>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Field label="Basic Salary" required>
                    <SInput placeholder="0.00" value={basicSalary} onChangeText={setBasicSalary} keyboardType="decimal-pad" />
                  </Field>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Field label="HRA">
                    <SInput placeholder="0.00" value={hra} onChangeText={setHra} keyboardType="decimal-pad" />
                  </Field>
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Field label="Travel Allowance">
                    <SInput placeholder="0.00" value={ta} onChangeText={setTa} keyboardType="decimal-pad" />
                  </Field>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Field label="Other Allowances">
                    <SInput placeholder="0.00" value={otherAllow} onChangeText={setOtherAllow} keyboardType="decimal-pad" />
                  </Field>
                </View>
              </View>
            </View>

            {/* Deductions */}
            <View style={[styles.salarySection, { marginTop: 12 }]}>
              <View style={styles.salarySectionHeader}>
                <Ionicons name="trending-down-outline" size={16} color={C.red} style={{ marginRight: 6 }} />
                <Text style={[styles.salarySectionTitle, { color: C.red }]}>Deductions (Monthly)</Text>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Field label="PF">
                    <SInput placeholder="0.00" value={pf} onChangeText={setPf} keyboardType="decimal-pad" />
                  </Field>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Field label="Income Tax">
                    <SInput placeholder="0.00" value={tax} onChangeText={setTax} keyboardType="decimal-pad" />
                  </Field>
                </View>
              </View>

              <Field label="Other Deductions">
                <SInput placeholder="0.00" value={otherDeduct} onChangeText={setOtherDeduct} keyboardType="decimal-pad" />
              </Field>
            </View>

            {/* Summary */}
            <View style={styles.salarySummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gross Salary</Text>
                <Text style={styles.summaryValue}>₹ {grossSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Deductions</Text>
                <Text style={[styles.summaryValue, { color: C.red }]}>- ₹ {totalDeduct.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryNetRow]}>
                <Text style={styles.summaryNetLabel}>Net Take-Home</Text>
                <Text style={styles.summaryNetValue}>₹ {netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>

            {/* Leave Balance */}
            <View style={[styles.salarySection, { marginTop: 16 }]}>
              <View style={styles.salarySectionHeader}>
                <Ionicons name="calendar-outline" size={16} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={styles.salarySectionTitle}>Annual Leave Quotas</Text>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Field label="Casual Leaves">
                    <SInput placeholder="e.g. 0" value={casualLeaves} onChangeText={setCasualLeaves} keyboardType="numeric" />
                  </Field>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Field label="Sick Leaves">
                    <SInput placeholder="e.g. 0" value={sickLeaves} onChangeText={setSickLeaves} keyboardType="numeric" />
                  </Field>
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Field label="Annual Leaves">
                    <SInput placeholder="e.g. 0" value={annualLeaves} onChangeText={setAnnualLeaves} keyboardType="numeric" />
                  </Field>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Field label="Unpaid Leaves">
                    <SInput placeholder="e.g. 0" value={unpaidLeaves} onChangeText={setUnpaidLeaves} keyboardType="numeric" />
                  </Field>
                </View>
              </View>
            </View>
          </View>
        );

      // ── STEP 4: Access ───────────────────────────────────────
      case 3:
        return (
          <View>
            <View style={styles.accessInfo}>
              <Ionicons name="information-circle-outline" size={18} color={C.primary} style={{ marginTop: 1, marginRight: 8 }} />
              <Text style={styles.accessInfoText}>
                A temporary password will be auto-generated and shared after account creation. Employee must change it on first login.
              </Text>
            </View>

            {/* Review summary */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Review Summary</Text>
              {[
                ["Name",        `${firstName} ${lastName}`],
                ["Email",       email],
                ["Phone",       phone],
                ["Role",        availableRoles.find(r => r.value === loginRole)?.label || loginRole],
                ["Department",  departmentName],
                ["Branch",      branchName],
                ["Joining",     joiningDate],
                ["Type",        labelFor(EMPLOYMENT_TYPES, employmentType)],
                ["Net Salary",  `₹ ${netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}/mo`],
              ].map(([k, v]) => (
                <View key={k} style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>{k}</Text>
                  <Text style={styles.reviewVal} numberOfLines={1}>{v || "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      default: return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Top Header ─────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Add New Employee</Text>
          <Text style={styles.topSub}>Step {step + 1} of {STEPS.length} — {STEPS[step].label}</Text>
        </View>
      </View>

      {/* ── Step Indicator ─────────────────────────────────── */}
      <View style={styles.stepBar}>
        <StepIndicator steps={STEPS} current={step} />
      </View>

      {/* ── Form Body ──────────────────────────────────────── */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name={STEPS[step].icon} size={18} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>{STEPS[step].label} Information</Text>
          </View>
          {renderStep()}
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={C.red} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navRow}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backBtnRow} onPress={handleBack}>
              <Ionicons name="chevron-back" size={16} color={C.sub} style={{ marginRight: 4 }} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}

          {step < STEPS.length - 1 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: C.green, paddingHorizontal: 24 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.nextBtnText}>Create Employee</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* ── Date Picker Modal ─────────────────────────── */}
      <DatePickerModal
        visible={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(d) => setJoiningDate(d)}
        initialDate={joiningDate}
      />

      {/* ══════════════ PICKER BOTTOM SHEET ══════════════════ */}
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            {/* Sheet header */}
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {modal === "department"
                  ? `Select Departments (${departmentIds.length} selected)`
                  : canAddNew ? `Select ${getModalTitle()}` : getModalTitle()}
              </Text>
              <TouchableOpacity onPress={() => { setModal(null); setAddingNew(null); }}>
                <Ionicons name="close" size={22} color={C.sub} />
              </TouchableOpacity>
            </View>

            {refsLoading && !addingNew && (
              <View style={styles.sheetLoading}>
                <ActivityIndicator color={C.primary} />
                <Text style={styles.sheetLoadingText}>Loading…</Text>
              </View>
            )}

            {addingNew ? (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 16 }}>
                <AddNewForm
                  type={addingNew}
                  departments={departments}
                  onSave={handleNewItemSaved}
                  onCancel={() => setAddingNew(null)}
                />
              </ScrollView>
            ) : (
              <>
                {canAddNew && (
                  <TouchableOpacity style={styles.addNewBtn} onPress={() => setAddingNew(modal)}>
                    <Ionicons name="add-circle-outline" size={18} color={C.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.addNewBtnText}>+ Add New {getModalTitle()}</Text>
                  </TouchableOpacity>
                )}
                <FlatList
                  data={getModalData()}
                  keyExtractor={(item, i) => item._id || item.value || String(i)}
                  renderItem={({ item }) => {
                    const sel =
                      (modal === "department"  && departmentIds.includes(item._id)) ||
                      (modal === "designation" && item._id === designationId) ||
                      (modal === "branch"      && item._id === branchId) ||
                      (modal === "loginRole"   && item.value === loginRole) ||
                      (modal === "workMode"    && item.value === workMode);
                    return (
                      <TouchableOpacity
                        style={[styles.sheetItem, sel && styles.sheetItemActive]}
                        onPress={() => {
                          if (modal === "department") {
                            // Multi-select: toggle
                            if (departmentIds.includes(item._id)) {
                              const newIds = departmentIds.filter(id => id !== item._id);
                              const newNames = departmentNames.filter((_, i) => departmentIds[i] !== item._id);
                              setDepartmentIds(newIds);
                              setDepartmentNames(newNames);
                              setDepartmentId(newIds[0] || "");
                              setDepartmentName(newNames[0] || "");
                            } else {
                              const newIds = [...departmentIds, item._id];
                              const newNames = [...departmentNames, item.name];
                              setDepartmentIds(newIds);
                              setDepartmentNames(newNames);
                              setDepartmentId(newIds[0]);
                              setDepartmentName(newNames[0]);
                            }
                            return; // keep modal open for multi-select
                          } else if (modal === "designation") {
                            setDesignationId(item._id); setDesignationName(item.name);
                            if (!departmentId && item.departmentId) {
                              const dId = item.departmentId._id || item.departmentId;
                              const dObj = departments.find((d) => d._id === dId);
                              if (dObj) { setDepartmentId(dObj._id); setDepartmentName(dObj.name); }
                            }
                          } else if (modal === "branch") {
                            setBranchId(item._id); setBranchName(item.branchName);
                          } else if (modal === "loginRole") {
                            setLoginRole(item.value);
                          } else if (modal === "workMode") {
                            setWorkMode(item.value);
                          }
                          setModal(null);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sheetItemText, sel && styles.sheetItemTextActive]}>
                            {item.label || item.name || item.branchName}
                          </Text>
                          {modal === "designation" && item.departmentId?.name && (
                            <Text style={styles.sheetItemSub}>Dept: {item.departmentId.name}</Text>
                          )}
                          {modal === "branch" && (item.city || item.address) && (
                            <Text style={styles.sheetItemSub}>{[item.city, item.address].filter(Boolean).join(" · ")}</Text>
                          )}
                        </View>
                        {sel && <Ionicons name="checkmark-circle" size={18} color={C.primary} />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    !refsLoading && (
                      <View style={styles.emptyBox}>
                        <Ionicons name="folder-open-outline" size={42} color="#d1d5db" />
                        <Text style={styles.emptyText}>
                          {canAddNew ? `No ${modal}s yet. Tap "+ Add New" above.` : "No options available"}
                        </Text>
                      </View>
                    )
                  }
                />
                <TouchableOpacity style={styles.sheetCancel} onPress={() => { setModal(null); setAddingNew(null); }}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn:  { marginRight: 12, padding: 4 },
  topTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: C.text },
  topSub:   { fontSize: 11, color: C.muted, marginTop: 2, fontFamily: FONTS.body },

  // Step bar
  stepBar: {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stepRow:  { flexDirection: "row", alignItems: "center" },
  stepItem: { alignItems: "center", width: 60 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.border,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  stepDotActive: { backgroundColor: C.primary },
  stepDotDone:   { backgroundColor: C.green   },
  stepNum:   { fontSize: 11, fontFamily: FONTS.bodyBold, color: C.muted },
  stepLabel: { fontSize: 9.5, color: C.muted, fontFamily: FONTS.bodySemiBold, textAlign: "center" },
  stepLabelActive: { color: C.primary },
  stepLabelDone:   { color: C.green   },
  stepLine: {
    flex: 1, height: 2, backgroundColor: C.border, marginBottom: 18,
  },
  stepLineDone: { backgroundColor: C.green },

  // Body
  body: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  cardIconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.pBg,
    alignItems: "center", justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: { fontSize: 14, fontFamily: FONTS.displayBold, color: C.text },

  // Fields
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 10, fontFamily: FONTS.bodyBold, color: C.sub,
    letterSpacing: 0.4, marginBottom: 7, textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: C.text,
    flexDirection: "row",
    alignItems: "center",
  },
  row: { flexDirection: "row" },

  // Picker
  picker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pickerText: { flex: 1, fontSize: 14, color: C.text, fontFamily: FONTS.bodyMedium },
  pickerPh:   { color: C.muted, fontFamily: FONTS.body },

  // Date picker
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive:    { backgroundColor: C.pBg, borderColor: C.pBorder },
  chipText:      { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: C.sub  },
  // Selected department tags shown below picker
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.pBg,
    borderWidth: 1,
    borderColor: C.pBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginTop: 6,
  },
  selectedChipText: { fontSize: 12, fontFamily: FONTS.bodySemiBold, color: C.primary },
  chipTextActive:{ color: C.primary },

  // Salary
  salarySection: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  salarySectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  salarySectionTitle:  { fontSize: 12, fontFamily: FONTS.bodyBold, color: C.green },
  salarySummary: {
    backgroundColor: C.card,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: C.pBorder,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryLabel: { fontSize: 13, color: C.sub,  fontFamily: FONTS.bodyMedium },
  summaryValue: { fontSize: 13, color: C.text, fontFamily: FONTS.bodyBold },
  summaryNetRow:   { backgroundColor: C.pBg, borderBottomWidth: 0 },
  summaryNetLabel: { fontSize: 14, color: C.primary, fontFamily: FONTS.bodyBold },
  summaryNetValue: { fontSize: 16, color: C.primary, fontFamily: FONTS.displayBold },

  // Access
  accessInfo: {
    flexDirection: "row",
    backgroundColor: C.pBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.pBorder,
  },
  accessInfoText: { flex: 1, fontSize: 12, color: C.sub, fontFamily: FONTS.bodyMedium, lineHeight: 18 },

  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
  },
  roleCardActive: { borderColor: C.pBorder, backgroundColor: C.pBg },
  roleIcon:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.border, alignItems: "center", justifyContent: "center", marginRight: 12 },
  roleIconActive: { backgroundColor: C.primary },
  roleLabel:      { fontSize: 14, fontFamily: FONTS.bodyBold, color: C.text, marginBottom: 2 },
  roleLabelActive:{ color: C.primary },
  roleDesc:       { fontSize: 11, color: C.muted, fontFamily: FONTS.bodyMedium },

  // Review
  reviewCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  reviewTitle: { fontSize: 12, fontFamily: FONTS.bodyBold, color: C.sub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  reviewKey: { fontSize: 12, color: C.muted, fontFamily: FONTS.bodyMedium },
  reviewVal: { fontSize: 12, color: C.text,  fontFamily: FONTS.bodyBold, maxWidth: "60%", textAlign: "right" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.redBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { flex: 1, fontSize: 13, color: C.red, fontFamily: FONTS.bodySemiBold },

  // Nav buttons
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 },
  backBtnRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  backBtnText:{ fontSize: 14, fontFamily: FONTS.bodyBold, color: C.sub },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nextBtnText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: "#fff" },

  // Bottom Sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", paddingBottom: 20 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 10, marginBottom: 6 },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 15, fontFamily: FONTS.displayBold, color: C.text },
  sheetLoading: { flexDirection: "row", alignItems: "center", padding: 16 },
  sheetLoadingText: { marginLeft: 10, color: C.sub, fontSize: 14 },

  addNewBtn: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginVertical: 10,
    padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.pBorder,
    borderStyle: "dashed", backgroundColor: C.pBg,
  },
  addNewBtnText: { fontSize: 14, fontFamily: FONTS.bodyBold, color: C.primary },

  sheetItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sheetItemActive: { backgroundColor: C.pBg },
  sheetItemText:   { fontSize: 14, color: C.text,    fontFamily: FONTS.body },
  sheetItemTextActive: { color: C.primary, fontFamily: FONTS.bodyBold },
  sheetItemSub:    { fontSize: 11, color: C.muted,   marginTop: 2 },

  emptyBox:  { alignItems: "center", padding: 32 },
  emptyText: { marginTop: 10, fontSize: 13, color: C.muted, textAlign: "center" },

  sheetCancel: { alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border, marginTop: 4 },
  sheetCancelText: { fontSize: 14, color: C.sub, fontFamily: FONTS.bodySemiBold },

  // Add New inline form
  addForm: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  addFormHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addFormTitle:  { fontSize: 14, fontFamily: FONTS.displayBold, color: C.text },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.primary, borderRadius: 10,
    paddingVertical: 11, marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontFamily: FONTS.bodyBold, fontSize: 14 },

  // Sub-modal (dept for designation)
  subOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  subBox:     { backgroundColor: C.card, borderRadius: 16, width: "100%", maxHeight: 380, padding: 16, elevation: 8 },
  subTitle:   { fontSize: 15, fontFamily: FONTS.displayBold, color: C.text, marginBottom: 10 },
  subItem:    { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  subItemText:{ fontSize: 14, color: C.text, fontFamily: FONTS.body },
  subCancel:  { marginTop: 10, alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  subCancelText: { fontSize: 14, color: C.sub, fontFamily: FONTS.bodySemiBold },
});

export default AddEmployeeScreen;
