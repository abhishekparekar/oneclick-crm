import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import AppCard from "../../components/AppCard";
import { useAuth } from "../../context/AuthContext";
import { isEmployeeRole } from "../../utils/roleHelpers";
import EmployeeLayout from "../../components/EmployeeLayout";
import ManagerLayout from "../../components/ManagerLayout";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";
import { getMyProfileApi, changePasswordApi } from "../../api/employeeService";

const formatBirthDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      {icon && <Ionicons name={icon} size={15} color={COLORS.slateMuted} style={{ marginRight: 8 }} />}
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue} numberOfLines={1}>{value || "—"}</Text>
  </View>
);

const EmployeeProfileScreen = ({ navigation }) => {
  const { logout, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom Sheet Modal States
  const [infoModalCategory, setInfoModalCategory] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Change Password Modal States
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchProfile = async (isRefresh = false) => {
    if (!isRefresh && profile) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await getMyProfileApi();
      if (data && data.success) {
        setProfile(data.employee);
      }
    } catch (err) {
      if (err?.response?.status !== 429) {
        console.warn("[EmployeeProfile] Could not fetch live profile details, using user cache:", err.message);
      }
      if (!profile && user) {
        setProfile({
          firstName: user.name?.split(" ")[0] || "Team",
          lastName: user.name?.split(" ").slice(1).join(" ") || "Member",
          email: user.email,
          designationId: { name: user.role || "Employee" },
          departmentId: { name: "Company Wide" }
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isLoadedRef = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isLoadedRef.current || !profile) {
        isLoadedRef.current = true;
        fetchProfile();
      }
    }, [profile])
  );

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All password fields are required");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    try {
      setUpdatingPassword(true);
      const res = await changePasswordApi({ oldPassword, newPassword });
      if (res.data && res.data.success) {
        Alert.alert("Success", "Password updated successfully!");
        setPasswordModalVisible(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading && !profile) return <Loader />;

  if (!profile) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="person-circle-outline" size={80} color="#CBD5E1" />
        <Text style={styles.msg}>Failed to load your profile details.</Text>
        <AppButton title="Logout" onPress={logout} variant="outline" style={{ marginTop: 24, width: "60%" }} />
      </SafeAreaView>
    );
  }

  const initialAvatar = `${profile.firstName?.[0] || "?"}${profile.lastName?.[0] || ""}`.toUpperCase();

  const getFullAddress = () => {
    const addr = profile.currentAddress;
    if (!addr || !addr.addressLine1) return "—";
    const parts = [
      addr.addressLine1,
      addr.city,
      addr.state,
      addr.pincode
    ].filter(Boolean);
    return parts.join(", ");
  };

  const renderModalContent = () => {
    switch (infoModalCategory) {
      case "job":
        return (
          <View style={styles.modalContentPadding}>
            <DetailRow label="Role Assignment" value={profile.role} icon="shield-outline" />
            <DetailRow label="Office Email" value={profile.email} icon="mail-outline" />
            <DetailRow label="Primary Phone" value={profile.phone} icon="call-outline" />
            <DetailRow label="Office Branch" value={profile.branchName || profile.branchId?.branchName} icon="business-outline" />
            <DetailRow label="Joining Date" value={profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : null} icon="calendar-outline" />
            <DetailRow label="Employment Type" value={profile.employmentType} icon="briefcase-outline" />
            <DetailRow label="Work Mode" value={profile.workMode?.toUpperCase()} icon="laptop-outline" />
            <DetailRow label="Reporting Manager" value={profile.reportingManagerName || (profile.reportingManagerId ? `${profile.reportingManagerId.firstName} ${profile.reportingManagerId.lastName}` : null)} icon="person-outline" />
          </View>
        );
      case "bank":
        return (
          <View style={styles.modalContentPadding}>
            <DetailRow label="Bank Name" value={profile.bankDetails?.bankName} icon="business-outline" />
            <DetailRow label="Account Holder" value={profile.bankDetails?.accountHolderName} icon="person-outline" />
            <DetailRow label="Account Number" value={profile.bankDetails?.accountNumber} icon="card-outline" />
            <DetailRow label="IFSC Code" value={profile.bankDetails?.ifscCode} icon="key-outline" />
            <DetailRow label="UPI ID" value={profile.bankDetails?.upiId} icon="qr-code-outline" />
          </View>
        );
      case "emergency":
        return (
          <View style={styles.modalContentPadding}>
            <DetailRow label="Contact Person" value={profile.emergencyContact?.name} icon="person-outline" />
            <DetailRow label="Relationship" value={profile.emergencyContact?.relationship} icon="heart-outline" />
            <DetailRow label="Phone Number" value={profile.emergencyContact?.phone} icon="call-outline" />
            <DetailRow label="Alternate Phone" value={profile.emergencyContact?.alternatePhone} icon="call-outline" />
          </View>
        );
      case "documents": {
        const renderDocRow = (label, url) => (
          <TouchableOpacity 
            style={styles.docRow} 
            activeOpacity={url ? 0.6 : 1}
            onPress={async () => {
              if (url) {
                try {
                  await Linking.openURL(url);
                } catch (err) {
                  Alert.alert("Error", "Could not open document.");
                }
              }
            }}
          >
            <Ionicons name="document-text" size={20} color={url ? COLORS.primary : "#64748B"} />
            <Text style={styles.docLabel}>{label}</Text>
            {url ? (
               <View style={{flexDirection: "row", alignItems: "center"}}>
                 <Text style={[styles.docStatus, { color: COLORS.primary, fontWeight: "700", marginRight: 4 }]}>View</Text>
                 <Ionicons name="open-outline" size={14} color={COLORS.primary} />
               </View>
            ) : (
               <Text style={styles.docStatus}>Pending</Text>
            )}
          </TouchableOpacity>
        );

        return (
          <View style={styles.modalContentPadding}>
            {renderDocRow("Aadhaar Card Front", profile.documents?.aadhaarFront)}
            {renderDocRow("Aadhaar Card Back", profile.documents?.aadhaarBack)}
            {renderDocRow("PAN Card Copy", profile.documents?.panCard)}
            {renderDocRow("Resume (PDF)", profile.documents?.resume)}
          </View>
        );
      }
      default:
        return null;
    }
  };

  let Layout;
  let editScreenName;
  if (isEmployeeRole(user?.role)) {
    Layout = EmployeeLayout;
    editScreenName = "EmployeeEditProfile";
  } else if (user?.role === "Manager") {
    Layout = ManagerLayout;
    editScreenName = "ManagerEditProfileScreen";
  } else {
    Layout = EmployeeLayout;
    editScreenName = "EmployeeEditProfile";
  }

  return (
    <Layout
      navigation={navigation}
      title="My Profile"
      rightActionType="profile"
      onRightActionPress={{
        onSettings: () => setSettingsModalVisible(true),
        onEdit: () => navigation.navigate(editScreenName)
      }}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProfile(true)}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* 1. Header Hero Profile Summary Card */}
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.summaryHeroCard}
          >
            <View style={styles.avatarContainer}>
              {profile.photo ? (
                <Image source={{ uri: profile.photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{initialAvatar}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={() => navigation.navigate(editScreenName)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryInfo}>
              <Text style={styles.nameText}>
                {profile.fullName || `${profile.firstName} ${profile.lastName}`}
              </Text>
              
              <Text style={styles.designationText}>
                {profile.designationName || profile.designationId?.name || "Team Member"}
              </Text>

              <View style={styles.badgeRow}>
                {profile.employeeCode ? (
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{profile.employeeCode}</Text>
                  </View>
                ) : null}
                
                <View style={styles.departmentBadge}>
                  <Text style={styles.departmentText}>
                    {profile.departmentName || profile.departmentId?.name || "General"}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* 2. Personal Information Card */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.primary} />
              <Text style={styles.infoCardTitle}>Personal Information</Text>
            </View>
            
            <DetailRow label="Full Name" value={profile.fullName || `${profile.firstName} ${profile.lastName}`} icon="text-outline" />
            <DetailRow label="Email Address" value={profile.personalEmail || profile.email} icon="mail-outline" />
            <DetailRow label="Phone Number" value={profile.phone} icon="call-outline" />
            <DetailRow label="Date of Birth" value={formatBirthDate(profile.dateOfBirth)} icon="calendar-outline" />
            <DetailRow label="Gender" value={profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : "—"} icon="male-female-outline" />
            <DetailRow label="Address" value={getFullAddress()} icon="location-outline" />
          </View>

          {/* 3. Clickable Category Menu Container */}
          <View style={styles.menuCardContainer}>
            <View style={styles.cardHeaderRow}>
              <Feather name="layers" size={15} color={COLORS.primary} />
              <Text style={styles.infoCardTitle}>Profile Sections</Text>
            </View>

            {/* Job Information */}
            <TouchableOpacity
              style={styles.menuRowItem}
              onPress={() => setInfoModalCategory("job")}
              activeOpacity={0.8}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuRowIconBox}>
                  <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuRowText}>Job Information</Text>
                  <Text style={styles.menuRowSub}>Role, manager, branch & work mode</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Bank Details */}
            <TouchableOpacity
              style={styles.menuRowItem}
              onPress={() => setInfoModalCategory("bank")}
              activeOpacity={0.8}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuRowIconBox}>
                  <Ionicons name="business-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuRowText}>Bank Details</Text>
                  <Text style={styles.menuRowSub}>Account number, IFSC & UPI ID</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Emergency Contact */}
            <TouchableOpacity
              style={styles.menuRowItem}
              onPress={() => setInfoModalCategory("emergency")}
              activeOpacity={0.8}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuRowIconBox}>
                  <Ionicons name="heart-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuRowText}>Emergency Contact</Text>
                  <Text style={styles.menuRowSub}>Contact person, relation & phone</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Documents */}
            <TouchableOpacity
              style={[styles.menuRowItem, { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate("EmployeeDocuments")}
              activeOpacity={0.8}
            >
              <View style={styles.menuRowLeft}>
                <View style={styles.menuRowIconBox}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuRowText}>Documents</Text>
                  <Text style={styles.menuRowSub}>Aadhaar, PAN & resume files</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* 4. Logout Action */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.logoutBtnText}>Logout Account</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Categories Details Modal */}
        <Modal
          visible={infoModalCategory !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setInfoModalCategory(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {infoModalCategory === "job" && "Job Information"}
                  {infoModalCategory === "bank" && "Bank Details"}
                  {infoModalCategory === "emergency" && "Emergency Contact"}
                  {infoModalCategory === "documents" && "Documents"}
                </Text>
                <TouchableOpacity onPress={() => setInfoModalCategory(null)} style={styles.modalCloseIconBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={COLORS.darkNavy} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {renderModalContent()}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Settings Options Modal */}
        <Modal
          visible={settingsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Account Settings</Text>
                <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.modalCloseIconBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={COLORS.darkNavy} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.menuRowItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setPasswordModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.menuRowLeft}>
                  <View style={styles.menuRowIconBox}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuRowText}>Change Account Password</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          visible={passwordModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPasswordModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setPasswordModalVisible(false)} style={styles.modalCloseIconBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={COLORS.darkNavy} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingVertical: 8 }}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor="#94A3B8"
                />

                <TouchableOpacity 
                  style={styles.submitPasswordBtn} 
                  onPress={handlePasswordChange}
                  disabled={updatingPassword}
                  activeOpacity={0.85}
                >
                  {updatingPassword ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitPasswordBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  msg: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.text.muted,
    marginTop: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },
  summaryHeroCard: {
    borderRadius: ROUNDING.lg,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.darkNavy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: {
    fontFamily: FONTS.displayBold,
    fontSize: 24,
    color: "#FFFFFF",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  summaryInfo: {
    alignItems: "center",
  },
  nameText: {
    fontFamily: FONTS.displayBold,
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  designationText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  codeBadge: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.4)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  codeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    color: COLORS.primary,
  },
  departmentBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  departmentText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10.5,
    color: "#CBD5E1",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoCardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: COLORS.darkNavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.muted,
  },
  detailValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  menuCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  menuRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuRowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primaryPale,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  menuRowText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  menuRowSub: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  logoutBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#EF4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
  modalContentPadding: {
    paddingVertical: 4,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  docLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.darkNavy,
    marginLeft: 10,
  },
  docStatus: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.text.muted,
  },
  inputLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: COLORS.darkNavy,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  submitPasswordBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitPasswordBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },
});

export default EmployeeProfileScreen;
