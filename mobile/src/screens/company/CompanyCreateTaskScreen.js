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
import AppDatePicker from "../../components/AppDatePicker";
import AppTimePicker from "../../components/AppTimePicker";
import { getDepartmentsApi, createTaskApi, updateTaskApi } from "../../api/companyService";
import { getEmployeesApi } from "../../api/employeeService";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { parseDDMMYYYYToISO, formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { validateTaskDatesClient } from "../../utils/taskDateValidation";
import { loadTaskScheduleContext } from "../../utils/loadTaskScheduleContext";
import TaskAttachmentPicker from "../../components/TaskAttachmentPicker";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";

const combineDateAndTimeToISO = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    let hour = 10;
    let minute = 0;
    if (timeStr && timeStr.includes(":")) {
      const [h, m] = timeStr.split(":");
      hour = parseInt(h, 10) || 10;
      minute = parseInt(m, 10) || 0;
    }
    const d = new Date(year, month, day, hour, minute, 0);
    return d.toISOString();
  }
  return null;
};

const CompanyCreateTaskScreen = ({ route, navigation }) => {
  const { editingTask, isRecurring } = route.params || {};
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(editingTask?.title || "");
  const [description, setDescription] = useState(editingTask?.description || "");
  const [priority, setPriority] = useState(editingTask?.priority || "medium");
  const [assignmentType, setAssignmentType] = useState(
    editingTask?.departmentId ? "department" : 
    (editingTask?.assignmentType === "company" ? "company" : "multiple")
  );

  const initialAssigneeIds = editingTask?.assignedTo?.length > 0
    ? editingTask.assignedTo.map(a => a._id || a)
    : [];
  const [assigneeIds, setAssigneeIds] = useState(initialAssigneeIds);
  const [selectedDeptId, setSelectedDeptId] = useState(editingTask?.departmentId?._id || editingTask?.departmentId || "");

  const [startDate, setStartDate] = useState(editingTask?.startDate ? formatDateToDDMMYYYY(editingTask.startDate) : formatDateToDDMMYYYY(new Date()));
  const [endDate, setEndDate] = useState(editingTask?.endDate ? formatDateToDDMMYYYY(editingTask.endDate) : formatDateToDDMMYYYY(new Date(Date.now() + 86400000 * 3)));
  const [deadlineTime, setDeadlineTime] = useState(editingTask?.deadlineTime || "17:00");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(editingTask?.nextFollowUpDate ? formatDateToDDMMYYYY(editingTask.nextFollowUpDate) : formatDateToDDMMYYYY(new Date()));
  const [nextFollowUpTime, setNextFollowUpTime] = useState(editingTask?.nextFollowUpDate ? `${String(new Date(editingTask.nextFollowUpDate).getHours()).padStart(2, '0')}:${String(new Date(editingTask.nextFollowUpDate).getMinutes()).padStart(2, '0')}` : "10:00");

  const [repeatEnabled, setRepeatEnabled] = useState(editingTask?.repeatEnabled || isRecurring || false);
  const [repeatType, setRepeatType] = useState(editingTask?.repeatType || "daily");
  const [finishDate, setFinishDate] = useState(editingTask?.finishDate ? formatDateToDDMMYYYY(editingTask.finishDate) : "");
  const [weeklyDays, setWeeklyDays] = useState(editingTask?.weeklyDays || []);
  const [monthlyDates, setMonthlyDates] = useState(editingTask?.monthlyDates || []);

  const toggleWeeklyDay = (day) => {
    setWeeklyDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleMonthlyDate = (date) => {
    setMonthlyDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const initialCheckpoints = editingTask?.checklist?.length > 0
    ? editingTask.checklist.map(c => ({ title: c.title, isCompleted: c.isCompleted }))
    : [];
  const [checkpoints, setCheckpoints] = useState(initialCheckpoints);

  const [empModalVisible, setEmpModalVisible] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState(editingTask?.attachments || []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptRes = await getDepartmentsApi().catch(() => ({ data: { departments: [] } }));
        const empRes = await getEmployeesApi({ status: "active" }).catch((err) => {
          return { data: { employees: [] } };
        });

        if (deptRes.data?.departments) {
          setDepartments(deptRes.data.departments);
          if (deptRes.data.departments.length === 1 && !selectedDeptId) {
            setSelectedDeptId(deptRes.data.departments[0]._id);
          }
        }
        if (empRes.data?.employees) {
          setEmployees(empRes.data.employees);
          if (!editingTask && empRes.data.employees.length > 0) {
            setAssigneeIds([empRes.data.employees[0]._id]);
          }
        }
      } catch (err) {
        Alert.alert("Error", "Failed to load employees and departments.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [editingTask]);

  useEffect(() => {
    if (editingTask && editingTask.departmentId && employees.length > 0) {
      setSelectedDeptId(editingTask.departmentId._id || editingTask.departmentId);
    }
  }, [editingTask, employees]);

  const [modalDeptId, setModalDeptId] = useState("");

  const availableEmployees = React.useMemo(() => {
    return employees.filter(e => {
      const matchName = `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase());
      if (!modalDeptId) return matchName;
      if (e.role === "Manager") return matchName;
      
      const matchesDept = (dept) => {
        if (!dept) return false;
        const id = typeof dept === "object" ? dept._id : dept;
        return id && modalDeptId && id.toString() === modalDeptId.toString();
      };
      
      const matchDept = matchesDept(e.departmentId) || 
        (e.departmentIds && e.departmentIds.some(matchesDept)) ||
        (e.accessibleDepartments && e.accessibleDepartments.some(matchesDept));
        
      return matchName && matchDept;
    });
  }, [employees, empSearch, modalDeptId]);

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

  const submitForm = async () => {
    if (!title.trim()) return Alert.alert("Warning", "Task title is required");
    if (!selectedDeptId) return Alert.alert("Warning", "Please select a Department.");
    
    try {
      setSubmitting(true);
      let finalAssignees = [];
      if (assignmentType === "multiple") finalAssignees = assigneeIds;
      else if (assignmentType === "department") {
        finalAssignees = employees.filter(emp => (emp.departmentId?._id || emp.departmentId) === selectedDeptId).map(emp => emp._id);
      } else if (assignmentType === "company") {
        finalAssignees = employees.map(emp => emp._id);
      }

      const startISO = startDate ? parseDDMMYYYYToISO(startDate) : null;
      const endISO = repeatEnabled ? startISO : (endDate ? parseDDMMYYYYToISO(endDate) : null);
      const scheduleContext = await loadTaskScheduleContext(user?.role);
      const dateCheck = validateTaskDatesClient({
        startDateISO: startISO,
        endDateISO: endISO,
        assigneeIds: finalAssignees,
        workingDays: scheduleContext.workingDays,
        holidays: scheduleContext.holidays,
        approvedLeaves: scheduleContext.approvedLeaves,
      });
      if (!dateCheck.valid) {
        return Alert.alert("Invalid Task Dates", dateCheck.errors.join("\n"));
      }

      const payload = {
        title, description, priority,
        departmentId: selectedDeptId || null,
        assignedTo: finalAssignees,
        startDate: startISO,
        endDate: endISO,
        deadlineTime: deadlineTime || null,
        nextFollowUpDate: repeatEnabled ? null : (nextFollowUpDate ? combineDateAndTimeToISO(nextFollowUpDate, nextFollowUpTime) : null),
        repeatEnabled,
        repeatType: repeatEnabled ? repeatType : null,
        finishDate: repeatEnabled && finishDate ? parseDDMMYYYYToISO(finishDate) : null,
        weeklyDays: repeatEnabled && repeatType === "weekly" ? weeklyDays : null,
        monthlyDates: repeatEnabled && repeatType === "monthly" ? monthlyDates : null,
        checklist: checkpoints.filter(c => c.title.trim() !== "").map(c => ({ title: c.title, isCompleted: c.isCompleted || false })),
        attachments,
      };

      if (editingTask) {
        await updateTaskApi(editingTask._id, payload);
        queryClient.invalidateQueries(["companyTasks"]);
        queryClient.invalidateQueries(["tasks"]);
        queryClient.invalidateQueries(["teamTasks"]);
        queryClient.invalidateQueries(["myTasks"]);
        queryClient.invalidateQueries(["companyDashboard"]);
        Alert.alert("Success", "Task updated successfully");
      } else {
        const res = await createTaskApi(payload);
        queryClient.invalidateQueries(["companyTasks"]);
        queryClient.invalidateQueries(["tasks"]);
        queryClient.invalidateQueries(["teamTasks"]);
        queryClient.invalidateQueries(["myTasks"]);
        queryClient.invalidateQueries(["companyDashboard"]);
        const createdTask = res?.data?.task || res?.data?.data?.task || res?.task || res?.data;
        if (createdTask && (createdTask._id || createdTask.id)) {
          navigation.replace("CompanyTaskDetails", {
            taskId: createdTask._id || createdTask.id,
            task: createdTask,
            initialTask: createdTask,
          });
          return;
        }
        Alert.alert("Success", "Task created successfully");
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'high':
        return { color: '#DC2626', bg: '#DC2626', border: '#B91C1C', inactiveBg: '#FEF2F2', inactiveBorder: '#FECACA', inactiveColor: '#B91C1C', icon: 'flame-outline' };
      case 'medium':
        return { color: '#D97706', bg: '#D97706', border: '#B45309', inactiveBg: '#FFFBEB', inactiveBorder: '#FDE68A', inactiveColor: '#B45309', icon: 'alert-circle-outline' };
      default:
        return { color: '#059669', bg: '#059669', border: '#047857', inactiveBg: '#F0FDF4', inactiveBorder: '#BBF7D0', inactiveColor: '#047857', icon: 'checkmark-circle-outline' };
    }
  };

  const assignmentOptions = [
    { label: "Specific Staff", value: "multiple", icon: "people-outline" },
    { label: "Department", value: "department", icon: "layers-outline" },
    { label: "Entire Company", value: "company", icon: "business-outline" },
  ];

  return (
    <CompanyAdminLayout
      navigation={navigation}
      headerTitle={editingTask ? "Edit Company Task" : (repeatEnabled ? "Setup Recurring Task" : "Deploy Company Task")}
      showSearch={false}
      activeTab="Tasks"
    >
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
              color={!repeatEnabled ? COLORS.white : '#475569'}
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
              color={repeatEnabled ? COLORS.white : '#475569'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeSwitchText, repeatEnabled && styles.modeSwitchTextActive]}>
              Recurring Task
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Core Details ── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="edit-3" size={15} color="#1E40AF" />
            <Text style={styles.sectionTitleText}>Task Title & Instructions</Text>
          </View>

          <View style={styles.inputBox}>
            <TextInput
              style={styles.titleInput}
              placeholder="What needs to be done? *"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.inputBox, { marginTop: 8 }]}>
            <TextInput
              style={styles.descInput}
              placeholder="Add details, instructions, links or guidelines..."
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* ── Priority Selector ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="speedometer-outline" size={15} color="#1E40AF" />
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
                  isSelected
                    ? { backgroundColor: pStyle.bg, borderColor: pStyle.border }
                    : { backgroundColor: pStyle.inactiveBg, borderColor: pStyle.inactiveBorder }
                ]}
                onPress={() => setPriority(p)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={pStyle.icon}
                  size={15}
                  color={isSelected ? '#FFFFFF' : pStyle.inactiveColor}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.priorityChipText,
                    isSelected ? { color: '#FFFFFF', fontWeight: '800' } : { color: pStyle.inactiveColor, fontWeight: '700' }
                  ]}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Checkpoints / Checklist Section ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="checkbox-outline" size={15} color="#1E40AF" />
          <Text style={styles.sectionTitleText}>Checkpoints / Checklist</Text>
          {checkpoints.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{checkpoints.length}</Text>
            </View>
          )}
        </View>

        <View style={styles.checklistCard}>
          {checkpoints.map((cp, idx) => (
            <View key={idx} style={styles.checkpointRow}>
              <View style={styles.checkpointBullet}>
                <Text style={styles.checkpointNum}>{idx + 1}</Text>
              </View>
              <TextInput
                style={styles.checkpointInput}
                placeholder="Enter checkpoint task (e.g. Audit Approval)..."
                placeholderTextColor="#64748B"
                value={cp.title}
                onChangeText={(val) => {
                  const newCp = [...checkpoints];
                  newCp[idx].title = val;
                  setCheckpoints(newCp);
                }}
              />
              <TouchableOpacity 
                onPress={() => setCheckpoints(checkpoints.filter((_, i) => i !== idx))} 
                style={styles.deleteCheckpointBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity 
            style={styles.addCheckpointBtn}
            activeOpacity={0.85}
            onPress={() => setCheckpoints([...checkpoints, { title: "", isCompleted: false }])}
          >
            <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addCheckpointBtnText}>Add Checkpoint Item</Text>
          </TouchableOpacity>
        </View>

        {/* ── Assign To Section ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="people-outline" size={15} color="#1E40AF" />
          <Text style={styles.sectionTitleText}>Assign Scope</Text>
        </View>

        <View style={styles.segmentedControl}>
          {assignmentOptions.map((opt) => {
            const isSelected = assignmentType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                onPress={() => setAssignmentType(opt.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={opt.icon}
                  size={14}
                  color={isSelected ? COLORS.white : COLORS.text.muted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Trigger cards based on assignment type */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          {/* Select Department Button */}
          <TouchableOpacity 
            style={[styles.actionTriggerCard, { flex: 1 }]} 
            onPress={() => setDeptModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.actionTriggerLeft}>
              <View style={styles.iconBoxBlue}><Feather name="layers" size={16} color="#1268D9" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTriggerLabel}>Department *</Text>
                <Text style={styles.actionTriggerValue} numberOfLines={1}>
                  {selectedDeptId ? departments.find(d => d._id === selectedDeptId)?.name || "Selected" : "Select Dept"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
          </TouchableOpacity>

          {/* Select Staff Button (only if multiple) */}
          {assignmentType === "multiple" && (
            <TouchableOpacity 
              style={[styles.actionTriggerCard, { flex: 1 }]} 
              onPress={() => setEmpModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.actionTriggerLeft}>
                <View style={styles.iconBoxBlue}><Feather name="users" size={16} color="#1268D9" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTriggerLabel}>Select Staff</Text>
                  <Text style={styles.actionTriggerValue} numberOfLines={1}>
                    {assigneeIds.length > 0 ? `${assigneeIds.length} Selected` : "Select Staff"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Members Chips */}
        {assignmentType === "multiple" && assigneeIds.length > 0 && (
          <View style={styles.chipsRow}>
            {assigneeIds.map(id => {
              const emp = employees.find(e => e._id === id);
              if (!emp) return null;
              const initials = ((emp.firstName || "E")[0] + (emp.lastName || "")[0]).toUpperCase();
              return (
                <View key={id} style={styles.memberChipPill}>
                  <View style={styles.memberChipAvatar}>
                    <Text style={styles.memberChipAvatarText}>{initials}</Text>
                  </View>
                  <Text style={styles.memberChipText} numberOfLines={1}>
                    {emp.firstName} {emp.lastName}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setAssigneeIds(prev => prev.filter(x => x !== id))}
                    style={{ marginLeft: 4, padding: 2 }}
                  >
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Schedule Section ── */}
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

          {!repeatEnabled && (
            <View style={[styles.row, { marginTop: 10 }]}>
              <View style={styles.half}>
                <AppTimePicker label="Follow-up Time" value={nextFollowUpTime} onChangeText={setNextFollowUpTime} />
              </View>
              <View style={styles.half} />
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

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Sticky Bottom Footer Bar ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={styles.submitBtnContainer}
          onPress={submitForm} 
          disabled={submitting}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#1268D9', '#0D50B8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>
                  {editingTask ? "Update Task" : (repeatEnabled ? "Setup Recurring Task" : "Deploy Task")}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Modal: Select Staff ── */}
      <Modal visible={empModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Staff Members</Text>
              <TouchableOpacity onPress={() => setEmpModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput 
                style={styles.modalSearchInput} 
                placeholder="Search staff by name..." 
                value={empSearch} 
                onChangeText={setEmpSearch} 
                placeholderTextColor="#94A3B8"
              />
              {empSearch ? (
                <TouchableOpacity onPress={() => setEmpSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {availableEmployees.length === 0 ? (
                <Text style={styles.emptySearchText}>No staff members found.</Text>
              ) : (
                availableEmployees.map(emp => {
                  const isSelected = assigneeIds.includes(emp._id);
                  const initials = ((emp.firstName || "E")[0] + (emp.lastName || "")[0]).toUpperCase();
                  return (
                    <TouchableOpacity 
                      key={emp._id} 
                      style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setAssigneeIds(prev => prev.filter(id => id !== emp._id));
                        } else {
                          setAssigneeIds(prev => [...prev, emp._id]);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={styles.memberAvatarCircle}>
                          <Text style={styles.memberAvatarText}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.modalItemTitle}>{emp.firstName} {emp.lastName}</Text>
                          <Text style={styles.modalItemSubtitle}>
                            Dept: {emp.departmentId?.name || "Main Department"}
                          </Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={20} color="#CBD5E1" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalDoneBtn} 
              onPress={() => setEmpModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneBtnText}>Done ({assigneeIds.length} Selected)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Select Department ── */}
      <Modal visible={deptModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput 
                style={styles.modalSearchInput} 
                placeholder="Search departments..." 
                value={deptSearch} 
                onChangeText={setDeptSearch} 
                placeholderTextColor="#94A3B8"
              />
              {deptSearch ? (
                <TouchableOpacity onPress={() => setDeptSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {departments
                .filter(dept => dept.name.toLowerCase().includes(deptSearch.toLowerCase()))
                .map(dept => {
                  const isSelected = selectedDeptId === dept._id;
                  return (
                    <TouchableOpacity 
                      key={dept._id} 
                      style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                      onPress={() => { setSelectedDeptId(dept._id); setDeptModalVisible(false); }}
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
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitleText: {
    fontFamily: FONTS.displayBold,
    fontSize: 16.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitleText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 85,
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeSwitchBtnActive: {
    backgroundColor: '#0F172A',
  },
  modeSwitchText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: '#475569',
  },
  modeSwitchTextActive: {
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  // ── Seamless Core Details (No Cards) ──
  card: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleInput: {
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  descInput: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 52,
    textAlignVertical: 'top',
    padding: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginLeft: 2,
  },
  sectionTitleText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 6,
  },
  countBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 5,
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: '#1D4ED8',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  priorityChipText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  // ── Seamless Checklist (No Cards) ──
  checklistCard: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  checkpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  checkpointBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkpointNum: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  checkpointInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 6,
  },
  deleteCheckpointBtn: {
    padding: 4,
  },
  addCheckpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E40AF',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  addCheckpointBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#0F172A',
  },
  segmentText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    color: '#475569',
  },
  segmentTextActive: {
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  actionTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  actionTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBoxBlue: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionTriggerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    color: '#475569',
    textTransform: 'uppercase',
  },
  actionTriggerValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: '#0F172A',
    marginTop: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  memberChipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingLeft: 3,
    paddingRight: 6,
    paddingVertical: 2.5,
  },
  memberChipAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.darkNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  memberChipAvatarText: {
    fontSize: 8,
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  memberChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.primary,
  },
  inputLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    color: COLORS.darkNavy,
    marginBottom: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  dayChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.primary,
  },
  dayChipTextActive: {
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  dateChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  dateChipText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.primary,
  },
  dateChipTextActive: {
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: -3,
    marginBottom: 6,
  },
  half: {
    flex: 1,
    marginHorizontal: 3,
  },
  recurringInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  recurringInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#7C3AED',
    fontFamily: FONTS.bodyMedium,
    lineHeight: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitBtnContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1268D9',
  },
  submitBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 16,
    color: COLORS.darkNavy,
  },
  modalCloseIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: COLORS.darkNavy,
    padding: 0,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: 6,
  },
  modalItemRowSelected: {
    backgroundColor: COLORS.primaryGhost,
  },
  memberAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.darkNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  modalItemTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: COLORS.darkNavy,
  },
  modalItemSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 10.5,
    color: COLORS.text.muted,
    marginTop: 1,
  },
  emptySearchText: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginVertical: 16,
  },
  modalDoneBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.darkNavy,
  },
});

export default CompanyCreateTaskScreen;
