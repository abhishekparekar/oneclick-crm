import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import EmployeeLayout from "../../components/EmployeeLayout";
import ManagerLayout from "../../components/ManagerLayout";
import { useAuth } from "../../context/AuthContext";
import { isEmployeeRole } from "../../utils/roleHelpers";
import { useAppData } from "../../context/AppDataContext";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import {
    getMyNotificationsApi,
    markNotificationReadApi,
    markAllNotificationsReadApi,
    deleteNotificationApi,
} from "../../api/notificationService";

const FILTER_TABS = [
    { label: "All Alerts", value: "all" },
    { label: "Unread", value: "unread" },
    { label: "Read", value: "read" },
];

const NotificationsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { refreshEmployeeDashboard } = useAppData();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState("unread");

    const fetchNotifications = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const { data } = await getMyNotificationsApi();
            if (data && data.success) {
                setNotifications(data.notifications || []);
            }
        } catch (err) {
            console.error("Failed to load notifications:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications(true);
        }, [])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications(false);
    };

    const handleMarkRead = async (id) => {
        try {
            await markNotificationReadApi(id);
            fetchNotifications(false);
            if (isEmployeeRole(user?.role) && refreshEmployeeDashboard) {
                refreshEmployeeDashboard();
            }
        } catch (err) {
            Alert.alert("Error", "Unable to update notification status.");
        }
    };

    const handleDelete = async (id) => {
        Alert.alert(
            "Delete Alert",
            "Are you sure you want to delete this notification?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteNotificationApi(id);
                            fetchNotifications(false);
                            if (isEmployeeRole(user?.role) && refreshEmployeeDashboard) {
                                refreshEmployeeDashboard();
                            }
                        } catch (err) {
                            Alert.alert("Error", "Unable to delete notification.");
                        }
                    },
                },
            ]
        );
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsReadApi();
            fetchNotifications(false);
            if (isEmployeeRole(user?.role) && refreshEmployeeDashboard) {
                refreshEmployeeDashboard();
            }
            Alert.alert("Success", "All notifications marked as read.");
        } catch (err) {
            Alert.alert("Error", "Unable to update all notifications.");
        }
    };

    const getFilteredData = () => {
        switch (activeFilter) {
            case "unread":
                return notifications.filter((n) => !n.isRead);
            case "read":
                return notifications.filter((n) => n.isRead);
            default:
                return notifications;
        }
    };

    const getIconAndColor = (type) => {
        switch (type?.toLowerCase()) {
            case "lead":
            case "lead_assigned":
            case "lead_status":
                return { icon: "magnet-outline", color: "#F97316", bg: "#FFF7ED" };
            case "request":
            case "company_request":
                return { icon: "chatbubbles-outline", color: "#F59E0B", bg: "#FEF3C7" };
            case "attendance":
                return { icon: "time-outline", color: "#2563eb", bg: "#eff6ff" };
            case "leave":
                return { icon: "calendar-outline", color: "#10b981", bg: "#ecfdf5" };
            case "payroll":
            case "payslip":
                return { icon: "cash-outline", color: "#7c3aed", bg: "#f5f3ff" };
            case "task":
            case "task_update":
            case "task_template":
                return { icon: "clipboard-outline", color: "#d97706", bg: "#fffbeb" };
            case "project":
                return { icon: "folder-open-outline", color: "#06b6d4", bg: "#ecfeff" };
            default:
                return { icon: "notifications-outline", color: "#64748b", bg: "#f1f5f9" };
        }
    };

    const filteredNotifications = getFilteredData();
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handleNotificationTap = async (notif) => {
        // Auto-mark read on tap
        if (!notif.isRead) {
            try {
                await markNotificationReadApi(notif._id);
                fetchNotifications(false);
                if (isEmployeeRole(user?.role) && refreshEmployeeDashboard) {
                    refreshEmployeeDashboard();
                }
            } catch (err) { }
        }

        const type = (notif.type || "").toLowerCase();
        let data = notif.data || {};
        if (typeof data === "string") {
            try { data = JSON.parse(data); } catch (e) { }
        }

        const taskId = data.taskId || data.id || notif.taskId || (type.includes("task") ? notif.relatedId : null);
        const leaveId = data.leaveId || data.id || notif.leaveId || (type.includes("leave") ? notif.relatedId : null);
        const projectId = data.projectId || data.id || notif.projectId || (type.includes("project") ? notif.relatedId : null);
        const payrollId = data.payrollId || data.payslipId || data.id || notif.payrollId || (type.includes("payroll") || type.includes("payslip") ? notif.relatedId : null);
        const announcementId = data.announcementId || data.id || notif.announcementId || (type.includes("announcement") ? notif.relatedId : null);

        const userRole = (user?.role || "").toLowerCase();

        if (isEmployeeRole(user?.role) || userRole === "employee" || userRole === "staff") {
            try {
                await deleteNotificationApi(notif._id);
                if (refreshEmployeeDashboard) refreshEmployeeDashboard();
            } catch (err) { }

            if (type.includes("lead")) {
                navigation.navigate("LeadsEngine");
            } else if (type.includes("request")) {
                navigation.navigate("CompanyRequests");
            } else if (type.includes("leave") || leaveId) {
                if (leaveId) navigation.navigate("EmployeeLeaveDetails", { leaveId });
                else navigation.navigate("Leave");
            } else if (type.includes("task") || taskId) {
                if (taskId) navigation.navigate("EmployeeTaskDetails", { taskId });
                else navigation.navigate("Tasks");
            } else if (type.includes("project") || projectId) {
                if (projectId) navigation.navigate("EmployeeProjectDetails", { projectId });
                else navigation.navigate("Projects");
            } else if (type.includes("payroll") || type.includes("payslip") || payrollId) {
                if (payrollId) navigation.navigate("EmployeePayslipDetails", { payslipId: payrollId });
                else navigation.navigate("Payslips");
            } else if (type.includes("attendance") || type.includes("punch")) {
                navigation.navigate("MainTabs", { screen: "Attendance" });
            } else if (type.includes("announcement") || announcementId) {
                if (announcementId) navigation.navigate("EmployeeAnnouncementDetails", { announcementId });
                else navigation.navigate("Announcements");
            } else {
                navigation.navigate("EmployeeNotificationDetails", { notification: notif });
            }
        } else if (userRole === "manager") {
            if (type.includes("lead")) {
                navigation.navigate("LeadsEngine");
            } else if (type.includes("request")) {
                navigation.navigate("CompanyRequests");
            } else if (type.includes("leave") || leaveId) {
                if (leaveId) navigation.navigate("ManagerTeamLeaveDetails", { leaveId });
                else navigation.navigate("ManagerTeamLeaves");
            } else if (type.includes("task") || taskId) {
                if (taskId) navigation.navigate("ManagerTaskDetails", { taskId });
                else navigation.navigate("ManagerTeamTasks");
            } else if (type.includes("project") || projectId) {
                if (projectId) navigation.navigate("ManagerProjectDetails", { projectId });
                else navigation.navigate("ManagerProjects");
            } else if (type.includes("attendance") || type.includes("punch")) {
                navigation.navigate("ManagerTeamAttendance");
            } else if (type.includes("announcement") || announcementId) {
                if (announcementId) navigation.navigate("ManagerAnnouncementDetailsScreen", { announcementId });
                else navigation.navigate("ManagerAnnouncements");
            } else {
                navigation.navigate("ManagerNotificationDetailsScreen", { notification: notif });
            }
        } else if (userRole === "hr") {
            if (type.includes("lead")) {
                navigation.navigate("LeadsEngine");
            } else if (type.includes("request")) {
                navigation.navigate("CompanyRequests");
            } else if (type.includes("leave") || leaveId) {
                navigation.navigate("HRLeaveRequests");
            } else if (type.includes("task") || taskId) {
                if (taskId) navigation.navigate("HRTaskDetails", { taskId });
                else navigation.navigate("HRTaskBoard");
            } else if (type.includes("project") || projectId) {
                if (projectId) navigation.navigate("HRProjectDetails", { projectId });
                else navigation.navigate("HRProjectList");
            } else if (type.includes("attendance") || type.includes("punch")) {
                navigation.navigate("HRManageAttendance");
            } else if (type.includes("announcement") || announcementId) {
                navigation.navigate("HRAnnouncements");
            } else if (type.includes("payroll") || type.includes("payslip") || payrollId) {
                navigation.navigate("HRPayrollList");
            } else {
                Alert.alert(notif.title, notif.body || notif.message, [{ text: "Close" }]);
            }
        } else {
            // CompanyAdmin / SuperAdmin
            if (type.includes("lead")) {
                navigation.navigate("LeadsEngine");
            } else if (type.includes("request")) {
                navigation.navigate("CompanyRequests");
            } else if (type.includes("leave") || leaveId) {
                navigation.navigate("LeaveRequests");
            } else if (type.includes("task") || taskId) {
                if (taskId) navigation.navigate("CompanyTaskDetails", { taskId });
                else navigation.navigate("TaskBoard");
            } else if (type.includes("project") || projectId) {
                if (projectId) navigation.navigate("CompanyProjectDetails", { projectId });
                else navigation.navigate("ProjectList");
            } else if (type.includes("attendance") || type.includes("punch")) {
                navigation.navigate("CompanyAttendance");
            } else if (type.includes("announcement") || announcementId) {
                navigation.navigate("CompanyAnnouncements");
            } else if (type.includes("payroll") || type.includes("payslip") || payrollId) {
                navigation.navigate("PayrollList");
            } else {
                Alert.alert(notif.title, notif.body || notif.message, [
                    { text: "Delete", style: "destructive", onPress: () => handleDelete(notif._id) },
                    !notif.isRead
                        ? { text: "Mark Read", onPress: () => handleMarkRead(notif._id) }
                        : { text: "Close" },
                ]);
            }
        }
    };

    let Layout;
    if (isEmployeeRole(user?.role)) {
        Layout = EmployeeLayout;
    } else if (user?.role === "Manager") {
        Layout = ManagerLayout;
    } else {
        Layout = CompanyAdminLayout;
    }

    return (
        <Layout
            navigation={navigation}
            activeTab="Notifications"
            showSearch={false}
            title="Notifications"
        >
            <View style={styles.container}>
                {/* Header Options */}
                <View style={styles.header}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.title}>System Alerts</Text>
                        <Text style={styles.subtitle}>Check notifications and tracking updates</Text>
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead} activeOpacity={0.7}>
                            <Ionicons name="checkmark-done" size={16} color="#2563eb" />
                            <Text style={styles.markAllText}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Tabs */}
                <View style={styles.filtersWrapper}>
                    {FILTER_TABS.map((tab) => {
                        const isActive = activeFilter === tab.value;
                        const count =
                            tab.value === "all"
                                ? notifications.length
                                : tab.value === "unread"
                                    ? unreadCount
                                    : notifications.filter((n) => n.isRead).length;

                        return (
                            <TouchableOpacity
                                key={tab.value}
                                onPress={() => setActiveFilter(tab.value)}
                                style={[styles.filterTab, isActive && styles.filterTabActive]}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                                    {tab.label}
                                </Text>
                                {count > 0 && (
                                    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                                        <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Scroll Content */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />
                    }
                >
                    {loading && !refreshing ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="small" color="#2563eb" />
                        </View>
                    ) : filteredNotifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={44} color="#94a3b8" />
                            <Text style={styles.emptyText}>No notifications in this folder.</Text>
                        </View>
                    ) : (
                        filteredNotifications.map((notif) => {
                            const { icon, color, bg } = getIconAndColor(notif.type);

                            return (
                                <TouchableOpacity
                                    key={notif._id}
                                    onPress={() => handleNotificationTap(notif)}
                                    activeOpacity={0.8}
                                >
                                    <AppCard style={[styles.notificationCard, !notif.isRead && styles.unreadCard]}>
                                        <View style={styles.cardRow}>
                                            <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
                                                <Ionicons name={icon} size={18} color={color} />
                                            </View>

                                            <View style={styles.cardContent}>
                                                <View style={styles.titleRow}>
                                                    <Text style={styles.notifTitle} numberOfLines={1}>
                                                        {notif.title}
                                                    </Text>
                                                    {!notif.isRead && (
                                                        <View style={styles.unreadDot} />
                                                    )}
                                                </View>
                                                <Text style={styles.notifMsg} numberOfLines={2}>
                                                    {notif.body || notif.message}
                                                </Text>
                                                <Text style={styles.notifTime}>
                                                    {new Date(notif.createdAt).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.actionsRow}>
                                            {!notif.isRead && (
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.readBtn]}
                                                    onPress={() => handleMarkRead(notif._id)}
                                                >
                                                    <Ionicons name="checkmark" size={14} color="#10b981" />
                                                    <Text style={styles.readBtnText}>Mark read</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.deleteBtn]}
                                                onPress={() => handleDelete(notif._id)}
                                            >
                                                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                                                <Text style={styles.deleteBtnText}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </AppCard>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        </Layout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: "#ffffff",
    },
    headerTitleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1e293b",
    },
    subtitle: {
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
        fontWeight: "500",
    },
    markAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#eff6ff",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#bfdbfe",
    },
    markAllText: {
        color: "#2563eb",
        fontSize: 11.5,
        fontWeight: "700",
        marginLeft: 4,
    },
    filtersWrapper: {
        flexDirection: "row",
        backgroundColor: "#ffffff",
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        justifyContent: "space-between",
    },
    filterTab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    filterTabActive: {
        borderBottomColor: "#F97316",
    },
    filterTabText: {
        fontSize: 12.5,
        fontWeight: "600",
        color: "#64748b",
    },
    filterTabTextActive: {
        color: "#F97316",
        fontWeight: "750",
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 6,
        minWidth: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeActive: {
        backgroundColor: "#FFF7ED",
    },
    badgeInactive: {
        backgroundColor: "#f1f5f9",
    },
    badgeText: {
        fontSize: 9.5,
        fontWeight: "800",
    },
    badgeTextActive: {
        color: "#F97316",
    },
    badgeTextInactive: {
        color: "#64748b",
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    loaderContainer: {
        paddingVertical: 40,
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 13.5,
        color: "#64748b",
        fontWeight: "600",
        marginTop: 10,
    },
    notificationCard: {
        padding: 14,
        backgroundColor: "#ffffff",
        marginBottom: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    unreadCard: {
        borderColor: "#FFEDD5",
        borderWidth: 1.2,
    },
    cardRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    notifTitle: {
        fontSize: 13.5,
        fontWeight: "800",
        color: "#1e293b",
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#F97316",
        marginLeft: 6,
    },
    notifMsg: {
        fontSize: 12.5,
        color: "#475569",
        lineHeight: 18,
        marginTop: 4,
    },
    notifTime: {
        fontSize: 10.5,
        color: "#94a3b8",
        fontWeight: "600",
        marginTop: 6,
    },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 8,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        marginLeft: 8,
    },
    readBtn: {
        backgroundColor: "#ecfdf5",
    },
    readBtnText: {
        color: "#10b981",
        fontSize: 11,
        fontWeight: "700",
        marginLeft: 4,
    },
    deleteBtn: {
        backgroundColor: "#fef2f2",
    },
    deleteBtnText: {
        color: "#dc2626",
        fontSize: 11,
        fontWeight: "700",
        marginLeft: 4,
    },
});

export default NotificationsScreen;
