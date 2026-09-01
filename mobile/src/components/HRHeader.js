import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getHRAnnouncementsApi } from "../api/hrService";
import { getMyNotificationsApi } from "../api/notificationService";
import { COLORS, FONTS, SHADOWS } from "../theme/tokens";

const HRHeader = ({ title, showBack = false }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchHRData = async () => {
    try {
      const [annRes, notifRes] = await Promise.all([
        getHRAnnouncementsApi().catch(() => ({ data: { announcements: [] } })),
        getMyNotificationsApi().catch(() => ({ data: { unreadCount: 0 } })),
      ]);
      if (annRes?.data?.announcements) {
        const count = annRes.data.announcements.filter(
          (ann) => !ann.readBy?.includes(user?._id)
        ).length;
        setUnreadAnnouncements(count);
      }
      if (notifRes?.data) {
        setUnreadNotifications(notifRes.data.unreadCount || 0);
      }
    } catch (err) {
      console.log("Error fetching data in HRHeader:", err.message);
    }
  };

  useEffect(() => {
    fetchHRData();
  }, [user?._id]);

  const handleLeftPress = () => {
    if (showBack) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("HRDashboard");
      }
    } else {
      navigation.dispatch(DrawerActions.toggleDrawer());
    }
  };

  const getInitials = (name) => {
    if (!name) return "HR";
    const parts = name.trim().split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isDashboard = title === "HR Dashboard" || title === "Dashboard" || !title;

  return (
    <View
      style={[
        styles.header,
        {
          minHeight: 62 + Math.max(insets.top, 12),
          paddingTop: Math.max(insets.top, 12) + 4,
          paddingBottom: 10,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.leftContainer}>
        <TouchableOpacity
          onPress={handleLeftPress}
          style={styles.menuBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showBack ? "arrow-back" : "menu-outline"}
            size={26}
            color="#0F172A"
          />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isDashboard ? "Dashboard" : title}
          </Text>
          <Text style={styles.companySubtitle} numberOfLines={1}>
            {user?.companyName || "Oneclick"}
          </Text>
        </View>
      </View>

      <View style={styles.rightContainer}>
        {unreadAnnouncements > 0 && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("HRAnnouncements")}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="megaphone-outline" size={22} color="#0F172A" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("Notifications")}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="notifications-outline" size={23} color="#0F172A" />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate("HRProfile")}
          activeOpacity={0.8}
        >
          {user?.photo || user?.avatar || user?.profilePicture ? (
            <Image
              source={{ uri: user.photo || user.avatar || user.profilePicture }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    zIndex: 1000,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  menuBtn: {
    padding: 6,
    marginRight: 6,
    marginLeft: -4,
  },
  titleBlock: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.2,
  },
  companySubtitle: {
    color: "#64748B",
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    position: "relative",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1268D9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: FONTS.displayBold,
  },
});

export default HRHeader;
