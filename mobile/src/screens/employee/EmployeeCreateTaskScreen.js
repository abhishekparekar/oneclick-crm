import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { createEmployeeTaskApi } from "../../api/taskService";
import { parseDDMMYYYYToISO, formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { validateTaskDatesClient } from "../../utils/taskDateValidation";
import { loadTaskScheduleContext } from "../../utils/loadTaskScheduleContext";
import TaskAttachmentPicker from "../../components/TaskAttachmentPicker";
import AppDatePicker from "../../components/AppDatePicker";
import AppTimePicker from "../../components/AppTimePicker";
import { useAuth } from "../../context/AuthContext";

const EmployeeCreateTaskScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const [startDate, setStartDate] = useState(formatDateToDDMMYYYY(new Date()));
  const [endDate, setEndDate] = useState(formatDateToDDMMYYYY(new Date(Date.now() + 86400000 * 3)));
  const [deadlineTime, setDeadlineTime] = useState("17:00");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(formatDateToDDMMYYYY(new Date()));

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatType, setRepeatType] = useState("daily");
  const [finishDate, setFinishDate] = useState("");
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [monthlyDates, setMonthlyDates] = useState([]);

  const toggleWeeklyDay = (day) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleMonthlyDate = (date) => {
    setMonthlyDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [assignedDepartments, setAssignedDepartments] = useState([]);
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        const { getMyProfileApi } = require("../../api/employeeService");
        const profileRes = await getMyProfileApi().catch(() => null);

        if (profileRes && profileRes.data && profileRes.data.success && profileRes.data.employee) {
          const emp = profileRes.data.employee;
          const list = [];

          if (emp.departmentId) {
            const dId = typeof emp.departmentId === "object" ? emp.departmentId?._id : emp.departmentId;
            const dName = typeof emp.departmentId === "object" ? (emp.departmentId?.name || "My Department") : "My Department";
            if (dId) {
              list.push({ _id: dId, name: dName });
            }
          }

          if (Array.isArray(emp.departmentIds) && emp.departmentIds.length > 0) {
            emp.departmentIds.forEach(d => {
              if (!d) return;
              const id = typeof d === "object" ? d?._id : d;
              const name = typeof d === "object" ? (d?.name || "Department") : "Department";
              if (id && !list.some(x => String(x?._id) === String(id))) {
                list.push({ _id: id, name });
              }
            });
          }

          if (Array.isArray(emp.accessibleDepartments) && emp.accessibleDepartments.length > 0) {
            emp.accessibleDepartments.forEach(d => {
              if (!d) return;
              const id = typeof d === "object" ? d?._id : d;
              const name = typeof d === "object" ? (d?.name || "Department") : "Department";
              if (id && !list.some(x => String(x?._id) === String(id))) {
                list.push({ _id: id, name });
              }
            });
          }

          setAssignedDepartments(list);

          if (list.length > 0) {
            setSelectedDeptId(list[0]._id);
            setDepartmentName(list[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to initialize department in EmployeeCreateTaskScreen:", err);
      }
    };
    initData();
  }, []);

  const getHelperText = () => {
    let freqText = "every day";
    if (repeatType === "weekly") {
      const daysStr = weeklyDays.length > 0 ? weeklyDays.map(d => d.slice(0, 3)).join(", ") : "selected days";
      freqText = `every week on ${daysStr}`;
    } else if (repeatType === "monthly") {
      const datesStr = monthlyDates.length > 0 ? monthlyDates.join(", ") : "selected dates";
      freqText = `every month on the ${datesStr}`;
    }
    return `Auto-generates a task ${freqText} with deadline ${deadlineTime}.`;
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Required", "Please enter a task title");
    if (!selectedDeptId) return Alert.alert("Required", "Please select a department");

    setLoading(true);
    try {
      const startISO = startDate ? parseDDMMYYYYToISO(startDate) : undefined;
      const endISO = repeatEnabled ? startISO : (endDate ? parseDDMMYYYYToISO(endDate) : undefined);
      const scheduleContext = await loadTaskScheduleContext(user?.role);
      const dateCheck = validateTaskDatesClient({
        startDateISO: startISO,
        endDateISO: endISO,
        assigneeIds: user?.employeeId ? [user.employeeId] : [],
        workingDays: scheduleContext.workingDays,
        holidays: scheduleContext.holidays,
        approvedLeaves: scheduleContext.approvedLeaves,
      });
      if (!dateCheck.valid) {
        return Alert.alert("Invalid Task Dates", dateCheck.errors.join("\n"));
      }

      const payload = {
        title, description, priority,
        startDate: startISO,
        endDate: endISO,
        deadlineTime: deadlineTime || undefined,
        nextFollowUpDate: nextFollowUpDate ? parseDDMMYYYYToISO(nextFollowUpDate) : undefined,
        repeatEnabled,
        repeatType: repeatEnabled ? repeatType : undefined,
        weeklyDays: repeatEnabled && repeatType === "weekly" ? weeklyDays : undefined,
        monthlyDates: repeatEnabled && repeatType === "monthly" ? monthlyDates : undefined,
        finishDate: repeatEnabled && finishDate ? parseDDMMYYYYToISO(finishDate) : undefined,
        attachments,
        departmentId: selectedDeptId,
      };

      const res = await createEmployeeTaskApi(payload);
      if (res.data && res.data.success) {
        Alert.alert("Success", "Task created successfully!");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { key: "low", label: "Low", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0", icon: "checkmark-circle-outline" },
    { key: "medium", label: "Medium", color: "#F59E0B", bg: "#FEF3C7", border: "#FDE68A", icon: "alert-circle-outline" },
    { key: "high", label: "High", color: "#EF4444", bg: "#FEE2E2", border: "#FECACA", icon: "flame-outline" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Standard Crisp Modern Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 4 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {repeatEnabled ? "Setup Recurring Task" : "Create New Task"}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Personal Target & Milestones
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerRightAction, repeatEnabled && styles.headerRightActionActive]}
          onPress={() => setRepeatEnabled(!repeatEnabled)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={repeatEnabled ? "repeat" : "calendar-outline"}
            size={18}
            color={repeatEnabled ? "#1268D9" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Compact Task Type Segmenter ── */}
        <View style={styles.modeSegmentContainer}>
          <TouchableOpacity
            style={[styles.modeSegmentBtn, !repeatEnabled && styles.modeSegmentBtnActive]}
            onPress={() => setRepeatEnabled(false)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={!repeatEnabled ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeSegmentText, !repeatEnabled && styles.modeSegmentTextActive]}>
              One-Time Task
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeSegmentBtn, repeatEnabled && styles.modeSegmentBtnActive]}
            onPress={() => setRepeatEnabled(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="repeat-outline"
              size={15}
              color={repeatEnabled ? "#FFFFFF" : "#64748B"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeSegmentText, repeatEnabled && styles.modeSegmentTextActive]}>
              Recurring Task
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Core Task Information ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="create-outline" size={15} color="#1268D9" />
            <Text style={styles.sectionHeaderTitle}>TASK DETAILS</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Task Title *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="document-text-outline" size={16} color="#94A3B8" style={styles.inputPrefixIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Prepare Client Proposal / Complete Bugfixes"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </View>

          <View style={[styles.inputContainer, { marginTop: 10 }]}>
            <Text style={styles.inputLabel}>Description / Guidelines (Optional)</Text>
            <View style={[styles.inputWrap, { alignItems: "flex-start", paddingVertical: 8 }]}>
              <Ionicons name="reader-outline" size={16} color="#94A3B8" style={[styles.inputPrefixIcon, { marginTop: 2 }]} />
              <TextInput
                style={[styles.textInput, { minHeight: 60, textAlignVertical: "top" }]}
                placeholder="Add step-by-step notes, links, or instructions..."
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* ── 3. Priority & Department ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="options-outline" size={15} color="#1268D9" />
            <Text style={styles.sectionHeaderTitle}>CLASSIFICATION</Text>
          </View>

          {/* Priority Quick Select */}
          <Text style={styles.inputLabel}>Priority Level</Text>
          <View style={styles.priorityGrid}>
            {priorityOptions.map((opt) => {
              const isSelected = priority === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.priorityPill,
                    isSelected && { backgroundColor: opt.bg, borderColor: opt.color, borderWidth: 1.5 },
                  ]}
                  onPress={() => setPriority(opt.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={opt.icon}
                    size={14}
                    color={isSelected ? opt.color : "#64748B"}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.priorityPillText,
                      isSelected && { color: opt.color, fontWeight: "900" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Department Selection Card */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.inputLabel}>Assigned Department *</Text>
            <TouchableOpacity
              style={styles.deptCardTrigger}
              onPress={() => setDeptModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.deptIconCircle}>
                <Feather name="layers" size={15} color="#1268D9" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.deptCardText} numberOfLines={1}>
                  {departmentName || "Select Department *"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. Timeline & Deadlines ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={15} color="#1268D9" />
            <Text style={styles.sectionHeaderTitle}>
              {repeatEnabled ? "RECURRING SCHEDULE" : "TIMELINE & DEADLINES"}
            </Text>
          </View>

          {repeatEnabled && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Repeat Frequency</Text>
              <View style={styles.subSegmentContainer}>
                {["daily", "weekly", "monthly"].map((rec) => {
                  const isSelected = repeatType === rec;
                  return (
                    <TouchableOpacity
                      key={rec}
                      style={[styles.subSegmentBtn, isSelected && styles.subSegmentBtnActive]}
                      onPress={() => setRepeatType(rec)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.subSegmentText, isSelected && styles.subSegmentTextActive]}>
                        {rec.charAt(0).toUpperCase() + rec.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {repeatEnabled && repeatType === "weekly" && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Weekly Days</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                  const isSelected = weeklyDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleWeeklyDay(day)}
                      style={[styles.chipPill, isSelected && styles.chipPillActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipPillText, isSelected && styles.chipPillTextActive]}>
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {repeatEnabled && repeatType === "monthly" && (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Monthly Dates</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => {
                  const isSelected = monthlyDates.includes(date);
                  return (
                    <TouchableOpacity
                      key={date}
                      onPress={() => toggleMonthlyDate(date)}
                      style={[styles.miniDateCircle, isSelected && styles.miniDateCircleActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.miniDateText, isSelected && styles.miniDateTextActive]}>
                        {date}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.dateRow}>
            <View style={styles.halfCol}>
              <AppDatePicker
                label={repeatEnabled ? "Start Generating" : "Start Date"}
                value={startDate}
                onChangeText={(val) => {
                  setStartDate(val);
                  setNextFollowUpDate(val);
                }}
                compact
              />
            </View>
            <View style={styles.halfCol}>
              {repeatEnabled ? (
                <AppTimePicker label="Daily Deadline" value={deadlineTime} onChangeText={setDeadlineTime} />
              ) : (
                <AppDatePicker label="End Date" value={endDate} onChangeText={setEndDate} compact />
              )}
            </View>
          </View>

          {!repeatEnabled && (
            <View style={[styles.dateRow, { marginTop: 10 }]}>
              <View style={styles.halfCol}>
                <AppTimePicker label="Target Time" value={deadlineTime} onChangeText={setDeadlineTime} />
              </View>
              <View style={styles.halfCol}>
                <AppDatePicker label="Follow-up Date" value={nextFollowUpDate} onChangeText={setNextFollowUpDate} compact />
              </View>
            </View>
          )}

          {repeatEnabled && (
            <View style={{ marginTop: 12 }}>
              <AppDatePicker label="Stop Repeating On (Optional)" value={finishDate} onChangeText={setFinishDate} compact />
              <View style={styles.helperBanner}>
                <Ionicons name="information-circle-outline" size={16} color="#1268D9" style={{ marginRight: 6 }} />
                <Text style={styles.helperBannerText}>{getHelperText()}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── 5. Attachments ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="attach-outline" size={15} color="#1268D9" />
            <Text style={styles.sectionHeaderTitle}>ATTACHMENTS</Text>
          </View>
          <TaskAttachmentPicker attachments={attachments} onChange={setAttachments} />
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Fixed Bottom Submit Dock ── */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitButtonText}>
                {repeatEnabled ? "Save Recurring Schedule" : "Create Task"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Department Picker Modal ── */}
      <Modal
        visible={deptModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {assignedDepartments.map((dept) => {
                const isSelected = selectedDeptId === dept._id;
                return (
                  <TouchableOpacity
                    key={dept._id}
                    style={[styles.modalDeptRow, isSelected && styles.modalDeptRowActive]}
                    onPress={() => {
                      setSelectedDeptId(dept._id);
                      setDepartmentName(dept.name);
                      setDeptModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      <Feather
                        name="layers"
                        size={15}
                        color={isSelected ? "#1268D9" : "#64748B"}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.modalDeptText, isSelected && styles.modalDeptTextActive]}>
                        {dept.name}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#1268D9" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={18} color="#CBD5E1" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setDeptModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  headerRightAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightActionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  scrollContent: {
    padding: 12,
  },
  modeSegmentContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  modeSegmentBtnActive: {
    backgroundColor: "#1268D9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeSegmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  modeSegmentTextActive: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#1268D9",
    letterSpacing: 0.6,
  },
  inputContainer: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 40,
  },
  inputPrefixIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0F172A",
    paddingVertical: 6,
  },
  priorityGrid: {
    flexDirection: "row",
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priorityPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  deptCardTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  deptIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  deptCardText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  subSegmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
  },
  subSegmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
  },
  subSegmentBtnActive: {
    backgroundColor: "#1268D9",
  },
  subSegmentText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  subSegmentTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  chipPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  chipPillActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  chipPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  chipPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  miniDateCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  miniDateCircleActive: {
    backgroundColor: "#1268D9",
    borderColor: "#1268D9",
  },
  miniDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  miniDateTextActive: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  helperBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginTop: 8,
  },
  helperBannerText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "600",
    flex: 1,
  },
  bottomDock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1268D9",
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#1268D9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderRadius: 8,
  },
  modalDeptRowActive: {
    backgroundColor: "#EFF6FF",
  },
  modalDeptText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  modalDeptTextActive: {
    color: "#1268D9",
    fontWeight: "900",
  },
  modalCancelBtn: {
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#475569",
  },
});

export default EmployeeCreateTaskScreen;
