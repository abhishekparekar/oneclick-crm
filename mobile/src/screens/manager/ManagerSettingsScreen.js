import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { getMyEmployeeApi, updateEmployeeApi } from "../../api/employeeService";
import { getDepartmentsApi, getDesignationsApi, getBranchesApi } from "../../api/companyService";
import { changePasswordApi } from "../../api/authService";
import AppButton from "../../components/AppButton";
import ManagerLayout from "../../components/ManagerLayout";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";

const ManagerSettingsScreen = ({ navigation }) => {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Profile Edit Form State
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Manager");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  // Organization references selections
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedDesig, setSelectedDesig] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Dropdown list directories data
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches] = useState([]);

  // Sub-picker modals
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [desigModalVisible, setDesigModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);

  // Change Password State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await getMyEmployeeApi();
      if (data && data.employee) {
        const emp = data.employee;
        setEmployee(emp);

        setFullName(`${emp.firstName || ""} ${emp.lastName || ""}`.trim());
        setPhone(emp.phone || "");
        setEmail(emp.email || "");
        setRole(user?.role || "Manager");
        setAddress(emp.address || "");
        setEmergencyContact(emp.emergencyContactName || "");
        setJoiningDate(emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : "");

        setSelectedDept(emp.departmentId || null);
        setSelectedDesig(emp.designationId || null);
        setSelectedBranch(emp.branchId || null);
      }
    } catch (err) {
      console.log("Failed to load employee profile settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [user])
  );

  const loadDropdowns = async () => {
    try {
      const [deptRes, desigRes, branchRes] = await Promise.all([
        getDepartmentsApi(),
        getDesignationsApi(),
        getBranchesApi(),
      ]);
      setDepartments(deptRes.data.departments || []);
      setDesignations(desigRes.data.designations || []);
      setBranches(branchRes.data.branches || []);
    } catch (err) {
      console.warn("Failed to load dropdown directories:", err);
    }
  };

  const handleOpenForm = async () => {
    await loadDropdowns();
    setFormModalVisible(true);
  };

  const checkCompletionStatus = (emp) => {
    if (!emp) return { percent: 0, isComplete: false, missing: [] };
    const fields = [
      { key: "firstName", label: "Full Name" },
      { key: "phone", label: "Phone contact" },
      { key: "email", label: "Email address" },
      { key: "departmentId", label: "Department" },
      { key: "designationId", label: "Designation" },
      { key: "branchId", label: "Branch" },
      { key: "address", label: "Residential Address" },
      { key: "emergencyContactName", label: "Emergency Contact" },
    ];
    const missing = [];
    fields.forEach((f) => {
      if (!emp[f.key]) missing.push(f.label);
    });
    const percent = Math.round(((fields.length - missing.length) / fields.length) * 100);
    return { percent, isComplete: missing.length === 0, missing };
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      Alert.alert("Required Fields", "Please supply your Full Name, Phone contact, and Email.");
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    const fName = nameParts[0] || "";
    const lName = nameParts.slice(1).join(" ") || "";

    if (!fName) {
      Alert.alert("Invalid Name", "Please input your Name.");
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        firstName: fName,
        lastName: lName,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        emergencyContactName: emergencyContact.trim(),
        emergencyContactPhone: phone.trim(),
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        departmentId: selectedDept?._id || selectedDept || null,
        designationId: selectedDesig?._id || selectedDesig || null,
        branchId: selectedBranch?._id || selectedBranch || null,
      };

      await updateEmployeeApi(employee._id, payload);
      Alert.alert("Success", "Profile updated successfully!");
      setFormModalVisible(false);
      loadProfile();
    } catch (err) {
      Alert.alert("Update Failed", err.response?.data?.message || "Failed to update profile details");
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePasswordSubmit = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Invalid Password", "Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Confirm password does not match new password.");
      return;
    }

    try {
      setChangingPassword(true);
      await changePasswordApi(newPassword);
      Alert.alert("Success", "Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordModalVisible(false);
    } catch (err) {
      Alert.alert("Failed", err.response?.data?.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const { percent, isComplete, missing } = checkCompletionStatus(employee);
  const initialAvatar = `${employee?.firstName?.[0] || "?"}${employee?.lastName?.[0] || ""}`.toUpperCase();

  if (loading && !employee) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Synchronizing Account Profile...</Text>
      </View>
    );
  }

  return (
    <ManagerLayout title="Settings" showBackButton>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 90) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Visual Header / Profile Hero Card */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("ManagerProfile")}>
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              style={styles.profileHeroCard}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialAvatar}</Text>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {employee?.firstName} {employee?.lastName}
                </Text>
                
                <Text style={styles.userRole}>
                  {employee?.designationId?.name || "Manager"} · {user?.role.toUpperCase()}
                </Text>
                
                <Text style={styles.userSubInfo} numberOfLines={1}>
                  {employee?.email || user?.email} • {employee?.phone}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Profile Completion Card */}
          <View style={[styles.statusCard, isComplete ? styles.statusCardGreen : styles.statusCardOrange]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusHeaderLeft}>
                <Ionicons
                  name={isComplete ? "checkmark-circle" : "alert-circle"}
                  size={22}
                  color={isComplete ? "#16A34A" : COLORS.primary}
                />
                <Text style={[styles.statusTitle, { color: isComplete ? "#15803D" : COLORS.darkNavy }]}>
                  {isComplete ? "Profile 100% Complete" : "Profile Incomplete"}
                </Text>
              </View>
              <Text style={[styles.statusPercent, { color: isComplete ? "#16A34A" : COLORS.primary }]}>
                {percent}%
              </Text>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBar, { width: `${percent}%`, backgroundColor: isComplete ? "#16A34A" : COLORS.primary }]} />
            </View>

            {!isComplete && (
              <View style={styles.missingListContainer}>
                <Text style={styles.missingListTitle}>Required fields to complete ({missing.length}):</Text>
                {missing.map((label, idx) => (
                  <View key={idx} style={styles.missingItemRow}>
                    <Ionicons name="close-circle-outline" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.missingItemLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={handleOpenForm}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#1268D9', '#0D50B8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Text style={styles.actionBtnText}>
                  {isComplete ? "Edit Profile Details" : "Complete Profile Details"}
                </Text>
                <Ionicons name="create-outline" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Shortcuts Section */}
          <Text style={styles.sectionTitle}>SHORTCUTS & WORK</Text>
          <View style={styles.optionsBlock}>
            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("ManagerTasks")} activeOpacity={0.8}>
              <View style={styles.optionRowLeft}>
                <View style={[styles.optionIconBg, { backgroundColor: "rgba(249, 115, 22, 0.1)" }]}>
                  <Ionicons name="albums-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.optionLabel}>My Tasks</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={() => navigation.navigate("ManagerTeamLeaves")} activeOpacity={0.8}>
              <View style={styles.optionRowLeft}>
                <View style={[styles.optionIconBg, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                </View>
                <Text style={styles.optionLabel}>Team Leaves</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate("ManagerProfile")} activeOpacity={0.8}>
              <View style={styles.optionRowLeft}>
                <View style={[styles.optionIconBg, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="person-outline" size={18} color="#10B981" />
                </View>
                <Text style={styles.optionLabel}>View Full Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Security & System Section */}
          <Text style={styles.sectionTitle}>SECURITY & ACCOUNT</Text>
          <View style={styles.optionsBlock}>
            <TouchableOpacity style={styles.optionRow} onPress={() => setPasswordModalVisible(true)} activeOpacity={0.8}>
              <View style={styles.optionRowLeft}>
                <View style={[styles.optionIconBg, { backgroundColor: "#FFF7ED" }]}>
                  <Ionicons name="key-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.optionLabel}>Change Account Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={logout} activeOpacity={0.8}>
              <View style={styles.optionRowLeft}>
                <View style={[styles.optionIconBg, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.optionLabel, { color: "#EF4444" }]}>Logout Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <Text style={styles.supportLabel}>One Click Business • Version 1.2.0</Text>
        </ScrollView>

        {/* Edit Profile Form Modal */}
        <Modal visible={formModalVisible} animationType="slide" transparent onRequestClose={() => setFormModalVisible(false)}>
          <View style={styles.modalBgDim}>
            <View style={styles.modalContentCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Profile Details</Text>
                <TouchableOpacity onPress={() => setFormModalVisible(false)} style={styles.modalCloseIconBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={COLORS.darkNavy} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={[styles.formScroll, { paddingBottom: Math.max(40, insets.bottom + 20) }]} showsVerticalScrollIndicator={false}>
                <Text style={styles.formSectionLabel}>PERSONAL DETAILS</Text>
                
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput style={styles.textInput} value={fullName} onChangeText={setFullName} placeholder="First & Last Name" placeholderTextColor="#94A3B8" />

                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput style={styles.textInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone contact number" placeholderTextColor="#94A3B8" />

                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput style={styles.textInput} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="Email address" placeholderTextColor="#94A3B8" />

                <Text style={styles.formSectionLabel}>ORGANIZATIONAL DETAILS</Text>

                <Text style={styles.inputLabel}>Department</Text>
                <TouchableOpacity style={styles.dropdownPicker} onPress={() => setDeptModalVisible(true)} activeOpacity={0.8}>
                  <Text style={styles.dropdownPickerText}>
                    {selectedDept?.name || departments.find(d => d._id === selectedDept)?.name || "Select Department..."}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Designation</Text>
                <TouchableOpacity style={styles.dropdownPicker} onPress={() => setDesigModalVisible(true)} activeOpacity={0.8}>
                  <Text style={styles.dropdownPickerText}>
                    {selectedDesig?.name || designations.find(d => d._id === selectedDesig)?.name || "Select Designation..."}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Office Branch</Text>
                <TouchableOpacity style={styles.dropdownPicker} onPress={() => setBranchModalVisible(true)} activeOpacity={0.8}>
                  <Text style={styles.dropdownPickerText}>
                    {selectedBranch?.branchName || branches.find(b => b._id === selectedBranch)?.branchName || "Select Branch..."}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                </TouchableOpacity>

                <Text style={styles.formSectionLabel}>ADDITIONAL INFORMATION</Text>

                <Text style={styles.inputLabel}>Current Address</Text>
                <TextInput style={styles.textInput} value={address} onChangeText={setAddress} placeholder="Residential address" placeholderTextColor="#94A3B8" />

                <Text style={styles.inputLabel}>Emergency Contact Name</Text>
                <TextInput style={styles.textInput} value={emergencyContact} onChangeText={setEmergencyContact} placeholder="Emergency contact detail" placeholderTextColor="#94A3B8" />

                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProfile} disabled={updating} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#1268D9', '#0D50B8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {updating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Save Updates</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal visible={passwordModalVisible} animationType="slide" transparent onRequestClose={() => setPasswordModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBgDim}>
            <View style={styles.modalContentCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={styles.modalCloseIconBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={COLORS.darkNavy} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingVertical: 10 }}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-type new password"
                  placeholderTextColor="#94A3B8"
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleChangePasswordSubmit} disabled={changingPassword} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#1268D9', '#0D50B8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Update Password</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13.5,
    color: COLORS.text.muted,
    marginTop: 12,
  },
  scrollContent: {
    padding: 14,
  },
  profileHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginRight: 14,
  },
  avatarText: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  userRole: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 1,
  },
  userSubInfo: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  statusCardGreen: {
    borderColor: "#A7F3D0",
  },
  statusCardOrange: {
    borderColor: "#FED7AA",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    marginLeft: 8,
  },
  statusPercent: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  missingListContainer: {
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  missingListTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    color: COLORS.darkNavy,
    marginBottom: 6,
  },
  missingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  missingItemLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
    color: COLORS.text.muted,
  },
  cardActionBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    color: COLORS.text.muted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  optionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  supportLabel: {
    textAlign: "center",
    fontFamily: FONTS.body,
    fontSize: 11.5,
    color: COLORS.text.muted,
    marginTop: 10,
  },
  modalBgDim: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContentCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: COLORS.darkNavy,
  },
  modalCloseIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justify: "center",
  },
  formScroll: {
    paddingVertical: 4,
  },
  formSectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  inputLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: COLORS.darkNavy,
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 11,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  dropdownPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 11,
  },
  dropdownPickerText: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  submitBtn: {
    marginTop: 18,
    borderRadius: 12,
    overflow: "hidden",
  },
  submitBtnGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  submitBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },
});

export default ManagerSettingsScreen;
