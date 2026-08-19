import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Loader from "../../components/Loader";
import AppButton from "../../components/AppButton";
import { getCompaniesApi } from "../../api/superAdminService";

const CompanyListScreen = ({ navigation }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchCompanies = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const { data } = await getCompaniesApi();
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load companies");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCompanies();
    }, [])
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate("CompanyDetails", { companyId: item._id })}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.companyName}</Text>
        <View
          style={[
            styles.badge,
            item.status === "active" ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.itemSub}>{item.ownerName}</Text>
      <Text style={styles.itemSub}>{item.email}</Text>
    </TouchableOpacity>
  );

  if (loading && companies.length === 0) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={companies}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchCompanies(true)} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No companies found. Add your first company.</Text>
        }
      />
      <View style={styles.footer}>
        <AppButton title="Add Company" onPress={() => navigation.navigate("AddCompany")} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  item: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  itemSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#dcfce7",
  },
  inactiveBadge: {
    backgroundColor: "#fee2e2",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#f3f4f6",
  },
  empty: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
  },
  error: {
    color: "#ef4444",
    padding: 16,
    textAlign: "center",
  },
});

export default CompanyListScreen;
