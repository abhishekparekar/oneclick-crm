import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import PhotoPickerField from "../../components/PhotoPickerField";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import AppDatePicker from "../../components/AppDatePicker";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";
import { getDepartmentsApi, getDesignationsApi, getBranchesApi, getLeaveBalanceApi, updateLeaveBalanceApi } from "../../api/companyService";
import { getEmployeeByIdApi, updateEmployeeApi } from "../../api/employeeService";
import { useAuth } from "../../context/AuthContext";
import {
  GENDERS,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  EMPLOYEE_STATUSES,
  LOGIN_ROLES,
} from "./employeeConstants";
import { formatDateToDDMMYYYY, parseDDMMYYYYToISO, isValidDDMMYYYY } from "../../utils/dateFormatter";

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

const labelFor = (options, value) => options.find((o) => o.value === value)?.label || "";

const fmtDate = (d) => {
  return formatDateToDDMMYYYY(d) || "";
};

// ─── Field Label ──────────────────────────────────────────────
const FieldLabel = ({ text, required }) => (
  <Text style={styles.fieldLabel}>
    {text}
    {required && <Text style={{ color: C.red }}> *</Text>}
  </Text>
);

// ─── Text Field Wrapper ───────────────────────────────────────
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

const EditEmployeeScreen = ({ route, navigation }) => {
  const { employeeId } = route.params;
  const { user } = useAuth();
  const availableRoles = user?.role === "CompanyAdmin"
    ? LOGIN_ROLES
    : user?.role === "Manager"
      ? LOGIN_ROLES.filter((r) => r.value === "Employee")
      : LOGIN_ROLES.filter((r) => r.value !== "HR");

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches] = useState([]);

  const [initialLoad, setInitialLoad] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState("");
  const [gender, setGender] = useState("prefer_not_say");
  const [dateOfBirth, setDob] = useState("");
  const [joiningDate, setJoining] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [workMode, setWorkMode] = useState("office");
  const [allowRemotePunch, setAllowRemotePunch] = useState(false);
  const [salary, setSalary] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyName] = useState("");
  const [emergencyContactPhone, setEmergencyPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [docAadhaar, setDocAadhaar] = useState("");
  const [loginRole, setLoginRole] = useState("Employee");
  const [docPan, setDocPan] = useState("");
  const [docOffer, setDocOffer] = useState("");

  const [leaveBalanceLoaded, setLeaveBalanceLoaded] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({
    casual: 0,
    sick: 0,
    annual: 0,
    unpaid: 0,
  });

  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, [employeeId]);

  const loadAll = async () => {
    try {
      const [depRes, desRes, brRes, empRes, leaveRes] = await Promise.all([
        getDepartmentsApi(),
        getDesignationsApi(),
        getBranchesApi(),
        getEmployeeByIdApi(employeeId),
        getLeaveBalanceApi(employeeId).catch(() => null)
      ]);

      let fetchedDepts = depRes.data.departments || [];
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
      setDesignations(desRes.data.designations || []);
      setBranches(brRes.data.branches || []);

      if (leaveRes?.data?.balance) {
        setLeaveBalance({
          casual: leaveRes.data.balance.casual ?? 0,
          sick: leaveRes.data.balance.sick ?? 0,
          annual: leaveRes.data.balance.annual ?? 0,
          unpaid: leaveRes.data.balance.unpaid ?? 0,
        });
        setLeaveBalanceLoaded(true);
      }

      const e = empRes.data.employee;
      setFirstName(e.firstName || "");
      setLastName(e.lastName || "");
      setEmail(e.email || "");
      setPhone(e.phone || "");
      setPhoto(e.photo || "");
      setGender(e.gender || "prefer_not_say");
      setDob(fmtDate(e.dateOfBirth));
      setJoining(fmtDate(e.joiningDate));
      setDepartmentId(e.departmentId?._id || e.departmentId || "");
      setDepartmentName(e.departmentId?.name || "");
      setDesignationId(e.designationId?._id || e.designationId || "");
      setDesignationName(e.designationId?.name || "");
      setBranchId(e.branchId?._id || e.branchId || "");
      setBranchName(e.branchId?.branchName || "");
      setEmploymentType(e.employmentType || "full-time");
      setWorkMode(e.workMode || "office");
      setAllowRemotePunch(e.allowRemotePunch || false);
      setSalary(e.salary != null ? String(e.salary) : "");
      setAddress(e.address || "");
      setEmergencyName(e.emergencyContactName || "");
      setEmergencyPhone(e.emergencyContactPhone || "");
      setStatus(e.status || "active");
      setDocAadhaar(e.documents?.aadhaar || "");
      setLoginRole(e.role || "Employee");
      setDocPan(e.documents?.pan || "");
      setDocOffer(e.documents?.offerLetter || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load employee");
    } finally {
      setInitialLoad(false);
    }
  };

  const filteredDesignations = departmentId
    ? designations.filter(
        (d) => d.departmentId?._id === departmentId || d.departmentId === departmentId
      )
    : designations;

  const submit = async () => {
    if (!firstName.trim()) { setError("First name is required"); return; }
    if (!lastName.trim()) { setError("Last name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (dateOfBirth && !isValidDDMMYYYY(dateOfBirth)) {
      setError("Date of birth must be in DD/MM/YYYY format");
      return;
    }
    if (joiningDate && !isValidDDMMYYYY(joiningDate)) {
      setError("Joining date must be in DD/MM/YYYY format");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await updateEmployeeApi(employeeId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        photo: photo.trim() || null,
        gender,
        dateOfBirth: dateOfBirth ? parseDDMMYYYYToISO(dateOfBirth) : null,
        joiningDate: joiningDate ? parseDDMMYYYYToISO(joiningDate) : null,
        departmentId: departmentId || null,
        branchId: branchId || null,
        employmentType,
        workMode,
        allowRemotePunch,
        salary: salary === "" ? null : parseFloat(salary),
        address: address.trim() || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        loginRole: loginRole,
        status,
        documents: {
          aadhaar: docAadhaar.trim() || null,
          pan: docPan.trim() || null,
          offerLetter: docOffer.trim() || null,
        },
      });

      if (leaveBalanceLoaded) {
        await updateLeaveBalanceApi(employeeId, {
          casual: parseInt(leaveBalance.casual) || 0,
          sick: parseInt(leaveBalance.sick) || 0,
          annual: parseInt(leaveBalance.annual) || 0,
          unpaid: parseInt(leaveBalance.unpaid) || 0,
        });
      }

      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update employee");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) return <Loader />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>Edit Employee Profile</Text>
          <Text style={styles.topSub}>Update details for {firstName} {lastName}</Text>
        </View>
      </View>

      <KeyboardAwareScrollView 
        contentContainerStyle={styles.body} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        
        {/* Profile photo card */}
        <View style={styles.card}>
          <PhotoPickerField
            photo={photo}
            onPhotoChange={setPhoto}
            label="PROFILE PHOTO"
          />
        </View>

        {/* Info Form Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="person-outline" size={16} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          {/* First & Last name in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="First Name *" required>
                <SInput placeholder="First Name" value={firstName} onChangeText={setFirstName} />
              </Field>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="Last Name *" required>
                <SInput placeholder="Last Name" value={lastName} onChangeText={setLastName} />
              </Field>
            </View>
          </View>

          {/* Email & Phone in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Email *" required>
                <SInput
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="Phone">
                <SInput placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </Field>
            </View>
          </View>

          {/* DOB & Gender in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <AppDatePicker label="Date of birth" value={dateOfBirth} onChangeText={setDob} placeholder="DD/MM/YYYY" />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <PickerRow
                label="Gender"
                display={labelFor(GENDERS, gender)}
                icon="person-outline"
                onPress={() => setModal("gender")}
              />
            </View>
          </View>
        </View>

        {/* Job Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="briefcase-outline" size={16} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>Job & Location Information</Text>
          </View>

          {/* Joining Date & Employment Type in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <AppDatePicker label="Joining Date" value={joiningDate} onChangeText={setJoining} placeholder="DD/MM/YYYY" />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <PickerRow
                label="Employment Type"
                display={labelFor(EMPLOYMENT_TYPES, employmentType)}
                icon="time-outline"
                onPress={() => setModal("employmentType")}
              />
            </View>
          </View>

          {/* Department & Role in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <PickerRow
                label="Department"
                display={departmentName}
                icon="business-outline"
                onPress={() => setModal("department")}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <PickerRow
                label="Role"
                display={availableRoles.find(r => r.value === loginRole)?.label || loginRole}
                icon="people-outline"
                placeholder="Select role"
                onPress={() => setModal("loginRole")}
              />
            </View>
          </View>

          {/* Branch & Work Mode in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <PickerRow
                label="Branch"
                display={branchName}
                icon="location-outline"
                onPress={() => setModal("branch")}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <PickerRow
                label="Work Mode"
                display={labelFor(WORK_MODES, workMode)}
                icon="laptop-outline"
                onPress={() => setModal("workMode")}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginTop: 4 }}>
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

        {/* Salary & Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="cash-outline" size={16} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>Compensation & Status</Text>
          </View>

          {/* Salary & Status in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Salary">
                <SInput placeholder="Basic monthly salary" value={salary} onChangeText={setSalary} keyboardType="decimal-pad" />
              </Field>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <PickerRow
                label="Status"
                display={labelFor(EMPLOYEE_STATUSES, status)}
                icon="shield-outline"
                onPress={() => setModal("status")}
              />
            </View>
          </View>

          {/* Address full width */}
          <Field label="Address">
            <SInput placeholder="Current residential address" value={address} onChangeText={setAddress} />
          </Field>
        </View>

        {/* Leave Balance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="calendar-outline" size={16} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>Leave Balance</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Casual Leaves">
                <SInput
                  placeholder="e.g. 12"
                  value={String(leaveBalance.casual)}
                  onChangeText={(v) => setLeaveBalance((prev) => ({ ...prev, casual: v }))}
                  keyboardType="numeric"
                />
              </Field>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="Sick Leaves">
                <SInput
                  placeholder="e.g. 10"
                  value={String(leaveBalance.sick)}
                  onChangeText={(v) => setLeaveBalance((prev) => ({ ...prev, sick: v }))}
                  keyboardType="numeric"
                />
              </Field>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Annual Leaves">
                <SInput
                  placeholder="e.g. 15"
                  value={String(leaveBalance.annual)}
                  onChangeText={(v) => setLeaveBalance((prev) => ({ ...prev, annual: v }))}
                  keyboardType="numeric"
                />
              </Field>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="Unpaid Leaves">
                <SInput
                  placeholder="e.g. 0"
                  value={String(leaveBalance.unpaid)}
                  onChangeText={(v) => setLeaveBalance((prev) => ({ ...prev, unpaid: v }))}
                  keyboardType="numeric"
                />
              </Field>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>
            These values represent the employee's total annual leave quota.
          </Text>
        </View>

        {/* Emergency contact card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="call-outline" size={16} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>Emergency Contact</Text>
          </View>

          {/* Emergency contact name & phone in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Emergency Contact Name">
                <SInput placeholder="Contact name" value={emergencyContactName} onChangeText={setEmergencyName} />
              </Field>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="Emergency Contact Phone">
                <SInput placeholder="Contact phone" value={emergencyContactPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />
              </Field>
            </View>
          </View>
        </View>

        {/* Documents Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBg}>
              <Ionicons name="document-text-outline" size={16} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>Documents & Attachments</Text>
          </View>

          {/* Aadhaar & PAN in one row */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Field label="Aadhaar URL">
                <SInput placeholder="http://..." value={docAadhaar} onChangeText={setDocAadhaar} />
              </Field>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Field label="PAN URL">
                <SInput placeholder="http://..." value={docPan} onChangeText={setDocPan} />
              </Field>
            </View>
          </View>

          {/* Offer Letter URL full width */}
          <Field label="Offer Letter URL">
            <SInput placeholder="http://..." value={docOffer} onChangeText={setDocOffer} />
          </Field>
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={C.red} style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Buttons */}
        <View style={styles.btnContainer}>
          <AppButton title={loading ? "Saving changes..." : "Save changes"} onPress={submit} loading={loading} />
        </View>
      </KeyboardAwareScrollView>

      {/* Picker Selection Modals */}
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select {modal ? modal.charAt(0).toUpperCase() + modal.slice(1) : ""}</Text>
            <FlatList
              data={
                modal === "gender"
                  ? GENDERS
                  : modal === "department"
                    ? departments
                    : modal === "loginRole"
                      ? availableRoles
                      : modal === "branch"
                        ? branches
                        : modal === "employmentType"
                          ? EMPLOYMENT_TYPES
                          : modal === "workMode"
                            ? WORK_MODES
                            : modal === "status"
                              ? EMPLOYEE_STATUSES
                              : []
              }
              keyExtractor={(item, i) => item._id || item.value || String(i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    if (modal === "department") {
                      setDepartmentId(item._id);
                      setDepartmentName(item.name);
                    } else if (modal === "loginRole") {
                      setLoginRole(item.value);
                    } else if (modal === "branch") {
                      setBranchId(item._id);
                      setBranchName(item.branchName);
                    } else if (item.value !== undefined) {
                      if (modal === "gender") setGender(item.value);
                      if (modal === "employmentType") setEmploymentType(item.value);
                      if (modal === "workMode") setWorkMode(item.value);
                      if (modal === "status") setStatus(item.value);
                    }
                    setModal(null);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {item.label || item.name || item.branchName}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <AppButton title="Cancel" variant="outline" onPress={() => setModal(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 48 },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f1f5",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  topTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: "#0f172a",
  },
  topSub: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: FONTS.bodyMedium,
    marginTop: 1,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 12,
  },
  cardIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.pBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: C.text,
    letterSpacing: -0.1,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    color: C.sub,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: C.text,
    backgroundColor: "#f8fafc",
  },
  picker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  pickerText: {
    fontSize: 14,
    color: C.text,
    fontFamily: FONTS.bodyMedium,
    flex: 1,
  },
  pickerPh: {
    color: C.muted,
    fontFamily: FONTS.body,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.redBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: {
    color: C.red,
    fontSize: 12.5,
    fontFamily: FONTS.bodySemiBold,
    flex: 1,
  },
  btnContainer: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: ROUNDING.xl,
    borderTopRightRadius: ROUNDING.xl,
    padding: 20,
    maxHeight: "60%",
    ...SHADOWS.lg,
  },
  modalTitle: { fontSize: 16, fontFamily: FONTS.displayBold, marginBottom: 12, color: C.text },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalItemText: { fontSize: 14, color: C.text, fontFamily: FONTS.bodyBold },
});

export default EditEmployeeScreen;
