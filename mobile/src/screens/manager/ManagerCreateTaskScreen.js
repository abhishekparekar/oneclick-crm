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
import useManagerController from "../../controllers/managerController";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { parseDDMMYYYYToISO, formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { validateTaskDatesClient } from "../../utils/taskDateValidation";
import { loadTaskScheduleContext } from "../../utils/loadTaskScheduleContext";
import TaskAttachmentPicker from "../../components/TaskAttachmentPicker";
import AppDatePicker from "../../components/AppDatePicker";
import AppTimePicker from "../../components/AppTimePicker";

const ManagerCreateTaskScreen = ({ route, navigation }) => {
  const { defaultAssignmentType, isRecurring, defaultProjectId } = route.params || {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    createTeamTask,
    teamData,
    fetchTeam,
    dashboardData,
    fetchDashboard,
    taskPermissions,
    fetchTaskPermissions,
  } = useManagerController();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [checkpoints, setCheckpoints] = useState([]);
  
  const initialAssignmentType = defaultAssignmentType === "single" || defaultAssignmentType === "multiple"
    ? "multiple"
    : defaultAssignmentType || "multiple";
  const [assignmentType, setAssignmentType] = useState(initialAssignmentType);
  const [assigneeIds, setAssigneeIds] = useState([]);
  
  const [startDate, setStartDate] = useState(formatDateToDDMMYYYY(new Date()));
  const [endDate, setEndDate] = useState(formatDateToDDMMYYYY(new Date(Date.now() + 86400000 * 3)));
  const [deadlineTime, setDeadlineTime] = useState("17:00");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(formatDateToDDMMYYYY(new Date()));

  const [empModalVisible, setEmpModalVisible] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  const [repeatEnabled, setRepeatEnabled] = useState(!!isRecurring);
  const [repeatType, setRepeatType] = useState("daily");
  const [finishDate, setFinishDate] = useState("");
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [monthlyDates, setMonthlyDates] = useState([]);

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

  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  const allowedDepartments = React.useMemo(() => {
    if (!dashboardData?.manager) return [];
    const primary = {
      _id: dashboardData.manager.departmentId?._id || dashboardData.manager.departmentId || "",
      name: dashboardData.manager.departmentId?.name || dashboardData.manager.department || "My Department"
    };
    const list = [primary];
    
    if (dashboardData.manager.departmentIds && dashboardData.manager.departmentIds.length > 0) {
      dashboardData.manager.departmentIds.forEach(d => {
        const id = typeof d === "object" ? d._id : d;
        const name = typeof d === "object" ? d.name : "Department";
        if (id && !list.map(x => x._id.toString()).includes(id.toString())) {
          list.push({ _id: id, name });
        }
      });
    }

    if (dashboardData.manager.accessibleDepartments && dashboardData.manager.accessibleDepartments.length > 0) {
      dashboardData.manager.accessibleDepartments.forEach(d => {
        const id = typeof d === "object" ? d._id : d;
        const name = typeof d === "object" ? d.name : "Accessible Dept";
        if (id && !list.map(x => x._id.toString()).includes(id.toString())) {
          list.push({ _id: id, name });
        }
      });
    }
    return list.filter(d => d._id);
  }, [dashboardData]);

  useEffect(() => {
    if (allowedDepartments.length === 1 && !selectedDeptId) {
      setSelectedDeptId(allowedDepartments[0]._id);
    }
  }, [allowedDepartments, selectedDeptId]);

  const assignmentOptions = React.useMemo(() => {
    return [
      { label: "Myself", value: "self", icon: "person-outline" },
      { label: "Team", value: "multiple", icon: "people-outline" },
      { label: "Both", value: "both", icon: "git-network-outline" },
    ];
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchTeam(true);
    fetchTaskPermissions();
  }, [fetchDashboard, fetchTeam, fetchTaskPermissions]);

  const canCreateTasks = taskPermissions?.allowManagerCreateTask !== false;

  const availableAssignees = React.useMemo(() => {
    return teamData.filter(e => {
      const matchName = `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase());
      if (!selectedDeptId) return matchName;
      
      const matchesDept = (dept) => {
        if (!dept) return false;
        const id = typeof dept === "object" ? dept._id : dept;
        return id && selectedDeptId && id.toString() === selectedDeptId.toString();
      };
      
      const matchDept = matchesDept(e.departmentId) || 
        (e.departmentIds && e.departmentIds.some(matchesDept)) ||
        (e.accessibleDepartments && e.accessibleDepartments.some(matchesDept));
        
      return matchName && matchDept;
    });
  }, [teamData, empSearch, selectedDeptId]);

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
    if (!canCreateTasks) {
      return Alert.alert("Not Allowed", "Your company admin has disabled task creation for managers.");
    }
    if (!title.trim()) return Alert.alert("Error", "Task title is required");
    if (!selectedDeptId) return Alert.alert("Error", "Please select a department");
    if ((assignmentType === "multiple" || assignmentType === "both") && assigneeIds.length === 0) return Alert.alert("Error", "Please select at least one employee");

    setLoading(true);
    try {
      let finalAssignees = [];
      if (assignmentType === "self") {
        finalAssignees = [user.employeeId];
      } else if (assignmentType === "multiple") {
        finalAssignees = assigneeIds;
      } else if (assignmentType === "both") {
        finalAssignees = [user.employeeId, ...assigneeIds];
      }

      const startISO = startDate ? parseDDMMYYYYToISO(startDate) : undefined;
      const endISO = repeatEnabled ? startISO : (endDate ? parseDDMMYYYYToISO(endDate) : undefined);
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
        departmentId: selectedDeptId || undefined,
        assignedTo: finalAssignees,
        assignmentType: assignmentType,
        startDate: startISO,
        endDate: endISO,
        deadlineTime: deadlineTime || undefined,
        nextFollowUpDate: repeatEnabled ? undefined : (nextFollowUpDate ? parseDDMMYYYYToISO(nextFollowUpDate) : undefined),
        repeatEnabled,
        repeatType: repeatEnabled ? repeatType : undefined,
        finishDate: repeatEnabled && finishDate ? parseDDMMYYYYToISO(finishDate) : undefined,
        weeklyDays: repeatEnabled && repeatType === "weekly" ? weeklyDays : undefined,
        monthlyDates: repeatEnabled && repeatType === "monthly" ? monthlyDates : undefined,
        projectId: defaultProjectId || undefined,
        checklist: checkpoints.filter(c => c.title.trim() !== "").map(c => ({ title: c.title, isCompleted: false })),
        attachments,
      };

      await createTeamTask(payload);
      Alert.alert("Success", "Task created successfully!");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to save task");
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
            {isRecurring || repeatEnabled ? "Setup Recurring Task" : "Deploy New Task"}
          </Text>
          <Text style={styles.headerSubtitleText}>
            Assign work, set deadlines, and track execution
          </Text>
        </View>

        {repeatEnabled ? (
          <View style={styles.headerRecurringBadge}>
            <Ionicons name="repeat" size={14} color="#F97316" />
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Disabled Banner */}
        {!canCreateTasks && (
          <View style={styles.permissionBanner}>
            <Ionicons name="alert-circle" size={20} color="#B45309" style={{ marginRight: 8 }} />
            <Text style={styles.permissionBannerText}>
              Task creation is disabled for managers in your company settings.
            </Text>
          </View>
        )}

        {/* ── Task Mode Switcher (One-Time vs Recurring) ── */}
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
            placeholder="Add details, instructions, links or guidelines..."
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

        {/* ── Checkpoints / Checklist Section ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="checkbox-outline" size={16} color={COLORS.slateMuted} />
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
                placeholder="Enter checkpoint task (e.g. Code Review)..."
                placeholderTextColor="#94A3B8"
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
            onPress={() => setCheckpoints([...checkpoints, { title: "" }])}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.addCheckpointBtnText}>Add Checkpoint Item</Text>
          </TouchableOpacity>
        </View>

        {/* ── Assign To Section ── */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="people-outline" size={16} color={COLORS.slateMuted} />
          <Text style={styles.sectionTitleText}>Assign To</Text>
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
                  size={15}
                  color={isSelected ? COLORS.white : COLORS.text.muted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Department & Member Select Trigger Cards */}
        {assignmentType !== "self" ? (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            {/* 1. Select Department Button */}
            <TouchableOpacity 
              style={[styles.actionTriggerCard, { flex: 1 }]} 
              onPress={() => setDeptModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.actionTriggerLeft}>
                <View style={styles.iconBoxOrange}><Feather name="layers" size={16} color={COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTriggerLabel}>Department *</Text>
                  <Text style={styles.actionTriggerValue} numberOfLines={1}>
                    {selectedDeptId ? allowedDepartments.find(d => d._id === selectedDeptId)?.name || "Selected" : "Select Dept"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>

            {/* 2. Select Members Button */}
            <TouchableOpacity 
              style={[styles.actionTriggerCard, { flex: 1 }]} 
              onPress={() => setEmpModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.actionTriggerLeft}>
                <View style={styles.iconBoxOrange}><Feather name="users" size={16} color={COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTriggerLabel}>Team Members</Text>
                  <Text style={styles.actionTriggerValue} numberOfLines={1}>
                    {assigneeIds.length > 0 ? `${assigneeIds.length} Selected` : "Select Members"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        ) : (
          /* Department button if Myself is selected */
          <TouchableOpacity 
            style={[styles.actionTriggerCard, { marginBottom: 12 }]} 
            onPress={() => setDeptModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.actionTriggerLeft}>
              <View style={styles.iconBoxOrange}><Feather name="layers" size={18} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTriggerLabel}>Department *</Text>
                <Text style={styles.actionTriggerValue}>
                  {selectedDeptId ? allowedDepartments.find(d => d._id === selectedDeptId)?.name || "Selected" : "Select Department"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {/* Selected Department Pill */}
        {selectedDeptId && assignmentType !== "self" && (
          <View style={styles.chipsRow}>
            <View style={styles.deptChipPill}>
              <Feather name="layers" size={12} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.deptChipPillText}>
                Dept: {allowedDepartments.find(d => d._id === selectedDeptId)?.name || "Selected"}
              </Text>
            </View>
          </View>
        )}

        {/* Selected Members Chips */}
        {assigneeIds.length > 0 && assignmentType !== "self" && (
          <View style={styles.chipsRow}>
            {assigneeIds.map(id => {
              const emp = teamData.find(e => e._id === id);
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
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipActive
                      ]}
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
                      style={[
                        styles.dateChip,
                        isSelected && styles.dateChipActive
                      ]}
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

        {/* ── Attachments Section ── */}
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
          style={[styles.submitBtnContainer, !canCreateTasks && { opacity: 0.6 }]}
          onPress={handleSave} 
          disabled={loading || !canCreateTasks}
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
                <Text style={styles.submitBtnText}>
                  {repeatEnabled ? "Setup Recurring Task" : "Deploy Task"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Modal: Select Members ── */}
      <Modal visible={empModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Team Members</Text>
              <TouchableOpacity onPress={() => setEmpModalVisible(false)} style={styles.modalCloseIconBtn}>
                <Ionicons name="close" size={20} color={COLORS.darkNavy} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput 
                style={styles.modalSearchInput} 
                placeholder="Search team members by name..." 
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
              {availableAssignees.length === 0 ? (
                <Text style={styles.emptySearchText}>No team members found.</Text>
              ) : (
                availableAssignees.map(emp => {
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
                          if (!selectedDeptId) {
                            setSelectedDeptId(emp.departmentId?._id || emp.departmentId || emp.departmentIds?.[0] || "");
                          }
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
                            Dept: {[
                              emp.departmentId?.name || emp.departmentName || (typeof emp.departmentId === "object" ? emp.departmentId?.name : ""),
                              ...(emp.accessibleDepartments || []).map(d => typeof d === "object" ? d.name : d)
                            ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "Main"}
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
              {allowedDepartments
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
    justifyContent: 'space-between',
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
    justifyContent: 'center',
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
  headerRecurringBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE047',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  permissionBannerText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
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
  countBadge: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  countBadgeText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
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
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ROUNDING.lg,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  checkpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  checkpointBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkpointNum: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
  checkpointInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.text.primary,
    paddingVertical: 8,
  },
  deleteCheckpointBtn: {
    padding: 6,
  },
  addCheckpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryGhost,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 2,
  },
  addCheckpointBtnText: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
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
  actionTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  deptChipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deptChipPillText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primaryDark,
  },
  memberChipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 3,
    ...SHADOWS.sm,
  },
  memberChipAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.darkNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  memberChipAvatarText: {
    fontSize: 9,
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  memberChipText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.primary,
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
    alignItems: 'flex-start',
    marginHorizontal: -4,
  },
  half: {
    flex: 1,
    marginHorizontal: 4,
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
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.darkNavy,
    padding: 0,
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
  memberAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.darkNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: '#FFFFFF',
  },
  modalItemTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  modalItemSubtitle: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  emptySearchText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginVertical: 20,
  },
  modalDoneBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: '#FFFFFF',
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

export default ManagerCreateTaskScreen;
