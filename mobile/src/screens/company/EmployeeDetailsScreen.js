import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { getEmployeeByIdApi, patchEmployeeStatusApi, deleteEmployeeApi } from "../../api/employeeService";
import { formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const TABS = ["Overview", "Job Details", "Documents"];

const InfoRow = ({ label, value, icon }) => (
  <View style={styles.infoRow}>
    {icon && (
      <View style={styles.infoRowIcon}>
        <Ionicons name={icon} size={15} color={COLORS.primary} />
      </View>
    )}
    <View style={styles.infoRowContent}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value ?? "—"}</Text>
    </View>
  </View>
);

const SectionCard = ({ title, children, editIcon, onEdit }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.sectionEditBtn} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const EmployeeDetailsScreen = ({ route, navigation }) => {
  const { employeeId } = route.params;
  const { user } = useAuth();
  const canManage = user?.role === "CompanyAdmin" || user?.role === "HR";

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [imgError, setImgError] = useState(false);


  const handleCall = (phone) => {
    if (!phone) return Alert.alert("No phone", "This employee has no phone number on file.");
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Error", "Unable to open the phone dialer.")
    );
  };

  const handleSMS = (phone) => {
    if (!phone) return Alert.alert("No phone", "This employee has no phone number on file.");
    Linking.openURL(`sms:${phone}`).catch(() =>
      Alert.alert("Error", "Unable to open the messaging app.")
    );
  };

  const handleEmail = (email) => {
    if (!email) return Alert.alert("No email", "This employee has no email address on file.");
    Linking.openURL(`mailto:${email}`).catch(() =>
      Alert.alert("Error", "Unable to open the email app.")
    );
  };

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await getEmployeeByIdApi(employeeId);
      setEmployee(data.employee);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [employeeId]));

  const cycleStatus = () => {
    if (!employee) return;
    const order = ["active", "inactive", "terminated"];
    const idx = order.indexOf(employee.status);
    const next = order[(idx + 1) % order.length];
    Alert.alert("Update Status", `Set status to ${next}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        onPress: async () => {
          try {
            const { data } = await patchEmployeeStatusApi(employeeId, next);
            setEmployee(data.employee);
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed");
          }
        },
      },
    ]);
  };

  const remove = () => {
    Alert.alert("Delete Employee", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEmployeeApi(employeeId);
            navigation.goBack();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed");
          }
        },
      },
    ]);
  };

  if (loading && !employee) return <Loader />;
  if (!employee) {
    return (
      <View style={styles.center}>
        <Ionicons name="person-outline" size={48} color="#cbd5e1" />
        <Text style={styles.emptyText}>Employee not found</Text>
      </View>
    );
  }

  const renderOverview = () => (
    <>
      <SectionCard
        title="Personal Information"
        onEdit={canManage ? () => navigation.navigate("EditEmployee", { employeeId }) : null}
      >
        <InfoRow label="Full Name" value={`${employee.firstName} ${employee.lastName}`} icon="person-outline" />
        <InfoRow label="Email Address" value={employee.email} icon="mail-outline" />
        <InfoRow label="Phone Number" value={employee.phone} icon="call-outline" />
        <InfoRow
          label="Date of Birth"
          value={employee.dateOfBirth ? formatDateToDDMMYYYY(employee.dateOfBirth) : null}
          icon="calendar-clear-outline"
        />
        <InfoRow label="Gender" value={employee.gender} icon="transgender-outline" />
        <InfoRow label="Address" value={employee.address} icon="location-outline" />
      </SectionCard>

      <SectionCard title="Job Information">
        <InfoRow label="Department" value={employee.departmentId?.name} icon="grid-outline" />
        {employee.role !== "CompanyAdmin" && employee.userId?.role !== "CompanyAdmin" && (
          <InfoRow label="Designation" value={employee.designationId?.name} icon="ribbon-outline" />
        )}
        <InfoRow label="Reporting To" value={employee.reportingManagerId ? `${employee.reportingManagerId?.firstName || ""} ${employee.reportingManagerId?.lastName || ""}`.trim() || "—" : "—"} icon="people-outline" />
        <InfoRow label="Employee Type" value={employee.employmentType} icon="time-outline" />
        <InfoRow label="Work Location" value={`${employee.branchId?.branchName || employee.branchName || ""}${employee.workMode ? ` (${employee.workMode})` : ""}` || "—"} icon="business-outline" />
      </SectionCard>
    </>
  );

  const renderJobDetails = () => (
    <>
      <SectionCard title="Employment Details">
        <InfoRow
          label="Join Date"
          value={employee.joiningDate ? formatDateToDDMMYYYY(employee.joiningDate) : null}
          icon="calendar-outline"
        />
        <InfoRow
          label="Probation End Date"
          value={employee.probationEndDate ? formatDateToDDMMYYYY(employee.probationEndDate) : null}
          icon="calendar-outline"
        />
        <InfoRow label="Work Mode" value={employee.workMode} icon="desktop-outline" />
        <InfoRow label="Branch" value={employee.branchId?.branchName || employee.branchName} icon="business-outline" />
        <InfoRow label="Salary" value={employee.salary != null ? `₹${employee.salary.toLocaleString()}` : null} icon="cash-outline" />
      </SectionCard>
      <SectionCard title="Emergency Contact">
        <InfoRow label="Name" value={employee.emergencyContactName} icon="heart-outline" />
        <InfoRow label="Phone" value={employee.emergencyContactPhone} icon="alert-circle-outline" />
      </SectionCard>
      {canManage && (
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.dangerBtn} onPress={cycleStatus} activeOpacity={0.8}>
            <Ionicons name="refresh-circle-outline" size={18} color="#d97706" />
            <Text style={styles.dangerBtnText}>Change Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerBtn, styles.redBtn]} onPress={remove} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <Text style={[styles.dangerBtnText, { color: COLORS.danger }]}>Delete Employee</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const handleOpenDoc = async (url) => {
    if (url) {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch (err) {
        Alert.alert("Error", "Could not open document.");
      }
    }
  };

  const renderDocRow = (title, url, icon = "document-text-outline") => (
    <TouchableOpacity
      style={[styles.infoRow, { alignItems: 'center' }]}
      onPress={() => url ? handleOpenDoc(url) : null}
      activeOpacity={url ? 0.7 : 1}
    >
      <View style={styles.infoRowIcon}>
        <Ionicons name={icon} size={15} color={url ? COLORS.primary : "#94a3b8"} />
      </View>
      <View style={[styles.infoRowContent, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text style={styles.infoRowLabel}>{title}</Text>
          <Text style={[styles.infoRowValue, !url && { color: "#94a3b8" }]}>
            {url ? "Available" : "Not Uploaded"}
          </Text>
        </View>
        {url ? <Ionicons name="open-outline" size={16} color={COLORS.primary} /> : null}
      </View>
    </TouchableOpacity>
  );

  const renderDocuments = () => (
    <SectionCard 
      title="Documents"
      onEdit={canManage ? () => navigation.navigate("EditEmployee", { employeeId }) : null}
    >
      {renderDocRow("Offer Letter", employee.documents?.offerLetter, "ribbon-outline")}
      {renderDocRow("Joining Letter", employee.documents?.joiningLetter, "mail-open-outline")}
      {renderDocRow("Previous Salary Slip", employee.documents?.salarySlipPrevious, "cash-outline")}
      {renderDocRow("Aadhaar Card (Front)", employee.documents?.aadhaarFront, "card-outline")}
      {renderDocRow("Aadhaar Card (Back)", employee.documents?.aadhaarBack, "card-outline")}
      {renderDocRow("PAN Card", employee.documents?.panCard, "card-outline")}
      {renderDocRow("Resume", employee.documents?.resume, "document-attach-outline")}
      {employee.documents?.customDocuments?.map((doc, index) => (
        <React.Fragment key={index}>
          {renderDocRow(doc.title || "Custom Document", doc.url, "document-text-outline")}
        </React.Fragment>
      ))}
    </SectionCard>
  );

  return (
    <View style={styles.wrapper}>
      {/* Hero Header Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text.dark} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Employee Details</Text>
          {canManage && (
            <TouchableOpacity
              onPress={() => navigation.navigate("EditEmployee", { employeeId })}
              style={styles.moreBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text.dark} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroProfile}>
          {(() => {
            const photoUrl = employee.photo?.trim() || "";
            return !photoUrl || imgError ? (
              <View style={[styles.heroAvatar, styles.heroAvatarPh]}>
                <Text style={styles.heroAvatarTxt}>
                  {(employee.firstName?.[0] || "?").toUpperCase()}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: photoUrl }}
                style={styles.heroAvatar}
                onError={() => setImgError(true)}
              />
            );
          })()}

          <View style={styles.heroBadgeWrap}>
            <StatusBadge status={employee.status} />
          </View>
        </View>

        <Text style={styles.heroName}>{employee.firstName} {employee.lastName}</Text>
        {employee.role !== "CompanyAdmin" && employee.userId?.role !== "CompanyAdmin" ? (
          <Text style={styles.heroDesig}>{employee.designationId?.name || "Team Member"}</Text>
        ) : null}
        <Text style={styles.heroCode}>{employee.employeeCode}</Text>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.75}
            onPress={() => handleCall(employee.phone)}
          >
            <View style={styles.quickBtnCircle}>
              <Ionicons name="call-outline" size={19} color={COLORS.primary} />
            </View>
            <Text style={styles.quickBtnLabel}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.75}
            onPress={() => handleSMS(employee.phone)}
          >
            <View style={styles.quickBtnCircle}>
              <Ionicons name="chatbubble-ellipses-outline" size={19} color={COLORS.primary} />
            </View>
            <Text style={styles.quickBtnLabel}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.75}
            onPress={() => handleEmail(employee.email)}
          >
            <View style={styles.quickBtnCircle}>
              <Ionicons name="mail-outline" size={19} color={COLORS.primary} />
            </View>
            <Text style={styles.quickBtnLabel}>Email</Text>
          </TouchableOpacity>

          {canManage && (
            <TouchableOpacity
              style={styles.quickBtn}
              activeOpacity={0.75}
              onPress={() => navigation.navigate("EditEmployee", { employeeId })}
            >
              <View style={styles.quickBtnCircle}>
                <Ionicons name="pencil-outline" size={19} color={COLORS.primary} />
              </View>
              <Text style={styles.quickBtnLabel}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
        }
      >
        {activeTab === "Overview" && renderOverview()}
        {activeTab === "Job Details" && renderJobDetails()}
        {activeTab === "Documents" && renderDocuments()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: "#f8fafc" },
  emptyText: { fontFamily: FONTS.body, color: COLORS.text.muted, fontSize: 16 },

  // Hero
  heroCard: {
    backgroundColor: COLORS.white,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    ...SHADOWS.sm,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text.dark },
  moreBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  heroProfile: { alignItems: "center", marginBottom: 10 },
  heroAvatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "#ccfbf1" },
  heroAvatarPh: {
    backgroundColor: "#ccfbf1",
    justifyContent: "center",
    alignItems: "center",
  },
  heroAvatarTxt: { color: COLORS.primary, fontSize: 36, fontFamily: FONTS.displayBold },
  heroBadgeWrap: { position: "absolute", bottom: 0, right: "35%" },

  heroName: { textAlign: "center", fontSize: 20, fontFamily: FONTS.displayBold, color: COLORS.text.dark },
  heroDesig: { textAlign: "center", fontSize: 13, fontFamily: FONTS.body, color: COLORS.text.muted, marginTop: 2 },
  heroCode: { textAlign: "center", fontSize: 12, fontFamily: FONTS.bodyMedium, color: COLORS.text.light, marginTop: 2 },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  quickBtn: { alignItems: "center", gap: 5 },
  quickBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  quickBtnLabel: { fontSize: 11, fontFamily: FONTS.body, color: COLORS.text.muted },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: COLORS.text.muted },
  tabTextActive: { color: COLORS.primary, fontFamily: FONTS.bodyBold },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  sectionEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBody: { gap: 14 },

  // Info Row
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0fdfa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  infoRowContent: { flex: 1 },
  infoRowLabel: { fontSize: 11, fontFamily: FONTS.bodyMedium, color: COLORS.text.light },
  infoRowValue: { fontSize: 14, fontFamily: FONTS.body, color: COLORS.text.dark, marginTop: 1 },

  // Actions Card
  actionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
    ...SHADOWS.sm,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: ROUNDING.md,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  redBtn: {
    backgroundColor: "#fff5f5",
    borderColor: "#fecaca",
  },
  dangerBtnText: { fontFamily: FONTS.bodyMedium, fontSize: 14, color: "#d97706" },
});

export default EmployeeDetailsScreen;
