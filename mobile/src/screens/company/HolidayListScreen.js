import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppButton from "../../components/AppButton";
import AppDatePicker from "../../components/AppDatePicker";
import {
  getHolidaysApi,
  createHolidayApi,
  updateHolidayApi,
  deleteHolidayApi,
} from "../../api/companyService";
import { formatDateToDDMMYYYY, parseDDMMYYYYToISO, isValidDDMMYYYY } from "../../utils/dateFormatter";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";

const HolidayListScreen = ({ navigation }) => {
  const { user, hasPermission } = useAuth();
  // CompanyAdmin can always manage holidays; others need the announcementsHolidays permission
  const canManageHolidays = user?.role === "CompanyAdmin" || (hasPermission && hasPermission("announcementsHolidays"));
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  // Holiday Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [name, setName] = useState("");
  const [dateStr, setDateStr] = useState(""); // YYYY-MM-DD
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchHolidays = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await getHolidaysApi();
      if (data && data.holidays) {
        setHolidays(data.holidays);
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load holidays");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddPress = () => {
    setEditingHoliday(null);
    setName("");
    // Default today date format DD/MM/YYYY
    setDateStr(formatDateToDDMMYYYY(new Date()));
    setDescription("");
    setModalVisible(true);
  };

  const handleEditPress = (item) => {
    setEditingHoliday(item);
    setName(item.name);
    setDateStr(item.date ? formatDateToDDMMYYYY(item.date) : "");
    setDescription(item.description || "");
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this holiday?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteHolidayApi(id);
              Alert.alert("Success", "Holiday deleted successfully");
              fetchHolidays();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Deletion failed");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const submitForm = async () => {
    if (!name.trim() || !dateStr.trim()) {
      Alert.alert("Warning", "Name and Date are required");
      return;
    }
    // Simple check DD/MM/YYYY
    if (!isValidDDMMYYYY(dateStr)) {
      Alert.alert("Warning", "Date must be in DD/MM/YYYY format");
      return;
    }

    try {
      setSubmitting(true);
      const payload = { name, date: parseDDMMYYYYToISO(dateStr), description };
      if (editingHoliday) {
        await updateHolidayApi(editingHoliday._id, payload);
        Alert.alert("Success", "Holiday updated successfully");
      } else {
        await createHolidayApi(payload);
        Alert.alert("Success", "Holiday added successfully");
      }
      setModalVisible(false);
      fetchHolidays();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save holiday");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHolidays = holidays.filter((item) => {
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const renderHolidayItem = ({ item }) => {
    const holidayDate = new Date(item.date);
    const day = holidayDate.getDate();
    const month = holidayDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const dayOfWeek = holidayDate.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = holidayDate.toLocaleDateString("en-US", { year: "numeric" });

    return (
      <View style={styles.card}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateDay}>{day}</Text>
        </View>

        <View style={styles.detailsBlock}>
          <Text style={styles.holidayName}>{item.name}</Text>
          <Text style={styles.holidayDay}>{dayOfWeek}, {formattedDate}</Text>
          {item.description ? (
            <Text style={styles.holidayDesc}>{item.description}</Text>
          ) : null}
        </View>

        <View style={styles.actionBlock}>
          {canManageHolidays && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleEditPress(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          
          {canManageHolidays && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteAction]}
              onPress={() => handleDelete(item._id)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      activeTab="Dashboard"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search holidays..."
    >
      <View style={styles.screenHeader}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.title}>Company Holidays</Text>
          <Text style={styles.subtitle}>View and manage corporate holiday calendar</Text>
        </View>
        {canManageHolidays && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#ffffff" />
            <Text style={styles.addBtnText}>Add New</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching holiday list...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHolidays}
          keyExtractor={(item) => item._id}
          renderItem={renderHolidayItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchHolidays(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flag-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyText}>No holidays scheduled</Text>
            </View>
          }
        />
      )}

      {/* Holiday Input Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHoliday ? "Edit Holiday" : "Add Holiday"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Holiday Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Christmas Day"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <AppDatePicker
              label="Date (DD/MM/YYYY)"
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="e.g., 25/12/2026"
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Brief details about the holiday..."
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="outline"
                style={styles.modalBtn}
                onPress={() => setModalVisible(false)}
              />
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitForm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingHoliday ? "Update" : "Save"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  screenHeader: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontFamily: FONTS.bodyBold,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    ...SHADOWS.sm,
  },
  dateBlock: {
    backgroundColor: "#f0fdfa", // light teal background
    borderRadius: ROUNDING.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    borderWidth: 1,
    borderColor: "#ccfbf1",
  },
  dateMonth: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
  dateDay: {
    fontSize: 22,
    fontFamily: FONTS.displayBold,
    color: COLORS.accentBlue,
    marginTop: 2,
  },
  detailsBlock: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  holidayName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  holidayDay: {
    fontSize: 12,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  holidayDesc: {
    fontSize: 12,
    color: COLORS.text.light,
    fontFamily: FONTS.body,
    marginTop: 4,
    fontStyle: "italic",
  },
  actionBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginLeft: 6,
  },
  deleteAction: {
    backgroundColor: "#fef2f2",
    borderColor: "#fee2e2",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
    fontFamily: FONTS.bodyMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: ROUNDING.lg,
    padding: 20,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
    backgroundColor: "#f8fafc",
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  modalBtn: {
    width: 100,
    marginRight: 8,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 100,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
});

export default HolidayListScreen;
