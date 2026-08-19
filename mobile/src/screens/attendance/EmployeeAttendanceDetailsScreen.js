import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import EmployeeLayout from "../../components/EmployeeLayout";
import ManagerLayout from "../../components/ManagerLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import { getMyDateApi } from "../../api/attendanceService";

const formatWorkingHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours) || hours === 0) return "—";
  let hrs = Math.floor(hours);
  let mins = Math.round((hours - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return `${hrs} hr ${mins} min`;
};

const DetailRow = ({ label, value, icon, color = "#2563eb" }) => (
  <View style={styles.detailRow}>
    <View style={[styles.iconBg, { backgroundColor: color + "10" }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View style={styles.detailText}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailVal}>{value || "—"}</Text>
    </View>
  </View>
);

const EmployeeAttendanceDetailsScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { date } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [record, setRecord] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

  const Layout = user?.role === "manager" ? ManagerLayout : EmployeeLayout;

  const fetchDetails = async (isRefresh = false) => {
    if (!date) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: res } = await getMyDateApi(date);
      if (res && res.success) {
        setRecord(res.attendance || null);
      }
    } catch (err) {
      console.error("Failed to load attendance detail:", err);
      setRecord(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [date])
  );

  const handleRefresh = () => fetchDetails(true);

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
      case "late":
        return "#16a34a";
      case "half-day":
      case "half_day":
        return "#d97706";
      case "absent":
        return "#dc2626";
      default:
        return "#64748b";
    }
  };

  const getRegBadgeColor = (status) => {
    switch (status) {
      case "pending":
        return { bg: "#fff7ed", text: "#ea580c", label: "Correction Pending" };
      case "approved":
        return { bg: "#f0fdf4", text: "#16a34a", label: "Correction Approved" };
      case "rejected":
        return { bg: "#fef2f2", text: "#dc2626", label: "Correction Rejected" };
      default:
        return null;
    }
  };

  const regInfo = record ? getRegBadgeColor(record.regularizationStatus) : null;

  return (
    <Layout navigation={navigation} title="Attendance Detail">
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loaderText}>Syncing record details...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Header Date Card */}
          <AppCard style={styles.dateCard}>
            <View style={styles.dateHeader}>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              <Text style={styles.dateTitle}>
                {date ? new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—"}
              </Text>
            </View>
            
            {record ? (
              <View style={styles.quickStatusRow}>
                <Text style={styles.quickLabel}>Daily Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + "15" }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                    {record.status?.toUpperCase()?.replace("_", " ")}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.quickStatusRow}>
                <Text style={styles.quickLabel}>Daily Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: "#fef2f2" }]}>
                  <Text style={[styles.statusText, { color: "#dc2626" }]}>ABSENT / UNMARKED</Text>
                </View>
              </View>
            )}
          </AppCard>

          {/* Regularization Banner if present */}
          {regInfo && (
            <View style={[styles.regBanner, { backgroundColor: regInfo.bg, borderColor: regInfo.text + "33" }]}>
              <Ionicons name="shield-checkmark" size={20} color={regInfo.text} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.regTitle, { color: regInfo.text }]}>{regInfo.label}</Text>
                {record.regularizationReason && (
                  <Text style={styles.regReason}>Reason: "{record.regularizationReason}"</Text>
                )}
                {record.regularizationStatus === "rejected" && record.rejectionReason && (
                  <Text style={[styles.regReason, { color: "#b91c1c", fontWeight: "700" }]}>
                    Rejection note: "{record.rejectionReason}"
                  </Text>
                )}
              </View>
            </View>
          )}

          {record ? (
            <>
              {/* Punch Logs Details */}
              <AppCard style={styles.detailsCard}>
                <Text style={styles.sectionHeading}>Punch Parameters (Sessions)</Text>
                
                {record.punchLog && record.punchLog.length > 0 ? (
                  record.punchLog.map((session, index) => (
                    <View key={index} style={{ marginBottom: 16, borderBottomWidth: index !== record.punchLog.length - 1 ? 1 : 0, borderBottomColor: '#e2e8f0', paddingBottom: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 }}>Session {index + 1}</Text>
                      
                      {/* Selfies for this session */}
                      {(session.punchInSelfie || session.punchOutSelfie) && (
                        <View style={[styles.selfieGrid, { marginTop: 8 }]}>
                          {session.punchInSelfie && (
                            <View style={styles.selfieBox}>
                              <Text style={styles.selfieLabel}>In Selfie</Text>
                              <TouchableOpacity onPress={() => setFullScreenImage(session.punchInSelfie)} activeOpacity={0.8}>
                                <Image source={{ uri: session.punchInSelfie }} style={styles.selfieImg} />
                              </TouchableOpacity>
                              <Text style={styles.selfieTime}>
                                {session.punchInTime ? new Date(session.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                              </Text>
                            </View>
                          )}
                          {session.punchOutSelfie && (
                            <View style={styles.selfieBox}>
                              <Text style={styles.selfieLabel}>Out Selfie</Text>
                              <TouchableOpacity onPress={() => setFullScreenImage(session.punchOutSelfie)} activeOpacity={0.8}>
                                <Image source={{ uri: session.punchOutSelfie }} style={styles.selfieImg} />
                              </TouchableOpacity>
                              <Text style={styles.selfieTime}>
                                {session.punchOutTime ? new Date(session.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <>
                    {(record.punchInSelfie || record.punchOutSelfie) && (
                      <View style={[styles.selfieGrid, { marginTop: 8 }]}>
                        {record.punchInSelfie && (
                          <View style={styles.selfieBox}>
                            <Text style={styles.selfieLabel}>Punch-In Selfie</Text>
                            <TouchableOpacity onPress={() => setFullScreenImage(record.punchInSelfie)} activeOpacity={0.8}>
                              <Image source={{ uri: record.punchInSelfie }} style={styles.selfieImg} />
                            </TouchableOpacity>
                            <Text style={styles.selfieTime}>
                              {record.punchInTime ? new Date(record.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </Text>
                          </View>
                        )}
                        {record.punchOutSelfie && (
                          <View style={styles.selfieBox}>
                            <Text style={styles.selfieLabel}>Punch-Out Selfie</Text>
                            <TouchableOpacity onPress={() => setFullScreenImage(record.punchOutSelfie)} activeOpacity={0.8}>
                              <Image source={{ uri: record.punchOutSelfie }} style={styles.selfieImg} />
                            </TouchableOpacity>
                            <Text style={styles.selfieTime}>
                              {record.punchOutTime ? new Date(record.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}

                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                  <DetailRow
                    label="Total Logged Hours"
                    value={record.totalHours ? formatWorkingHours(record.totalHours) : "—"}
                    icon="time"
                    color="#2563eb"
                  />
                </View>
              </AppCard>
            </>
          ) : (
            <AppCard style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyCardText}>No log records registered for this date.</Text>
            </AppCard>
          )}

          {/* Regularization Trigger Button — only allowed if not currently pending */}
          {(!record || record.regularizationStatus !== "pending") && (
            <AppButton
              title="Request Attendance Correction"
              onPress={() => navigation.navigate("RegularizationRequest", { date, attendanceId: record?._id })}
              style={styles.regBtn}
              variant="outline"
              icon="shield-alert-outline"
            />
          )}
        </ScrollView>
      )}

      {/* Full Screen Image Modal */}
      <Modal visible={!!fullScreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setFullScreenImage(null)}>
            <Ionicons name="close-circle" size={36} color="#ffffff" />
          </TouchableOpacity>
          {fullScreenImage && <Image source={{ uri: fullScreenImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
  },
  loaderText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 12,
    fontWeight: "600",
  },
  dateCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    marginLeft: 8,
  },
  quickStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  regBanner: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  regTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  regReason: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
  },
  detailsCard: {
    padding: 16,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  detailVal: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "700",
    marginTop: 2,
  },
  coordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  coordLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  coordVal: {
    fontSize: 12,
    color: "#1e293b",
    fontWeight: "700",
  },
  addressText: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 16,
  },
  selfieGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 4,
  },
  selfieBox: {
    alignItems: "center",
  },
  selfieLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 6,
  },
  selfieImg: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  emptyCardText: {
    fontSize: 13.5,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 12,
  },
  regBtn: {
    marginTop: 10,
  },
  selfieTime: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
});

export default EmployeeAttendanceDetailsScreen;
