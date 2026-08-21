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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { createEmployeeTaskApi } from "../../api/taskService";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";
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
    return `🔄 This template will auto-generate a new task ${freqText} at this exact time, with a deadline of ${deadlineTime}.`;
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Error", "Task title is required");
    if (!selectedDeptId) return Alert.alert("Error", "Please select a department");

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

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'high':
        return { color: '#EF4444', bg: '#FEE2E2', border: '#FCA5A5', icon: 'flame-outline' };
      case 'medium':
        return { color: '#F59E0B', bg: '#FEF3C7', border: '#FDE047', icon: 'alert-circle-outline' };
      default:
        return { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', icon: 'checkmark-circle-outline' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── Premium Hero Header ── */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 12) + 8 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitleText}>
            {repeatEnabled ? "Setup Personal Recurring Task" : "Create Personal Task"}
          </Text>
          <Text style={styles.headerSubtitleText}>
            Track your personal work, deadlines and targets
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Task Mode Switcher ── */}
        <View style={styles.modeSwitchContainer}>
          <TouchableOpacity
            style={[styles.modeSwitchBtn, !repeatEnabled && styles.modeSwitchBtnActive]}
            onPress={() => setRepeatEnabled(false)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={!repeatEnabled ? COLORS.white : COLORS.text.muted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeSwitchText, !repeatEnabled && styles.modeSwitchTextActive]}>
              One-Time Task
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeSwitchBtn, repeatEnabled && styles.modeSwitchBtnActive]}
            onPress={() => setRepeatEnabled(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="repeat-outline"
              size={16}
              color={repeatEnabled ? COLORS.white : COLORS.text.muted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeSwitchText, repeatEnabled && styles.modeSwitchTextActive]}>
              Recurring Task
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Core Details Card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Feather name="edit-3" size={16} color={COLORS.primary} />
            <Text style={styles.cardHeaderTitle}>Task Details</Text>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="What needs to be done? *"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.cardDivider} />

          <TextInput
            style={styles.descInput}
            placeholder="Add task notes, guidelines or reminders..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── Priority Selector ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="speedometer-outline" size={16} color={COLORS.slateMuted} />
          <Text style={styles.sectionTitleText}>Priority</Text>
        </View>

        <View style={styles.priorityRow}>
          {['low', 'medium', 'high'].map((p) => {
            const pStyle = getPriorityStyle(p);
            const isSelected = priority === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityChip,
                  isSelected && { backgroundColor: pStyle.bg, borderColor: pStyle.color }
                ]}
                onPress={() => setPriority(p)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={pStyle.icon}
                  size={15}
                  color={isSelected ? pStyle.color : COLORS.text.muted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.priorityChipText,
                    isSelected && { color: pStyle.color, fontFamily: FONTS.bodyBold }
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Department ── */}
        <View style={styles.sectionHeaderRow}>
          <Feather name="layers" size={16} color={COLORS.slateMuted} />
          <Text style={styles.sectionTitleText}>Department</Text>
        </View>

        <TouchableOpacity 
          style={styles.actionTriggerCard} 
          onPress={() => setDeptModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.actionTriggerLeft}>
            <View style={styles.iconBoxOrange}><Feather name="layers" size={16} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTriggerLabel}>Department *</Text>
              <Text style={styles.actionTriggerValue}>
                {departmentName || "Select Department *"}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* ── Schedule & Repetition Section ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.slateMuted} />
          <Text style={styles.sectionTitleText}>
            {repeatEnabled ? 'Recurring Schedule Settings' : 'Task Timeline & Deadlines'}
          </Text>
        </View>

        <View style={styles.card}>
          {repeatEnabled && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Repeat Frequency</Text>
              <View style={styles.segmentedControl}>
                {['daily', 'weekly', 'monthly'].map((rec) => {
                  const isSelected = repeatType === rec;
                  return (
                    <TouchableOpacity
                      key={rec}
                      style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                      onPress={() => setRepeatType(rec)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                        {rec.charAt(0).toUpperCase() + rec.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {repeatEnabled && repeatType === "weekly" && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Select Days of Week</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                  const isSelected = weeklyDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleWeeklyDay(day)}
                      style={[styles.dayChip, isSelected && styles.dayChipActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {repeatEnabled && repeatType === "monthly" && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Select Dates of Month</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(date => {
                  const isSelected = monthlyDates.includes(date);
                  return (
                    <TouchableOpacity
                      key={date}
                      onPress={() => toggleMonthlyDate(date)}
                      style={[styles.dateChip, isSelected && styles.dateChipActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                        {date}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.half}>
              <AppDatePicker
                label={repeatEnabled ? "Start Generating" : "Start Date"}
                value={startDate}
                onChangeText={(val) => { setStartDate(val); setNextFollowUpDate(val); }}
                compact
              />
            </View>
            <View style={styles.half}>
              {repeatEnabled ? (
                <AppTimePicker label="Daily Deadline" value={deadlineTime} onChangeText={setDeadlineTime} />
              ) : (
                <AppDatePicker label="End Date" value={endDate} onChangeText={setEndDate} compact />
              )}
            </View>
          </View>

          {!repeatEnabled && (
            <View style={[styles.row, { marginTop: 10 }]}>
              <View style={styles.half}>
                <AppTimePicker label="Time Deadline" value={deadlineTime} onChangeText={setDeadlineTime} />
              </View>
              <View style={styles.half}>
                <AppDatePicker label="Follow-up Date" value={nextFollowUpDate} onChangeText={setNextFollowUpDate} compact />
              </View>
            </View>
          )}

          {repeatEnabled && (
            <View style={{ marginTop: 14 }}>
              <AppDatePicker label="Stop Repeating On (Optional)" value={finishDate} onChangeText={setFinishDate} compact />
              
              <View style={styles.recurringInfoBanner}>
                <Ionicons name="information-circle-outline" size={18} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={styles.recurringInfoText}>
                  {getHelperText()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Attachments ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="document-attach-outline" size={16} color={COLORS.slateMuted} />
          <Text style={styles.sectionTitleText}>Attachments</Text>
        </View>

        <View style={styles.card}>
          <TaskAttachmentPicker attachments={attachments} onChange={setAttachments} />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky Bottom Footer Bar ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={styles.submitBtnContainer}
          onPress={handleSave} 
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Create Task</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Department Modal ── */}
      <Modal
        visible={deptModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {assignedDepartments.map(dept => {
                const isSelected = selectedDeptId === dept._id;
                return (
                  <TouchableOpacity 
                    key={dept._id} 
                    style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                    onPress={() => { 
                      setSelectedDeptId(dept._id); 
                      setDepartmentName(dept.name);
                      setDeptModalVisible(false); 
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Feather name="layers" size={16} color={isSelected ? COLORS.primary : COLORS.slateMuted} style={{ marginRight: 10 }} />
                      <Text style={styles.modalItemTitle}>{dept.name}</Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="#CBD5E1" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalCancelBtn} 
              onPress={() => setDeptModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
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
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justify: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitleText: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitleText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  modeSwitchBtnActive: {
    backgroundColor: COLORS.darkNavy,
    ...SHADOWS.sm,
  },
  modeSwitchText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.muted,
  },
  modeSwitchTextActive: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.darkNavy,
    marginLeft: 8,
  },
  titleInput: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: COLORS.darkNavy,
    paddingVertical: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  descInput: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 65,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitleText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: COLORS.slateMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  priorityChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.muted,
  },
  actionTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  actionTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBoxOrange: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionTriggerLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: COLORS.text.muted,
    textTransform: 'uppercase',
  },
  actionTriggerValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
    marginTop: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.darkNavy,
    ...SHADOWS.sm,
  },
  segmentText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12.5,
    color: COLORS.text.muted,
  },
  segmentTextActive: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  inputLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: COLORS.darkNavy,
    marginBottom: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  dayChipText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.primary,
  },
  dayChipTextActive: {
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  dateChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  dateChipText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.primary,
  },
  dateChipTextActive: {
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  half: {
    flex: 1,
    marginHorizontal: 2,
  },
  recurringInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginTop: 10,
  },
  recurringInfoText: {
    flex: 1,
    fontSize: 11.5,
    color: '#7C3AED',
    fontFamily: FONTS.bodyMedium,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  submitBtnContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  submitBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: COLORS.darkNavy,
  },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 8,
  },
  modalItemRowSelected: {
    backgroundColor: COLORS.primaryGhost,
  },
  modalItemTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  modalCancelBtn: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: COLORS.darkNavy,
  },
});

export default EmployeeCreateTaskScreen;
