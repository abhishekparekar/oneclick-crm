import React, { useState, useEffect, useRef } from "react";
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
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getEmployeeTasksApi, startTaskTimerApi, stopTaskTimerApi } from "../../api/taskService";
import { getDailyTimesheetApi } from "../../api/timesheetService";

const WorkTrackerScreen = ({ route, navigation }) => {
  const { activeTaskId } = route.params || {};

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [activeTimesheetId, setActiveTimesheetId] = useState(null);

  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showStopModal, setShowStopModal] = useState(false);
  const [logDescription, setLogDescription] = useState("");
  const [savingLog, setSavingLog] = useState(false);

  const countRef = useRef(null);

  const fetchTasksList = async () => {
    try {
      setLoadingTasks(true);
      const res = await getEmployeeTasksApi({ status: "in-progress,todo,review" });
      if (res.data && res.data.success) {
        const list = res.data.tasks || [];
        setTasks(list);

        // Auto select if passed via params
        if (activeTaskId) {
          const match = list.find((t) => t._id === activeTaskId);
          if (match) setSelectedTask(match);
        } else if (list.length > 0 && !selectedTask) {
          setSelectedTask(list[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load tasks for stopwatch:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const getTodayDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const fetchTodayLogs = async () => {
    try {
      setLoadingLogs(true);
      const todayStr = getTodayDateStr();
      const res = await getDailyTimesheetApi(todayStr);
      if (res.data && res.data.success) {
        setRecentLogs(res.data.logs || []);
        
        // Restore running timer state if any today
        const activeTimer = res.data.logs?.find((log) => log.timerActive);
        if (activeTimer && !timerRunning) {
          setActiveTimesheetId(activeTimer._id);
          const start = new Date(activeTimer.startTime);
          const now = new Date();
          const elapsedSecs = Math.floor((now - start) / 1000);
          setSeconds(elapsedSecs > 0 ? elapsedSecs : 0);
          resumeTimerCount();
          setTimerRunning(true);
          
          // Set selected task to active timer task
          if (activeTimer.taskId) {
            setSelectedTask(activeTimer.taskId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoadingLogs(false);
      setRefreshing(false);
    }
  };

  const resumeTimerCount = () => {
    clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const startStopwatch = async () => {
    if (!selectedTask) {
      Alert.alert("Task Required", "Please select a task to track time against.");
      return;
    }
    try {
      setLoadingLogs(true);
      const res = await startTaskTimerApi(selectedTask._id);
      if (res.data && res.data.success) {
        setActiveTimesheetId(res.data.timesheet._id);
        setSeconds(0);
        resumeTimerCount();
        setTimerRunning(true);
        Alert.alert("Timer Started", `Stopwatch is now logging time for: ${selectedTask.title}`);
        fetchTodayLogs();
      }
    } catch (err) {
      console.error("Failed to start timer:", err);
      const msg = err.response?.data?.message || "Could not start timer.";
      Alert.alert("Timer Failed", msg);
    } finally {
      setLoadingLogs(false);
    }
  };

  const stopStopwatch = () => {
    clearInterval(countRef.current);
    setLogDescription(`Completed work on: ${selectedTask?.title}`);
    setShowStopModal(true);
  };

  const submitStopLog = async () => {
    try {
      setSavingLog(true);
      const res = await stopTaskTimerApi(selectedTask._id, {
        description: logDescription.trim() || `Stopwatch log for ${selectedTask.title}`,
      });

      if (res.data && res.data.success) {
        setTimerRunning(false);
        setSeconds(0);
        setActiveTimesheetId(null);
        setShowStopModal(false);
        setLogDescription("");
        Alert.alert("Work Logged", `Time successfully saved to database!`);
        fetchTodayLogs();
      }
    } catch (err) {
      console.error("Failed to stop timer:", err);
      Alert.alert("Logging Failed", "Failed to save timer logs.");
    } finally {
      setSavingLog(false);
    }
  };

  const cancelStopLog = () => {
    // Resume timer counting if they cancel stopping
    resumeTimerCount();
    setShowStopModal(false);
  };

  useEffect(() => {
    fetchTasksList();
    fetchTodayLogs();

    return () => clearInterval(countRef.current);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasksList();
    fetchTodayLogs();
  };

  const formatTime = (totalSecs) => {
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSecs % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <EmployeeLayout navigation={navigation} title="Work Tracker">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Timer</Text>
          <Text style={styles.subtitle}>Track active working hours on daily tasks</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
        >
          {/* Dropdown Task Picker */}
          <Text style={styles.selectorLabel}>ACTIVE TASK IN FOCUS</Text>
          <TouchableOpacity
            style={[styles.taskSelector, timerRunning && styles.disabledSelector]}
            onPress={() => !timerRunning && setShowTaskPicker(true)}
            disabled={timerRunning || loadingTasks}
          >
            {loadingTasks ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : selectedTask ? (
              <View style={styles.selectedTaskRow}>
                <Ionicons name="clipboard" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.selectedTaskTitle} numberOfLines={1}>
                  {selectedTask.title}
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderSelectorText}>Select an assigned task...</Text>
            )}
            {!timerRunning && <Ionicons name="chevron-down" size={18} color="#64748b" />}
          </TouchableOpacity>

          {/* Stopwatch Ring Dashboard */}
          <View style={styles.stopwatchCard}>
            <View style={[styles.timerCircle, timerRunning && styles.timerCircleRunning]}>
              <Text style={styles.timerText}>{formatTime(seconds)}</Text>
              <Text style={[styles.timerStatus, timerRunning && styles.timerStatusRunning]}>
                {timerRunning ? "RECORDING SESSION" : "SYSTEM IDLE"}
              </Text>
            </View>

            {/* Tracker Actions */}
            <View style={styles.controls}>
              {!timerRunning ? (
                <TouchableOpacity
                  style={[styles.btn, styles.startBtn, !selectedTask && styles.btnDisabled]}
                  onPress={startStopwatch}
                  disabled={!selectedTask}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={20} color="#ffffff" />
                  <Text style={styles.btnText}>Start Stopwatch</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.btn, styles.stopBtn]}
                  onPress={stopStopwatch}
                  activeOpacity={0.8}
                >
                  <Ionicons name="stop" size={20} color="#ffffff" />
                  <Text style={styles.btnText}>Stop & Log Time</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Session Logs list */}
          <Text style={styles.sectionTitle}>Today's Logged Sessions</Text>
          {loadingLogs && !refreshing ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 10 }} />
          ) : recentLogs.length === 0 ? (
            <View style={styles.emptyLogsCard}>
              <Ionicons name="time-outline" size={32} color="#94a3b8" />
              <Text style={styles.emptyLogsText}>No hours logged today yet.</Text>
            </View>
          ) : (
            recentLogs.map((log) => {
              const durationHrs = Number((log.totalMinutes / 60).toFixed(2));
              return (
                <AppCard key={log._id} style={styles.logCard}>
                  <View style={styles.logLeft}>
                    <View style={[styles.iconWrapper, log.timerActive && styles.activeIconWrapper]}>
                      <Ionicons
                        name={log.timerActive ? "pulse-outline" : "time"}
                        size={18}
                        color={log.timerActive ? "#e11d48" : "#2563eb"}
                      />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={styles.logProject}>{log.taskId?.title || log.description}</Text>
                      <Text style={styles.logDate}>
                        {log.timerActive ? "Timer currently running..." : log.description}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.logDuration, log.timerActive && styles.activeLogDuration]}>
                    {log.timerActive ? "Running" : `${durationHrs} hrs`}
                  </Text>
                </AppCard>
              );
            })
          )}
        </ScrollView>

        {/* Task Selection Modal */}
        <Modal visible={showTaskPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Assigned Task</Text>
                <TouchableOpacity onPress={() => setShowTaskPicker(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {tasks.length === 0 ? (
                  <Text style={styles.noTasksText}>No tasks currently assigned to you.</Text>
                ) : (
                  tasks.map((t) => (
                    <TouchableOpacity
                      key={t._id}
                      style={[styles.modalItem, selectedTask?._id === t._id && styles.modalItemActive]}
                      onPress={() => {
                        setSelectedTask(t);
                        setShowTaskPicker(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalItemTitle, selectedTask?._id === t._id && styles.modalItemTitleActive]}>
                          {t.title}
                        </Text>
                        <Text style={styles.modalItemProject}>Project: {t.projectId?.name || "General"}</Text>
                      </View>
                      {selectedTask?._id === t._id && <Ionicons name="checkmark" size={20} color="#2563eb" />}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Stop and Log Modal */}
        <Modal visible={showStopModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <AppCard style={styles.stopModalCard}>
              <Text style={styles.stopModalTitle}>Log Working Session</Text>
              <Text style={styles.stopModalSubtitle}>
                Add a quick summary of what was accomplished during this session.
              </Text>
              <TextInput
                style={styles.stopModalInput}
                placeholder="What did you accomplish?"
                placeholderTextColor="#94a3b8"
                value={logDescription}
                onChangeText={setLogDescription}
                multiline
              />
              <View style={styles.stopModalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={cancelStopLog}
                  disabled={savingLog}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={submitStopLog}
                  disabled={savingLog}
                >
                  {savingLog ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save Entry</Text>
                  )}
                </TouchableOpacity>
              </View>
            </AppCard>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  taskSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },
  disabledSelector: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  selectedTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedTaskTitle: {
    fontSize: 13.5,
    fontWeight: "750",
    color: "#1e293b",
    flex: 1,
  },
  placeholderSelectorText: {
    fontSize: 13.5,
    color: "#94a3b8",
    fontWeight: "500",
  },
  stopwatchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 3,
    shadowColor: "#0f172a",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  timerCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 6,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  timerCircleRunning: {
    borderColor: "#2563eb",
  },
  timerText: {
    fontSize: 32,
    fontWeight: "850",
    color: "#1e293b",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  timerStatus: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    marginTop: 6,
    letterSpacing: 1,
  },
  timerStatusRunning: {
    color: "#2563eb",
  },
  controls: {
    width: "100%",
    alignItems: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    width: "90%",
    elevation: 2,
  },
  startBtn: {
    backgroundColor: "#2563eb",
  },
  btnDisabled: {
    backgroundColor: "#94a3b8",
  },
  stopBtn: {
    backgroundColor: "#dc2626",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "750",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyLogsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyLogsText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 8,
  },
  logCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#ffffff",
    marginBottom: 10,
    borderRadius: 12,
  },
  logLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activeIconWrapper: {
    backgroundColor: "#ffe4e6",
  },
  logInfo: {
    flex: 1,
  },
  logProject: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1e293b",
  },
  logDate: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  logDuration: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#2563eb",
    marginLeft: 8,
  },
  activeLogDuration: {
    color: "#e11d48",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "75%",
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
  modalList: {
    marginTop: 10,
  },
  noTasksText: {
    textAlign: "center",
    fontSize: 13,
    color: "#94a3b8",
    paddingVertical: 30,
    fontStyle: "italic",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  modalItemActive: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  modalItemTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#334155",
  },
  modalItemTitleActive: {
    color: "#2563eb",
  },
  modalItemProject: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  stopModalCard: {
    width: "90%",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
  stopModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 6,
  },
  stopModalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 14,
  },
  stopModalInput: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#334155",
    height: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  stopModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  modalSaveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
});

export default WorkTrackerScreen;
