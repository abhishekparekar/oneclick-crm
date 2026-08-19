import { useState, useCallback, useRef } from "react";
import * as managerApi from "../api/managerApi";
import * as attendanceService from "../api/attendanceService";

/**
 * useManagerController
 * Central hook for all Manager data. Screens import this
 * instead of calling the API layer directly.
 */
const useManagerController = () => {
  // ── Dashboard ─────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  const isFetchingDashboardRef = useRef(false);

  const fetchDashboard = useCallback(async (force = false, params = {}) => {
    if (isFetchingDashboardRef.current) return;
    if (!force && dashboardData && Object.keys(params).length === 0) return;
    isFetchingDashboardRef.current = true;
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const res = await managerApi.getManagerDashboard(params);
      setDashboardData(res.data || res);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err.message || "Failed to load dashboard";
      setDashboardError(msg);
      console.error("[ManagerController] Dashboard error:", msg);
    } finally {
      isFetchingDashboardRef.current = false;
      setLoadingDashboard(false);
    }
  }, [dashboardData]);

  const refreshDashboard = useCallback((params = {}) => fetchDashboard(true, params), [fetchDashboard]);

  // ── Team ─────────────────────────────────────────────────
  const [teamData, setTeamData] = useState([]);
  const [teamSummary, setTeamSummary] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState(null);

  const fetchTeam = useCallback(async (force = false, params = {}) => {
    if (loadingTeam) return;
    if (!force && teamData.length > 0 && Object.keys(params).length === 0) return;
    setLoadingTeam(true);
    setTeamError(null);
    try {
      const res = await managerApi.getManagerTeam(params);
      setTeamData(res.data?.teamMembers || []);
      setTeamSummary(res.data?.summary || null);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to load team";
      setTeamError(msg);
      console.error("[ManagerController] Team error:", msg);
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  const refreshTeam = useCallback(() => fetchTeam(true), [fetchTeam]);

  // ── Team Org ─────────────────────────────────────────────
  const [teamOrgData, setTeamOrgData] = useState(null);
  const [loadingTeamOrg, setLoadingTeamOrg] = useState(false);
  const [teamOrgError, setTeamOrgError] = useState(null);

  const fetchTeamOrg = useCallback(async (force = false) => {
    if (loadingTeamOrg) return;
    if (!force && teamOrgData) return;
    setLoadingTeamOrg(true);
    setTeamOrgError(null);
    try {
      const res = await managerApi.getTeamOrg();
      setTeamOrgData(res.data || null);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to load org";
      setTeamOrgError(msg);
    } finally {
      setLoadingTeamOrg(false);
    }
  }, []);

  const refreshTeamOrg = useCallback(() => fetchTeamOrg(true), [fetchTeamOrg]);

  // ── Team Member Details ──────────────────────────────────
  const [memberDetailsMap, setMemberDetailsMap] = useState({});
  const [loadingMember, setLoadingMember] = useState(false);

  const fetchTeamMember = useCallback(async (employeeId, force = false) => {
    if (!force && memberDetailsMap[employeeId]) return memberDetailsMap[employeeId];
    setLoadingMember(true);
    try {
      const res = await managerApi.getTeamMemberById(employeeId);
      const data = res.data || null;
      setMemberDetailsMap(prev => ({ ...prev, [employeeId]: data }));
      return data;
    } catch (err) {
      console.error("[ManagerController] Fetch member error:", err.message);
      return null;
    } finally {
      setLoadingMember(false);
    }
  }, [memberDetailsMap]);


  // ── Tasks ───────────────────────────────────────────
  const [taskPermissions, setTaskPermissions] = useState(null);
  const fetchTaskPermissions = useCallback(async () => {
    try {
      const res = await managerApi.getTaskPermissions();
      setTaskPermissions(res.data?.data || res.data || null);
    } catch (err) {
      console.error("Task Permissions Error:", err.message);
    }
  }, []);

  const [myManagerTasks, setMyManagerTasks] = useState([]);
  const fetchMyManagerTasks = useCallback(async (force = false) => {
    if (loadingTasks) return;
    if (!force && myManagerTasks.length > 0) return;
    setLoadingTasks(true);
    setTasksError(null);
    try {
      const [res, tplRes] = await Promise.all([
        managerApi.getMyManagerTasks().catch(() => ({ data: [] })),
        managerApi.getMyManagerTasks({ isTemplate: true }).catch(() => ({ data: [] }))
      ]);
      const tasks = res.data?.data || res.data || [];
      const templates = tplRes.data?.data || tplRes.data || [];
      setMyManagerTasks([...tasks, ...templates]);
    } catch (err) {
      setTasksError(err?.response?.data?.message || err.message);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  const fetchTeamTasks = useCallback(async (force = false, params = {}) => {
    if (loadingTasks) return;
    if (!force && teamTasks.length > 0 && Object.keys(params).length === 0) return;
    setLoadingTasks(true);
    setTasksError(null);
    try {
      const [res, tplRes] = await Promise.all([
        managerApi.getTeamTasks(params).catch(() => ({ data: { data: [] } })),
        managerApi.getTeamTasks({ ...params, isTemplate: true }).catch(() => ({ data: { data: [] } }))
      ]);
      const tasks = res.data?.data || res.data || [];
      const templates = tplRes.data?.data || tplRes.data || [];
      setTeamTasks([...tasks, ...templates]);
    } catch (err) {
      setTasksError(err?.response?.data?.message || err.message);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const createTeamTask = useCallback(async (payload) => {
    const res = await managerApi.createTask(payload);
    await fetchTeamTasks(true);
    return res;
  }, [fetchTeamTasks]);

  const getTaskDetailsData = useCallback(async (id) => {
    const res = await managerApi.getTaskById(id);
    return res.data;
  }, []);

  const updateTaskData = useCallback(async (id, payload) => {
    const res = await managerApi.updateTask(id, payload);
    await fetchTeamTasks(true);
    return res;
  }, [fetchTeamTasks]);

  const removeTask = useCallback(async (id) => {
    const res = await managerApi.deleteTask(id);
    await fetchTeamTasks(true);
    return res;
  }, [fetchTeamTasks]);

  const updateTaskStatusData = useCallback(async (id, status, payload = "") => {
    const res = await managerApi.updateTaskStatus(id, status, payload);
    await fetchTeamTasks(true);
    return res;
  }, [fetchTeamTasks]);

  const addComment = useCallback(async (id, comment, attachments = []) => {
    const res = await managerApi.addTaskComment(id, comment, attachments);
    return res;
  }, []);

  const uploadMedia = useCallback(async (formData) => {
    const res = await managerApi.uploadMediaFile(formData);
    return res;
  }, []);

  const updateChecklist = useCallback(async (id, subtasks) => {
    const res = await managerApi.updateTaskChecklist(id, subtasks);
    return res;
  }, []);

  // ── Projects ─────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);

  const fetchProjects = useCallback(async (force = false) => {
    if (loadingProjects) return;
    if (!force && projects.length > 0) return;
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      const res = await managerApi.getManagerProjects();
      setProjects(res.data?.data || res.data || []);
    } catch (err) {
      setProjectsError(err?.response?.data?.message || err.message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const getProjectDetailsData = useCallback(async (id) => {
    const res = await managerApi.getManagerProjectById(id);
    return res.data;
  }, []);

  const getProjectTasksList = useCallback(async (id) => {
    const res = await managerApi.getProjectTasks(id);
    return res.data;
  }, []);

  const getProjectActivityLog = useCallback(async (id) => {
    const res = await managerApi.getManagerProjectActivity(id);
    return res.data;
  }, []);

  // ── Timesheet / Work Tracking ────────────────────────────
  const [myTimesheetData, setMyTimesheetData] = useState([]);
  const [teamTimesheetData, setTeamTimesheetData] = useState([]);

  const fetchMyTimesheet = useCallback(async (params = {}) => {
    try {
      const res = await managerApi.getMyTimesheet(params);
      setMyTimesheetData(res.data || []);
      return res.data;
    } catch (err) {
      console.error("Fetch My Timesheet Error:", err.message);
      return [];
    }
  }, []);

  const fetchTeamTimesheet = useCallback(async (params = {}) => {
    try {
      const res = await managerApi.getTeamTimesheet(params);
      setTeamTimesheetData(res.data || []);
      return res.data;
    } catch (err) {
      console.error("Fetch Team Timesheet Error:", err.message);
      return [];
    }
  }, []);

  const startTimer = useCallback(async (payload) => {
    const res = await managerApi.startWork(payload);
    await fetchMyTimesheet();
    return res;
  }, [fetchMyTimesheet]);

  const stopTimer = useCallback(async () => {
    const res = await managerApi.stopWork();
    await fetchMyTimesheet();
    return res;
  }, [fetchMyTimesheet]);

  const addManualTime = useCallback(async (payload) => {
    const res = await managerApi.addManualWork(payload);
    await fetchMyTimesheet();
    return res;
  }, [fetchMyTimesheet]);

  const approveTimesheetData = useCallback(async (id) => {
    const res = await managerApi.approveTimesheet(id);
    await fetchTeamTimesheet();
    return res;
  }, [fetchTeamTimesheet]);

  // ── Notifications ─────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsLoadingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (notificationsLoadingRef.current) return;
    notificationsLoadingRef.current = true;
    setLoadingNotifications(true);
    try {
      const res = await managerApi.getMyNotifications();
      setNotifications(res.data || res.notifications || []);
    } catch (err) {
      console.error("[ManagerController] Notifications error:", err.message);
    } finally {
      notificationsLoadingRef.current = false;
      setLoadingNotifications(false);
    }
  }, []);

  // ── Own Attendance ────────────────────────────────────────
  const [ownTodayAttendance, setOwnTodayAttendance] = useState(null);
  const [ownMonthlyAttendance, setOwnMonthlyAttendance] = useState([]);
  const [loadingOwnAttendance, setLoadingOwnAttendance] = useState(false);
  const [permissions, setPermissions] = useState(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await managerApi.getAttendancePermissions();
      setPermissions(res.data || null);
    } catch (err) {
      console.error("Permissions error", err.message);
    }
  }, []);

  const getManagerTodayAttendance = useCallback(async (force = false) => {
    if (loadingOwnAttendance && !force) return;
    setLoadingOwnAttendance(true);
    try {
      const res = await attendanceService.getMyTodayApi();
      setOwnTodayAttendance(res.data || null);
    } catch (err) {
      console.error("Today Attendance error", err.message);
    } finally {
      setLoadingOwnAttendance(false);
    }
  }, []);

  const getManagerMonthlyAttendance = useCallback(async (month, year) => {
    try {
      const res = await attendanceService.getMyMonthlyApi({ month, year });
      setOwnMonthlyAttendance(res.data || []);
      return res.data;
    } catch (err) {
      console.error("Monthly Attendance error", err.message);
      return [];
    }
  }, []);

  const handlePunchIn = useCallback(async (payload) => {
    const res = await attendanceService.punchInApi(payload);
    await getManagerTodayAttendance(true);
    refreshDashboard();
    return res;
  }, [getManagerTodayAttendance, refreshDashboard]);

  const handlePunchOut = useCallback(async (payload) => {
    const res = await attendanceService.punchOutApi(payload);
    await getManagerTodayAttendance(true);
    refreshDashboard();
    return res;
  }, [getManagerTodayAttendance, refreshDashboard]);

  // ── Team Attendance ───────────────────────────────────────
  const [teamAttendanceData, setTeamAttendanceData] = useState([]);
  const [loadingTeamAttendance, setLoadingTeamAttendance] = useState(false);

  const getTeamAttendanceList = useCallback(async (filters = {}, forceRefresh = false) => {
    if (loadingTeamAttendance && !forceRefresh) return;
    setLoadingTeamAttendance(true);
    try {
      const res = await managerApi.getTeamAttendance(filters);
      setTeamAttendanceData(res.data?.data || res.data || []);
      return res.data;
    } catch (err) {
      console.error("Team Attendance Error", err.message);
      return [];
    } finally {
      setLoadingTeamAttendance(false);
    }
  }, []);

  const getTeamMemberMonthlyAttendance = useCallback(async (employeeId, month, year) => {
    try {
      const res = await managerApi.getTeamMemberMonthlyAttendance(employeeId, { month, year });
      return res.data || [];
    } catch (err) {
      console.error("Team Member Monthly Error", err.message);
      return [];
    }
  }, []);

  // ── Regularization ────────────────────────────────────────
  const [regularizationRequests, setRegularizationRequests] = useState([]);
  const [loadingRegularization, setLoadingRegularization] = useState(false);

  const getRegularizationRequestsList = useCallback(async (forceRefresh = false) => {
    if (loadingRegularization && !forceRefresh) return;
    setLoadingRegularization(true);
    try {
      const res = await managerApi.getRegularizationRequests();
      setRegularizationRequests(res.data || []);
      return res.data;
    } catch (err) {
      console.error("Regularization Error", err.message);
      return [];
    } finally {
      setLoadingRegularization(false);
    }
  }, []);

  const approveRegularization = useCallback(async (id) => {
    const res = await managerApi.approveRegularization(id);
    await getRegularizationRequestsList(true);
    return res;
  }, [getRegularizationRequestsList]);

  const rejectRegularization = useCallback(async (id, reason) => {
    const res = await managerApi.rejectRegularization(id, reason);
    await getRegularizationRequestsList(true);
    return res;
  }, [getRegularizationRequestsList]);

  const manualUpdateTeamAttendance = useCallback(async (id, payload) => {
    const res = await managerApi.manualUpdateTeamAttendance(id, payload);
    return res;
  }, []);

  // ── Reports ───────────────────────────────────────────────
  const [reportsSummary, setReportsSummary] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchReportsSummary = useCallback(async (force = false) => {
    if (loadingReports) return;
    if (!force && reportsSummary) return;
    setLoadingReports(true);
    try {
      const res = await managerApi.getReportsSummary();
      setReportsSummary(res.data || null);
    } catch (err) {
      console.error("[ManagerController] Reports Summary Error", err.message);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const fetchTeamAttendanceReport = useCallback(async (params = {}) => {
    const res = await managerApi.getTeamAttendanceReport(params);
    return res.data || [];
  }, []);

  const fetchTeamTasksReport = useCallback(async (params = {}) => {
    const res = await managerApi.getTeamTasksReport(params);
    return res.data || [];
  }, []);

  const fetchTeamLeavesReport = useCallback(async (params = {}) => {
    const res = await managerApi.getTeamLeavesReport(params);
    return res.data || [];
  }, []);

  const fetchTeamWorkReport = useCallback(async (params = {}) => {
    const res = await managerApi.getTeamWorkReport(params);
    return res.data || [];
  }, []);

  // ── Announcements ────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  const fetchAnnouncements = useCallback(async (force = false) => {
    try {
      const res = await managerApi.getManagerAnnouncements();
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error("[ManagerController] Announcements Error", err.message);
    }
  }, []);

  const readAnnouncement = useCallback(async (id) => {
    try {
      setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
      await managerApi.markAnnouncementRead(id);
      await fetchAnnouncements(true);
    } catch (err) {
      console.error("[ManagerController] readAnnouncement Error", err.message);
    }
  }, [fetchAnnouncements]);

  // ── Mark Notification Read ───────────────────────────────
  const markNotificationRead = useCallback(async (id) => {
    await managerApi.markNotificationRead(id);
    await fetchNotifications();
  }, [fetchNotifications]);

  // ── Team Leaves ──────────────────────────────────────────
  const [teamLeavesData, setTeamLeavesData] = useState(null);
  const [loadingTeamLeaves, setLoadingTeamLeaves] = useState(false);
  const [leavePermissions, setLeavePermissions] = useState(null);

  const fetchLeavePermissions = useCallback(async () => {
    try {
      const res = await managerApi.getLeavePermissions();
      setLeavePermissions(res.data || null);
    } catch (err) {
      console.error("[ManagerController] Permissions error:", err.message);
    }
  }, []);

  const fetchTeamLeaves = useCallback(async (params = {}) => {
    setLoadingTeamLeaves(true);
    try {
      const res = await managerApi.getTeamLeaves(params);
      setTeamLeavesData(res.data);
      if (res.data?.permissions) {
        setLeavePermissions(res.data.permissions);
      }
      return res.data;
    } catch (err) {
      console.error("[ManagerController] Team leaves error:", err.message);
      return null;
    } finally {
      setLoadingTeamLeaves(false);
    }
  }, []);

  const getTeamLeaveDetails = useCallback(async (id) => {
    try {
      const res = await managerApi.getTeamLeaveById(id);
      return res.data;
    } catch (err) {
      console.error("[ManagerController] Leave details error:", err.message);
      return null;
    }
  }, []);

  const approveTeamLeave = useCallback(async (id) => {
    try {
      const res = await managerApi.approveTeamLeave(id);
      // Invalidate caches
      await fetchTeamLeaves();
      await fetchDashboard(true);
      return res;
    } catch (err) {
      throw err;
    }
  }, [fetchTeamLeaves, fetchDashboard]);

  const rejectTeamLeave = useCallback(async (id, rejectionReason) => {
    try {
      const res = await managerApi.rejectTeamLeave(id, rejectionReason);
      // Invalidate caches
      await fetchTeamLeaves();
      await fetchDashboard(true);
      return res;
    } catch (err) {
      throw err;
    }
  }, [fetchTeamLeaves, fetchDashboard]);



  const fetchReportsData = useCallback(async (endpoint, params = {}) => {
    try {
      const data = await managerApi.getReportsData(endpoint, params);
      return data;
    } catch (err) {
      console.error(`[ManagerController] Reports data fetch error for ${endpoint}:`, err.message);
      return null;
    }
  }, []);

  return {
    // Dashboard
    dashboardData,
    loadingDashboard,
    dashboardError,
    fetchDashboard,
    refreshDashboard,

    // Team
    teamData,
    teamSummary,
    loadingTeam,
    teamError,
    fetchTeam,
    refreshTeam,

    // Team Org
    teamOrgData,
    loadingTeamOrg,
    teamOrgError,
    fetchTeamOrg,
    refreshTeamOrg,

    // Team Member
    loadingMember,
    fetchTeamMember,


    // Tasks
    taskPermissions,
    fetchTaskPermissions,
    myManagerTasks,
    fetchMyManagerTasks,
    teamTasks,
    loadingTasks,
    tasksError,
    fetchTeamTasks,
    createTeamTask,
    getTaskDetailsData,
    updateTaskData,
    removeTask,
    updateTaskStatusData,
    addComment,
    uploadMedia,
    updateChecklist,

    // Projects
    projects,
    loadingProjects,
    projectsError,
    fetchProjects,
    getProjectDetailsData,
    getProjectTasksList,
    getProjectActivityLog,

    // Timesheet
    myTimesheetData,
    teamTimesheetData,
    fetchMyTimesheet,
    fetchTeamTimesheet,
    startTimer,
    stopTimer,
    addManualTime,
    approveTimesheetData,

    // Notifications
    notifications,
    loadingNotifications,
    fetchNotifications,
    markNotificationRead,

    // Permissions
    permissions,
    fetchPermissions,

    // Own Attendance
    ownTodayAttendance,
    ownMonthlyAttendance,
    loadingOwnAttendance,
    getManagerTodayAttendance,
    getManagerMonthlyAttendance,
    handlePunchIn,
    handlePunchOut,

    // Team Attendance
    teamAttendanceData,
    loadingTeamAttendance,
    getTeamAttendanceList,
    getTeamMemberMonthlyAttendance,
    manualUpdateTeamAttendance,

    // Reports
    reportsSummary,
    loadingReports,
    fetchReportsSummary,
    fetchTeamAttendanceReport,
    fetchTeamTasksReport,
    fetchTeamLeavesReport,
    fetchTeamWorkReport,
    fetchReportsData,

    // Announcements
    announcements,
    loadingAnnouncements,
    fetchAnnouncements,
    readAnnouncement,

    // Regularization
    regularizationRequests,
    loadingRegularization,
    getRegularizationRequestsList,
    approveRegularization,
    rejectRegularization,

    // Team Leaves
    teamLeavesData,
    loadingTeamLeaves,
    fetchTeamLeaves,
    getTeamLeaveDetails,
    approveTeamLeave,
    rejectTeamLeave,
    leavePermissions,
    fetchLeavePermissions,
  };
};

export default useManagerController;
