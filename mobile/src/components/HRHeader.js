import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getHRAnnouncementsApi } from "../api/hrService";
import { getMyNotificationsApi } from "../api/notificationService";
import { COLORS, FONTS } from "../theme/tokens";

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

    const unsubscribe = navigation.addListener("focus", () => {
      fetchHRData();
    });
    return unsubscribe;
  }, [navigation, user?._id]);

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
      <StatusBar barStyle="light-content" backgroundColor="#082B52" />

      <View style={styles.leftContainer}>
        <TouchableOpacity onPress={handleLeftPress} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons
            name={showBack ? "arrow-back-outline" : "menu-outline"}
            size={26}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        
        {!showBack && title === "HR Dashboard" ? (
          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {user?.companyName || "One Click Business HRMS"}
            </Text>
            <Text style={styles.companySubtitle} numberOfLines={1}>
              HR Operations Hub
            </Text>
          </View>
        ) : (
          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.companySubtitle} numberOfLines={1}>
              {user?.companyName || "HR Operations Hub"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rightContainer}>
        {unreadAnnouncements > 0 && (
          <TouchableOpacity
            style={[styles.notificationBtn, { marginRight: 6 }]}
            onPress={() => navigation.navigate("HRAnnouncements")}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone-outline" size={22} color="#FFFFFF" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => navigation.navigate("Notifications")}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
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
    backgroundColor: "#082B52",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1268D9",
    zIndex: 1000,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  iconBtn: {
    padding: 6,
    marginRight: 6,
  },
  titleBlock: {
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.2,
  },
  companySubtitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    marginTop: -1,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationBtn: {
    position: "relative",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    borderColor: "#0F172A",
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
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
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
