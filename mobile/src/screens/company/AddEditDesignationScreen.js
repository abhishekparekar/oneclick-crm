import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import {
  getDepartmentsApi,
  createDesignationApi,
  updateDesignationApi,
} from "../../api/companyService";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";

const AddEditDesignationScreen = ({ route, navigation }) => {
  const item = route.params?.item;
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [status, setStatus] = useState(item?.status || "active");
  const [departmentId, setDepartmentId] = useState(item?.departmentId?._id || item?.departmentId || "");
  const [departmentName, setDepartmentName] = useState(item?.departmentId?.name || "");
  const [departments, setDepartments] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data } = await getDepartmentsApi();
      setDepartments(data.departments || []);
      if (item?.departmentId && !departmentName) {
        const dept = data.departments?.find(
          (d) => d._id === (item.departmentId._id || item.departmentId)
        );
        if (dept) {
          setDepartmentName(dept.name);
          setDepartmentId(dept._id);
        }
      }
    } catch {
      setError("Failed to load departments");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !departmentId) {
      setError("Name and department are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        description,
        status,
        departmentId,
      };
      if (isEdit) {
        await updateDesignationApi(item._id, payload);
      } else {
        await createDesignationApi(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save designation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Department *</Text>
      <TouchableOpacity style={styles.select} onPress={() => setPickerVisible(true)} activeOpacity={0.7}>
        <Text style={departmentName ? styles.selectText : styles.placeholder}>
          {departmentName || "Select department"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.text.muted} />
      </TouchableOpacity>

      <AppInput label="Designation Name *" value={name} onChangeText={setName} placeholder="e.g. Software Engineer" />
      <AppInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional responsibilities or details"
      />
      <AppInput
        label="Status (active/inactive)"
        value={status}
        onChangeText={setStatus}
        placeholder="active"
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton
        title={isEdit ? "Update Designation" : "Create Designation"}
        onPress={handleSubmit}
        loading={loading}
        style={styles.submitBtn}
      />

      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.muted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={departments}
              keyExtractor={(d) => d._id}
              renderItem={({ item: dept }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setDepartmentId(dept._id);
                    setDepartmentName(dept.name);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{dept.name}</Text>
                  {departmentId === dept._id && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No departments. Create one first.</Text>}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
            <AppButton title="Close" variant="outline" onPress={() => setPickerVisible(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: COLORS.background, flexGrow: 1 },
  label: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: COLORS.text.dark, marginBottom: 6 },
  select: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fff",
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: { fontSize: 15, fontFamily: FONTS.body, color: COLORS.text.dark },
  placeholder: { fontSize: 15, fontFamily: FONTS.body, color: "#94a3b8" },
  error: { color: COLORS.danger, marginBottom: 12, textAlign: "center", fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  submitBtn: { marginTop: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: ROUNDING.xl,
    borderTopRightRadius: ROUNDING.xl,
    padding: 20,
    maxHeight: "60%",
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text.dark },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalItemText: { fontSize: 15, fontFamily: FONTS.body, color: COLORS.text.dark },
  empty: { textAlign: "center", color: COLORS.text.muted, fontFamily: FONTS.body, padding: 20 },
});

export default AddEditDesignationScreen;
