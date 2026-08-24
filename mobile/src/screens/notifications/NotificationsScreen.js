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
                return { icon: "magnet-outline", color: "#1268D9", bg: "#EFF6FF" };
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
    let layoutProps = { navigation, activeTab: "Notifications", showSearch: false, title: "Notifications" };
    const uRole = (user?.role || "").toLowerCase();

    if (isEmployeeRole(user?.role) || uRole === "employee" || uRole === "staff") {
        Layout = EmployeeLayout;
    } else if (uRole === "manager") {
        Layout = ManagerLayout;
        layoutProps = { navigation, activeTabOverride: "Notifications", title: "Notifications" };
    } else if (uRole === "hr") {
        Layout = ({ children }) => (
            <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
                <HRHeader title="Notifications" />
                {children}
            </View>
        );
    } else {
        Layout = CompanyAdminLayout;
    }

    return (
        <Layout {...layoutProps}>
            <View style={styles.container}>
                {/* Header Options */}
                <View style={styles.header}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.title}>Notifications</Text>
                        <Text style={styles.subtitle}>Stay updated with tasks, announcements, and portal alerts</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.markAllBtn, unreadCount === 0 && styles.markAllBtnDisabled]}
                        onPress={handleMarkAllRead}
                        disabled={unreadCount === 0}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="checkmark-done" size={15} color={unreadCount > 0 ? "#1268D9" : "#94A3B8"} />
                        <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
                            Mark All Read
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs matching Web */}
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
                                <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                                    <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                                        {count}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Scroll Content */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#1268D9"]} />
                    }
                >
                    {loading && !refreshing ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="small" color="#1268D9" />
                        </View>
                    ) : filteredNotifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="notifications-outline" size={32} color="#1268D9" />
                            </View>
                            <Text style={styles.emptyTitle}>No notifications found</Text>
                            <Text style={styles.emptySub}>You are all caught up!</Text>
                        </View>
                    ) : (
                        filteredNotifications.map((notif) => {
                            const { icon, color, bg } = getIconAndColor(notif.type);
                            const isUnread = !notif.isRead;

                            return (
                                <TouchableOpacity
                                    key={notif._id}
                                    onPress={() => handleNotificationTap(notif)}
                                    activeOpacity={0.8}
                                    style={[styles.notificationCard, isUnread && styles.unreadCard]}
                                >
                                    {/* Left Accent Bar for Unread */}
                                    {isUnread && <View style={styles.leftAccentBar} />}

                                    <View style={styles.cardMainRow}>
                                        <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
                                            <Ionicons name={icon} size={18} color={color} />
                                        </View>

                                        <View style={styles.cardContent}>
                                            <View style={styles.titleRow}>
                                                <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
                                                    {notif.title}
                                                </Text>
                                                {isUnread && <View style={styles.unreadDot} />}
                                                <Text style={styles.notifTime}>
                                                    {new Date(notif.createdAt).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </Text>
                                            </View>
                                            {Boolean(notif.body || notif.message) && (
                                                <Text style={styles.notifMsg} numberOfLines={2}>
                                                    {notif.body || notif.message}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.actionsRow}>
                                        {isUnread && (
                                            <TouchableOpacity
                                                style={styles.markReadActionBtn}
                                                onPress={() => handleMarkRead(notif._id)}
                                            >
                                                <Ionicons name="checkmark" size={13} color="#1268D9" />
                                                <Text style={styles.markReadActionText}>Mark Read</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={styles.deleteActionBtn}
                                            onPress={() => handleDelete(notif._id)}
                                        >
                                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                                            <Text style={styles.deleteActionText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
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
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    markAllBtnDisabled: {
        backgroundColor: "#F1F5F9",
        borderColor: "#E2E8F0",
        opacity: 0.7,
    },
    markAllText: {
        color: "#1268D9",
        fontSize: 11.5,
        fontWeight: "800",
        marginLeft: 4,
    },
    markAllTextDisabled: {
        color: "#94A3B8",
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
        borderBottomColor: "#1268D9",
    },
    filterTabText: {
        fontSize: 12.5,
        fontWeight: "600",
        color: "#64748b",
    },
    filterTabTextActive: {
        color: "#1268D9",
        fontWeight: "800",
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
        backgroundColor: "#EFF6FF",
    },
    badgeInactive: {
        backgroundColor: "#f1f5f9",
    },
    badgeText: {
        fontSize: 9.5,
        fontWeight: "800",
    },
    badgeTextActive: {
        color: "#1268D9",
    },
    badgeTextInactive: {
        color: "#64748b",
    },
    scrollContent: {
        padding: 14,
        paddingBottom: 40,
    },
    loaderContainer: {
        paddingVertical: 40,
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#0F172A",
    },
    emptySub: {
        fontSize: 12,
        color: "#94A3B8",
        fontWeight: "500",
        marginTop: 4,
    },
    notificationCard: {
        position: "relative",
        padding: 14,
        backgroundColor: "#FFFFFF",
        marginBottom: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        elevation: 1,
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        overflow: "hidden",
    },
    unreadCard: {
        backgroundColor: "#FAFCFF",
        borderColor: "#BFDBFE",
        borderWidth: 1,
    },
    leftAccentBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3.5,
        backgroundColor: "#1268D9",
    },
    cardMainRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    cardContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    notifTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#334155",
        flex: 1,
        marginRight: 6,
    },
    notifTitleUnread: {
        fontWeight: "900",
        color: "#0F172A",
    },
    unreadDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#1268D9",
        marginRight: 6,
    },
    notifMsg: {
        fontSize: 12,
        color: "#64748B",
        lineHeight: 17,
        marginTop: 3,
    },
    notifTime: {
        fontSize: 10,
        color: "#94A3B8",
        fontWeight: "600",
    },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    markReadActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    markReadActionText: {
        color: "#1268D9",
        fontSize: 11,
        fontWeight: "800",
    },
    deleteActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    deleteActionText: {
        color: "#EF4444",
        fontSize: 11,
        fontWeight: "800",
    },
});

export default NotificationsScreen;
