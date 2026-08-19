import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ManagerLayout from "../../components/ManagerLayout";
import useManagerController from "../../controllers/managerController";

const TEAL = "#C2410C";
const TEAL_LIGHT = "#f0fdfa";
const BORDER = "#e2e8f0";

const OrgCard = ({ data, isManager, isLevel2, onPress }) => {
  if (!data) return null;

  const getInitials = (name) => {
    if (!name) return "EMP";
    const parts = name.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.orgCard,
        isManager && styles.orgCardManager,
        isLevel2 && styles.orgCardLevel2,
      ]}
    >
      <View style={styles.orgHeader}>
        {data.photo ? (
          <Image
            source={{ uri: data.photo }}
            style={[styles.avatar, isManager && styles.avatarManager]}
          />
        ) : (
          <View style={[styles.avatarFallback, isManager && styles.avatarFallbackManager]}>
            <Text style={[styles.avatarText, isManager && { color: "#fff" }]}>
              {getInitials(data.fullName)}
            </Text>
          </View>
        )}
        <View style={styles.orgInfo}>
          <Text style={[styles.orgName, isManager && styles.orgNameManager]} numberOfLines={1}>
            {data.fullName}
          </Text>
          <Text style={[styles.orgSub, isManager && styles.orgSubManager]} numberOfLines={1}>
            {data.designation || data.designationId?.name || "Team Member"}
          </Text>
        </View>
        {data.status === "inactive" && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>INACTIVE</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const ManagerTeamOrgViewScreen = ({ navigation }) => {
  const { teamOrgData, loadingTeamOrg, fetchTeamOrg } = useManagerController();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTeamOrg();
    }, [fetchTeamOrg])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTeamOrg(true);
    setRefreshing(false);
  };

  const navToMember = (id) => {
    navigation.navigate("ManagerStack", {
      screen: "ManagerTeamMemberDetails",
      params: { employeeId: id },
    });
  };

  return (
    <ManagerLayout navigation={navigation} title="Team Hierarchy">
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization Chart</Text>
      </View>

      {loadingTeamOrg && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Loading hierarchy...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[TEAL]} />
          }
        >
          {teamOrgData?.manager && (
            <View style={styles.treeRoot}>
              {/* MANAGER NODE */}
              <OrgCard
                data={teamOrgData.manager}
                isManager
                onPress={() =>
                  navigation.navigate("ManagerStack", { screen: "ManagerProfile" })
                }
              />

              {teamOrgData.directReports?.length > 0 && (
                <View style={styles.treeBranches}>
                  <View style={styles.verticalLineMain} />

                  {teamOrgData.directReports.map((direct, idx) => {
                    const isLast = idx === teamOrgData.directReports.length - 1;
                    const hasSubs = direct.directReports && direct.directReports.length > 0;

                    return (
                      <View key={direct._id} style={styles.treeNodeWrap}>
                        <View style={styles.connectorContainer}>
                          <View style={styles.horizontalLine} />
                          {!isLast && <View style={styles.verticalLineContinuation} />}
                        </View>

                        <View style={styles.nodeContent}>
                          {/* DIRECT REPORT NODE */}
                          <OrgCard
                            data={direct}
                            onPress={() => navToMember(direct._id)}
                          />

                          {/* SUB-REPORTS */}
                          {hasSubs && (
                            <View style={styles.subTree}>
                              <View style={styles.verticalLineSub} />
                              {direct.directReports.map((sub, subIdx) => {
                                const isSubLast = subIdx === direct.directReports.length - 1;
                                return (
                                  <View key={sub._id} style={styles.treeNodeWrap}>
                                    <View style={styles.connectorContainer}>
                                      <View style={styles.horizontalLineSub} />
                                      {!isSubLast && <View style={styles.verticalLineContinuationSub} />}
                                    </View>
                                    <View style={styles.nodeContentSub}>
                                      <OrgCard
                                        data={sub}
                                        isLevel2
                                        onPress={() => navToMember(sub._id)}
                                      />
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {teamOrgData?.directReports?.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons name="git-network-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Direct Reports</Text>
              <Text style={styles.emptySub}>
                You don't have any team members assigned to you in the organization chart.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </ManagerLayout>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 60 },

  // Tree Structural Layout
  treeRoot: {
    alignItems: "flex-start",
  },
  treeBranches: {
    paddingLeft: 24,
    marginTop: 0,
    width: "100%",
  },
  verticalLineMain: {
    position: "absolute",
    left: 24, // aligns with center of manager avatar (if offset correctly)
    top: 0,
    bottom: 20,
    width: 2,
    backgroundColor: "#cbd5e1",
  },
  treeNodeWrap: {
    flexDirection: "row",
    position: "relative",
    marginTop: 12,
  },
  connectorContainer: {
    width: 24,
    position: "relative",
  },
  horizontalLine: {
    position: "absolute",
    left: 0,
    top: 24,
    width: 24,
    height: 2,
    backgroundColor: "#cbd5e1",
  },
  verticalLineContinuation: {
    position: "absolute",
    left: 0,
    top: 24,
    bottom: -12,
    width: 2,
    backgroundColor: "#cbd5e1",
  },
  nodeContent: {
    flex: 1,
  },

  // Sub Tree
  subTree: {
    paddingLeft: 24,
    marginTop: 0,
    position: "relative",
  },
  verticalLineSub: {
    position: "absolute",
    left: 24,
    top: -12,
    bottom: 20,
    width: 2,
    backgroundColor: "#e2e8f0",
  },
  horizontalLineSub: {
    position: "absolute",
    left: 0,
    top: 20,
    width: 24,
    height: 2,
    backgroundColor: "#e2e8f0",
  },
  verticalLineContinuationSub: {
    position: "absolute",
    left: 0,
    top: 20,
    bottom: -12,
    width: 2,
    backgroundColor: "#e2e8f0",
  },
  nodeContentSub: {
    flex: 1,
  },

  // Cards
  orgCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    marginBottom: 0, // margin controlled by treeNodeWrap
  },
  orgCardManager: {
    backgroundColor: TEAL,
    borderColor: TEAL,
    marginBottom: 12,
    alignSelf: "flex-start",
    paddingRight: 32,
  },
  orgCardLevel2: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    padding: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  orgHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL_LIGHT,
    marginRight: 10,
  },
  avatarManager: {
    borderWidth: 2,
    borderColor: "#ccfbf1",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEAL_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  avatarFallbackManager: {
    backgroundColor: "#0d9488",
    borderColor: "#5eead4",
  },
  avatarText: { color: TEAL, fontSize: 14, fontWeight: "800" },
  orgInfo: { flex: 1, justifyContent: "center" },
  orgName: { fontSize: 14, fontWeight: "750", color: "#0f172a" },
  orgNameManager: { color: "#fff", fontSize: 15 },
  orgSub: { fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" },
  orgSubManager: { color: "#ccfbf1" },

  inactiveBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  inactiveText: { fontSize: 9, fontWeight: "800", color: "#64748b" },

  emptyCard: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 6, lineHeight: 19 },
});

export default ManagerTeamOrgViewScreen;
