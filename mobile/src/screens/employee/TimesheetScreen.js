import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import { getEmployeeTasksApi } from "../../api/taskService";
import { getEmployeeProjectsApi } from "../../api/projectService";
import {
  createManualTimesheetApi,
  getDailyTimesheetApi,
  getWeeklyTimesheetApi,
} from "../../api/timesheetService";

const TimesheetScreen = ({ navigation }) => {
  const [activeSegment, setActiveSegment] = useState("daily"); // daily or weekly
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States for Logs
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyLogs, setDailyLogs] = useState([]);
  
  const [weeklySummary, setWeeklySummary] = useState({
    totalWeeklyHours: 0,
    projectsSummary: [],
    tasksSummary: [],
    logs: [],
  });

  // Modal manual log form states
  const [showManualModal, setShowManualModal] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [selectedProj, setSelectedProj] = useState(null);
  const [selectedTsk, setSelectedTsk] = useState(null);
  
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [showProjPicker, setShowProjPicker] = useState(false);
  const [showTskPicker, setShowTskPicker] = useState(false);
  const [savingManualLog, setSavingManualLog] = useState(false);

  const getFormattedDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const fetchTimesheetData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const dateStr = getFormattedDateStr(selectedDate);
      
      const [dailyRes, weeklyRes] = await Promise.all([
        getDailyTimesheetApi(dateStr),
        getWeeklyTimesheetApi(dateStr),
      ]);

      if (dailyRes.data && dailyRes.data.success) {
        setDailyLogs(dailyRes.data.logs || []);
      }

      if (weeklyRes.data && weeklyRes.data.success) {
        setWeeklySummary({
          totalWeeklyHours: weeklyRes.data.totalWeeklyHours || 0,
          projectsSummary: weeklyRes.data.projectsSummary || [],
          tasksSummary: weeklyRes.data.tasksSummary || [],
          logs: weeklyRes.data.logs || [],
        });
      }
    } catch (err) {
      console.error("Failed to load timesheet metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimesheetData();
  }, [selectedDate]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTimesheetData(false);
  };

  const loadFormSelectors = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        getEmployeeProjectsApi(),
        getEmployeeTasksApi({ status: "todo,in-progress,review" }),
      ]);
      if (projRes.data && projRes.data.success) {
        setProjectsList(projRes.data.projects || []);
      }
      if (taskRes.data && taskRes.data.success) {
        setTasksList(taskRes.data.tasks || []);
      }
    } catch (err) {
      console.error("Error loading selectors:", err);
    }
  };

  const handleOpenManualLog = () => {
    loadFormSelectors();
    setSelectedProj(null);
    setSelectedTsk(null);
    setLogHours("");
    setLogDesc("");
    setShowManualModal(true);
  };

  const submitManualLog = async () => {
    const hoursNum = parseFloat(logHours);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      Alert.alert("Invalid Input", "Please enter valid logged hours between 0.1 and 24.");
      return;
    }
    if (!logDesc.trim()) {
      Alert.alert("Description Required", "Please describe the work completed.");
      return;
    }

    try {
      setSavingManualLog(true);
      // Map hours to minutes
      const totalMinutes = Math.round(hoursNum * 60);
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - totalMinutes * 60 * 1000);

      const payload = {
        taskId: selectedTsk?._id || null,
        projectId: selectedProj?._id || null,
        startTime,
        endTime,
        totalMinutes,
        description: logDesc.trim(),
      };

      const res = await createManualTimesheetApi(payload);
      if (res.data && res.data.success) {
        setShowManualModal(false);
        Alert.alert("Success", "Hours logged successfully.");
        fetchTimesheetData(false);
      }
    } catch (err) {
      console.error("Failed manual log creation:", err);
      Alert.alert("Failed", "Could not log manual hours.");
    } finally {
      setSavingManualLog(false);
    }
  };

  const shiftDate = (days) => {
    const newD = new Date(selectedDate);
    newD.setDate(selectedDate.getDate() + days);
    setSelectedDate(newD);
  };

  // Calculate sum of daily logs
  const totalDailyHours = dailyLogs.reduce((sum, item) => sum + (item.totalMinutes || 0), 0) / 60;

  return (
    <EmployeeLayout navigation={navigation} title="Timesheets">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Timesheets</Text>
          <Text style={styles.subtitle}>View weekly summaries and log your working hours</Text>
        </View>

        {/* Date Selector Navigation bar */}
        <View style={styles.dateSelectorBar}>
          <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={20} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.dateLabelBlock}>
            <Ionicons name="calendar" size={16} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={styles.dateLabelText}>
              {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => shiftDate(1)} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Segments: Daily View / Weekly Breakdown */}
        <View style={styles.segmentWrapper}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === "daily" && styles.segmentBtnActive]}
            onPress={() => setActiveSegment("daily")}
          >
            <Text style={[styles.segmentText, activeSegment === "daily" && styles.segmentTextActive]}>
              Daily Logs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === "weekly" && styles.segmentBtnActive]}
            onPress={() => setActiveSegment("weekly")}
          >
            <Text style={[styles.segmentText, activeSegment === "weekly" && styles.segmentTextActive]}>
              Weekly breakdown
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : activeSegment === "daily" ? (
            <View>
              {/* Daily Summary Card */}
              <AppCard style={styles.summaryCard}>
                <View style={styles.sumItem}>
                  <Text style={styles.sumVal}>{totalDailyHours.toFixed(1)}</Text>
                  <Text style={styles.sumLabel}>Daily Hours Tracked</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.sumItem}>
                  <Text style={styles.sumVal}>{dailyLogs.length}</Text>
                  <Text style={styles.sumLabel}>Daily Work Sessions</Text>
                </View>
              </AppCard>

              {/* Log Manual Hours Button */}
              <AppButton
                title="Log Hours Manually"
                onPress={handleOpenManualLog}
                style={styles.addBtn}
                icon="add-circle-outline"
              />

              <Text style={styles.sectionTitle}>Daily Log list</Text>
              {dailyLogs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="hourglass-outline" size={40} color="#94a3b8" />
                  <Text style={styles.emptyText}>No timesheet logs for this date.</Text>
                </View>
              ) : (
                dailyLogs.map((log) => {
                  const hrsSpent = Number((log.totalMinutes / 60).toFixed(2));
                  return (
                    <AppCard key={log._id} style={styles.logCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.logTaskTitle}>{log.taskId?.title || "General Operation"}</Text>
                        <View style={[styles.badge, { backgroundColor: log.isManual ? "#fef3c7" : "#eff6ff" }]}>
                          <Text style={[styles.badgeText, { color: log.isManual ? "#d97706" : "#2563eb" }]}>
                            {log.isManual ? "MANUAL" : "TIMER"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.logDescText}>{log.description}</Text>
                      {log.projectId && (
                        <View style={styles.projTag}>
                          <Ionicons name="folder-outline" size={12} color="#475569" />
                          <Text style={styles.projTagText}>{log.projectId?.name}</Text>
                        </View>
                      )}
                      <View style={styles.divider} />
                      <View style={styles.cardFooter}>
                        <View style={styles.hoursRow}>
                          <Ionicons name="time-outline" size={14} color="#64748b" />
                          <Text style={styles.hoursText}>{hrsSpent} hours spent</Text>
                        </View>
                        <Text style={styles.timeValueText}>
                          {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </AppCard>
                  );
                })
              )}
            </View>
          ) : (
            <View>
              {/* Weekly Summary Metrics */}
              <AppCard style={styles.summaryCard}>
                <View style={styles.sumItem}>
                  <Text style={styles.sumVal}>{weeklySummary.totalWeeklyHours}</Text>
                  <Text style={styles.sumLabel}>Weekly Hours Logged</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.sumItem}>
                  <Text style={styles.sumVal}>{weeklySummary.logs.length}</Text>
                  <Text style={styles.sumLabel}>Weekly Log Entries</Text>
                </View>
              </AppCard>

              {/* Total Hours Grouped by Project */}
              <Text style={styles.sectionTitle}>Total Hours by Project</Text>
              <AppCard style={[styles.groupedCard, { marginBottom: 20 }]}>
                {weeklySummary.projectsSummary.length === 0 ? (
                  <Text style={styles.noGroupText}>No project hours logged this week.</Text>
                ) : (
                  weeklySummary.projectsSummary.map((proj, i) => {
                    const pct = weeklySummary.totalWeeklyHours > 0
                      ? (proj.totalHours / weeklySummary.totalWeeklyHours) * 100
                      : 0;

                    return (
                      <View key={proj.projectId || i} style={styles.groupedRow}>
                        <View style={styles.groupedRowLabel}>
                          <Text style={styles.groupNameText}>{proj.projectName}</Text>
                          <Text style={styles.groupHoursText}>{proj.totalHours} hrs</Text>
                        </View>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: "#2563eb" }]} />
                        </View>
                      </View>
                    );
                  })
                )}
              </AppCard>

              {/* Total Hours Grouped by Task */}
              <Text style={styles.sectionTitle}>Total Hours by Task</Text>
              <AppCard style={styles.groupedCard}>
                {weeklySummary.tasksSummary.length === 0 ? (
                  <Text style={styles.noGroupText}>No task hours logged this week.</Text>
                ) : (
                  weeklySummary.tasksSummary.map((tsk, i) => {
                    const pct = weeklySummary.totalWeeklyHours > 0
                      ? (tsk.totalHours / weeklySummary.totalWeeklyHours) * 100
                      : 0;

                    return (
                      <View key={tsk.taskId || i} style={styles.groupedRow}>
                        <View style={styles.groupedRowLabel}>
                          <Text style={styles.groupNameText} numberOfLines={1}>
                            {tsk.taskTitle}
                          </Text>
                          <Text style={styles.groupHoursText}>{tsk.totalHours} hrs</Text>
                        </View>
                        <View style={styles.barBg}>
                          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: "#10b981" }]} />
                        </View>
                      </View>
                    );
                  })
                )}
              </AppCard>
            </View>
          )}
        </ScrollView>

        {/* Manual Time Logging Dialog */}
        <Modal visible={showManualModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manual Time Entry</Text>
                <TouchableOpacity onPress={() => setShowManualModal(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {/* Project Selector */}
                <Text style={styles.fieldLabel}>ASSOCIATED PROJECT</Text>
                <TouchableOpacity
                  style={styles.fieldSelector}
                  onPress={() => setShowProjPicker(true)}
                >
                  <Text style={[styles.selectorValue, !selectedProj && { color: "#94a3b8" }]}>
                    {selectedProj ? selectedProj.name : "Select Project..."}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>

                {/* Task Selector */}
                <Text style={styles.fieldLabel}>ASSOCIATED TASK</Text>
                <TouchableOpacity
                  style={styles.fieldSelector}
                  onPress={() => setShowTskPicker(true)}
                >
                  <Text style={[styles.selectorValue, !selectedTsk && { color: "#94a3b8" }]}>
                    {selectedTsk ? selectedTsk.title : "Select Task..."}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>

                {/* Log Hours */}
                <Text style={styles.fieldLabel}>LOG HOURS WORKED</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  placeholder="e.g. 4.5"
                  placeholderTextColor="#94a3b8"
                  value={logHours}
                  onChangeText={setLogHours}
                />

                {/* Description */}
                <Text style={styles.fieldLabel}>WORK DESCRIPTION</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 80, textAlignVertical: "top" }]}
                  placeholder="What did you work on?"
                  placeholderTextColor="#94a3b8"
                  value={logDesc}
                  onChangeText={setLogDesc}
                  multiline
                />

                <AppButton
                  title="Submit Timesheet Log"
                  onPress={submitManualLog}
                  loading={savingManualLog}
                  style={styles.modalSubmitBtn}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Project Selector Modal */}
        <Modal visible={showProjPicker} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Project</Text>
                <TouchableOpacity onPress={() => setShowProjPicker(false)}>
                  <Ionicons name="close" size={20} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => { setSelectedProj(null); setShowProjPicker(false); }}
                >
                  <Text style={{ fontWeight: "700", color: "#64748b" }}>General/None</Text>
                </TouchableOpacity>
                {projectsList.map((p) => (
                  <TouchableOpacity
                    key={p._id}
                    style={styles.pickerItem}
                    onPress={() => { setSelectedProj(p); setShowProjPicker(false); }}
                  >
                    <Text style={styles.pickerItemText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Task Selector Modal */}
        <Modal visible={showTskPicker} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Task</Text>
                <TouchableOpacity onPress={() => setShowTskPicker(false)}>
                  <Ionicons name="close" size={20} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => { setSelectedTsk(null); setShowTskPicker(false); }}
                >
                  <Text style={{ fontWeight: "700", color: "#64748b" }}>General/None</Text>
                </TouchableOpacity>
                {tasksList.map((t) => (
                  <TouchableOpacity
                    key={t._id}
                    style={styles.pickerItem}
                    onPress={() => { setSelectedTsk(t); setShowTskPicker(false); }}
                  >
                    <Text style={styles.pickerItemText}>{t.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  dateSelectorBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  dateLabelBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dateLabelText: {
    fontSize: 12.5,
    fontWeight: "750",
    color: "#2563eb",
  },
  segmentWrapper: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    marginRight: 6,
  },
  segmentBtnActive: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 14,
  },
  sumItem: {
    flex: 1,
    alignItems: "center",
  },
  sumVal: {
    fontSize: 22,
    fontWeight: "850",
    color: "#2563eb",
  },
  sumLabel: {
    fontSize: 11,
    fontWeight: "650",
    color: "#64748b",
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e2e8f0",
  },
  addBtn: {
    marginBottom: 20,
    backgroundColor: "#2563eb",
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "650",
    marginTop: 8,
  },
  logCard: {
    padding: 14,
    backgroundColor: "#ffffff",
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  logTaskTitle: {
    fontSize: 14,
    fontWeight: "750",
    color: "#1e293b",
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  logDescText: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 8,
  },
  projTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  projTagText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 3,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hoursText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 4,
  },
  timeValueText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  groupedCard: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 14,
  },
  noGroupText: {
    fontSize: 12.5,
    color: "#94a3b8",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 14,
  },
  groupedRow: {
    marginBottom: 14,
  },
  groupedRowLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  groupNameText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    flex: 1,
    marginRight: 10,
  },
  groupHoursText: {
    fontSize: 12.5,
    fontWeight: "750",
    color: "#1e293b",
  },
  barBg: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "85%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  modalBody: {
    marginTop: 14,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  selectorValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  fieldInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#334155",
    marginBottom: 14,
  },
  modalSubmitBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  pickerModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "60%",
    padding: 16,
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  pickerItemText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#334155",
  },
});

export default TimesheetScreen;
