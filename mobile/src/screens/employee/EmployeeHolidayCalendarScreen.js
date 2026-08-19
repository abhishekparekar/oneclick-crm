import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import { getCompanyHolidaysApi } from "../../api/leaveService";

const EmployeeHolidayCalendarScreen = ({ navigation }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHolidays = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getCompanyHolidaysApi();
      if (res.data && res.data.success) {
        setHolidays(res.data.holidays || []);
      }
    } catch (err) {
      console.error("Failed to load holidays calendar:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHolidays(false);
  };

  const isUpcoming = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) >= today;
  };

  return (
    <EmployeeLayout navigation={navigation} title="Holidays" backEnabled={true}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Holiday Calendar</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563eb"]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : holidays.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="flag-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyText}>No holidays registered for this year.</Text>
            </View>
          ) : (
            <View>
              {holidays.map((h, i) => {
                const dateObj = new Date(h.date);
                const active = isUpcoming(h.date);

                return (
                  <AppCard key={h._id || i} style={[styles.holidayCard, !active && styles.pastCard]}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.iconBox, active ? styles.activeIcon : styles.pastIcon]}>
                        <Ionicons name="flag" size={18} color={active ? "#ef4444" : "#94a3b8"} />
                      </View>
                      <View style={styles.holidayDetails}>
                        <Text style={[styles.holidayName, !active && styles.pastText]}>{h.name}</Text>
                        <Text style={styles.holidayDay}>
                          {dateObj.toLocaleDateString("en-US", { weekday: "long" })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      <Text style={[styles.dateTextDay, active ? styles.activeDateText : styles.pastDateText]}>
                        {dateObj.getDate()}
                      </Text>
                      <Text style={styles.dateTextMonth}>
                        {dateObj.toLocaleDateString("en-US", { month: "short" })}
                      </Text>
                    </View>
                  </AppCard>
                );
              })}
            </View>
          )}
        </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  holidayCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pastCard: {
    opacity: 0.6,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activeIcon: {
    backgroundColor: "#fef2f2",
  },
  pastIcon: {
    backgroundColor: "#f1f5f9",
  },
  holidayDetails: {
    flex: 1,
  },
  holidayName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
  },
  pastText: {
    color: "#64748b",
  },
  holidayDay: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  cardRight: {
    alignItems: "center",
    width: 50,
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  dateTextDay: {
    fontSize: 16,
    fontWeight: "900",
  },
  activeDateText: {
    color: "#ef4444",
  },
  pastDateText: {
    color: "#64748b",
  },
  dateTextMonth: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 10,
  },
});

export default EmployeeHolidayCalendarScreen;
