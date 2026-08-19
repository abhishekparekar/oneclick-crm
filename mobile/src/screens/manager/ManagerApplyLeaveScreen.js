import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ManagerLayout from "../../components/ManagerLayout";
import AppDatePicker from "../../components/AppDatePicker";
import { applyLeaveApi, getLeaveBalanceApi } from "../../api/leaveService";
import { parseDDMMYYYYToISO } from "../../utils/dateFormatter";

const LEAVE_TYPES = ["Casual", "Sick", "Annual", "Unpaid Leave"];

const ManagerApplyLeaveScreen = ({ navigation }) => {
  const [leaveType, setLeaveType] = useState("Casual");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [reason, setReason] = useState("");
  
  const [balance, setBalance] = useState({ casual: 10, sick: 8, annual: 15, lop: 0 });
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await getLeaveBalanceApi();
      if (res.data && res.data.success) {
        setBalance(res.data.balance || res.data);
      }
    } catch (err) {
      console.error("Failed to load leave balances:", err);
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const getComputedDays = () => {
    if (isHalfDay) return 0.5;
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(parseDDMMYYYYToISO(startDateStr));
    const end = new Date(parseDDMMYYYYToISO(endDateStr));
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    if (start > end) return 0;

    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApply = async () => {
    if (!startDateStr || (!isHalfDay && !endDateStr) || !reason.trim()) {
      Alert.alert("Fields Required", "Please fill in all details.");
      return;
    }

    const isoStart = parseDDMMYYYYToISO(startDateStr);
    const isoEnd = isHalfDay ? isoStart : parseDDMMYYYYToISO(endDateStr);
    const start = new Date(isoStart);
    const end = new Date(isoEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert("Invalid Date", "Please enter valid dates.");
      return;
    }
    if (start > end) {
      Alert.alert("Invalid Dates", "Start date must be on or before end date.");
      return;
    }

    const days = getComputedDays();
    const typeKey = leaveType.toLowerCase();
    const available = balance[typeKey] || 0;

    if (leaveType !== "LOP" && leaveType !== "Unpaid Leave" && days > available) {
      Alert.alert(
        "Notice",
        `You requested ${days} days but only have ${available} paid ${leaveType} leaves left. Any excess days will be automatically marked as Unpaid Leave.`
      );
    }

    try {
      setSubmitting(true);
      const res = await applyLeaveApi({
        leaveType,
        isHalfDay,
        startDate: isoStart,
        endDate: isoEnd,
        reason: reason.trim(),
      });

      if (res.data && res.data.success) {
        Alert.alert("Application Submitted", "Your leave application is pending approval.", [
          { text: "OK", onPress: () => navigation.navigate("ManagerMyLeave") },
        ]);
      }
    } catch (err) {
      console.error("Failed leave application:", err);
      const msg = err.response?.data?.message || "Failed to submit leave request.";
      Alert.alert("Submission Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const activeLimit = (leaveType !== "LOP" && leaveType !== "Unpaid Leave") ? balance[leaveType.toLowerCase()] || 0 : "Infinite";

  return (
    <ManagerLayout navigation={navigation} title="Request Time Off" backEnabled={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Application</Text>
        </View>

        <KeyboardAwareScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={100}
        >
          {/* Quick Balance Preview Card */}
          <View style={styles.balanceInfoCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#F97316" />
              <Text style={styles.balanceTitle}>Available {leaveType} Balance</Text>
            </View>
            {loadingBalance ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <Text style={styles.balanceCountText}>
                {activeLimit} {(leaveType !== "LOP" && leaveType !== "Unpaid Leave") ? "Days Left" : "Allowed"}
              </Text>
            )}
          </View>

          <View style={styles.formCard}>
            {/* Type selector */}
            <Text style={styles.fieldLabel}>LEAVE CATEGORY</Text>
            <View style={styles.typesRow}>
              {LEAVE_TYPES.map((type) => {
                const isActive = leaveType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typePill, isActive && styles.typePillActive]}
                    onPress={() => setLeaveType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeText, isActive && styles.typeTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Half Day Toggle */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Apply as Half Day</Text>
              <TouchableOpacity
                style={[styles.toggleSwitch, isHalfDay && styles.toggleSwitchActive]}
                onPress={() => setIsHalfDay(!isHalfDay)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, isHalfDay && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            {/* Date entries */}
            <AppDatePicker
              label="Start Date"
              value={startDateStr}
              onChangeText={setStartDateStr}
              placeholder="DD/MM/YYYY"
            />

            {!isHalfDay && (
              <AppDatePicker
                label="End Date"
                value={endDateStr}
                onChangeText={setEndDateStr}
                placeholder="DD/MM/YYYY"
              />
            )}

            {/* Calculated Days Preview */}
            {getComputedDays() > 0 && (
              <View style={styles.daysPreview}>
                <Ionicons name="time" size={16} color="#10B981" />
                <Text style={styles.daysPreviewText}>
                  Total Duration: {getComputedDays()} Days Requested
                </Text>
              </View>
            )}

            {/* Reason */}
            <Text style={styles.fieldLabel}>REASON FOR LEAVE</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Describe the reason..."
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleApply}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#F97316", "#EA580C"]} style={styles.submitBtnGradient}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Submit Leave Request</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  balanceInfoCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    borderWidth: 1,
    marginBottom: 16,
    alignItems: "center",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  balanceTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F97316",
    marginLeft: 6,
  },
  balanceCountText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#EA580C",
    marginTop: 2,
  },
  formCard: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.4,
  },
  typesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  typePill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  typePillActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  typeText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  typeTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBD5E1",
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: "#F97316",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  daysPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  daysPreviewText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
    marginLeft: 6,
  },
  reasonInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    fontSize: 13,
    color: "#1E293B",
    height: 90,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  submitBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export default ManagerApplyLeaveScreen;
