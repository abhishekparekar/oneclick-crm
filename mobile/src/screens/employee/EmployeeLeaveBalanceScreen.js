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
import { getLeaveBalanceApi } from "../../api/leaveService";

const EmployeeLeaveBalanceScreen = ({ navigation }) => {
  const [balance, setBalance] = useState({ casual: 10, sick: 8, annual: 15, lop: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getLeaveBalanceApi();
      if (res.data && res.data.success) {
        setBalance(res.data.balance || res.data);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBalance(false);
  };

  const ALLOCATIONS = {
    casual: 12,
    sick: 10,
    annual: 15,
  };

  const getPercent = (value, max) => {
    if (max <= 0) return 0;
    const pct = (value / max) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  };

  return (
    <EmployeeLayout navigation={navigation} title="Leave Balances" backEnabled={true}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leave Limits & Balances</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#F97316"]} tintColor="#F97316" />}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
          ) : (
            <View>
              {/* Casual Leave */}
              <AppCard style={styles.balanceCard}>
                <View style={styles.cardInfo}>
                  <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
                    <Ionicons name="briefcase" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.balanceName}>Casual Leave</Text>
                    <Text style={styles.balanceAllocText}>
                      Allocated: {ALLOCATIONS.casual} Days • Remaining: {balance.casual} Days
                    </Text>
                  </View>
                  <Text style={[styles.balanceNumber, { color: "#3B82F6" }]}>{balance.casual}</Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${getPercent(balance.casual, ALLOCATIONS.casual)}%`, backgroundColor: "#3B82F6" },
                    ]}
                  />
                </View>
                <View style={styles.barLabelsRow}>
                  <Text style={styles.barLabelText}>0 Days</Text>
                  <Text style={styles.barLabelText}>{ALLOCATIONS.casual} Days</Text>
                </View>
              </AppCard>

              {/* Sick Leave */}
              <AppCard style={styles.balanceCard}>
                <View style={styles.cardInfo}>
                  <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
                    <Ionicons name="medical" size={20} color="#10B981" />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.balanceName}>Sick Leave</Text>
                    <Text style={styles.balanceAllocText}>
                      Allocated: {ALLOCATIONS.sick} Days • Remaining: {balance.sick} Days
                    </Text>
                  </View>
                  <Text style={[styles.balanceNumber, { color: "#10B981" }]}>{balance.sick}</Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${getPercent(balance.sick, ALLOCATIONS.sick)}%`, backgroundColor: "#10B981" },
                    ]}
                  />
                </View>
                <View style={styles.barLabelsRow}>
                  <Text style={styles.barLabelText}>0 Days</Text>
                  <Text style={styles.barLabelText}>{ALLOCATIONS.sick} Days</Text>
                </View>
              </AppCard>

              {/* Annual Leave */}
              <AppCard style={styles.balanceCard}>
                <View style={styles.cardInfo}>
                  <View style={[styles.iconCircle, { backgroundColor: "#F5F3FF" }]}>
                    <Ionicons name="ribbon" size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.balanceName}>Annual Leave</Text>
                    <Text style={styles.balanceAllocText}>
                      Allocated: {ALLOCATIONS.annual} Days • Remaining: {balance.annual} Days
                    </Text>
                  </View>
                  <Text style={[styles.balanceNumber, { color: "#8B5CF6" }]}>{balance.annual}</Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${getPercent(balance.annual, ALLOCATIONS.annual)}%`, backgroundColor: "#8B5CF6" },
                    ]}
                  />
                </View>
                <View style={styles.barLabelsRow}>
                  <Text style={styles.barLabelText}>0 Days</Text>
                  <Text style={styles.barLabelText}>{ALLOCATIONS.annual} Days</Text>
                </View>
              </AppCard>
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  balanceCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  balanceName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  balanceAllocText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  balanceNumber: {
    fontSize: 22,
    fontWeight: "800",
  },
  barBg: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
});

export default EmployeeLeaveBalanceScreen;
