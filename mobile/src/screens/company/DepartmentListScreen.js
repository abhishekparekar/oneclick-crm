import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../../components/Loader";
import AppButton from "../../components/AppButton";
import StatusBadge from "../../components/StatusBadge";
import { getDepartmentsApi, deleteDepartmentApi } from "../../api/companyService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const DepartmentListScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await getDepartmentsApi();
      setItems(data.departments || []);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load departments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchItems(); }, []));

  const handleDelete = (item) => {
    Alert.alert("Delete Department", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDepartmentApi(item._id);
            fetchItems(true);
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to delete");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("AddEditDepartment", { item })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="grid" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      
      {item.description ? (
        <View style={styles.cardBody}>
          <Text style={styles.cardDesc}>{item.description}</Text>
        </View>
      ) : (
        <View style={{ height: 6 }} />
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.helperText}>Tap to edit department details</Text>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && items.length === 0) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} tintColor={COLORS.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>No departments registered yet.</Text>}
      />
      <View style={styles.footer}>
        <AppButton title="Add New Department" onPress={() => navigation.navigate("AddEditDepartment")} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ccfbf1", // Light teal
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
    flex: 1,
  },
  cardBody: {
    marginBottom: 14,
    paddingLeft: 46,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.text.light,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    marginLeft: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "transparent",
  },
  empty: {
    textAlign: "center",
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: 40,
  },
});

export default DepartmentListScreen;
