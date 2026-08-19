import { useState } from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import {
  createDepartmentApi,
  updateDepartmentApi,
} from "../../api/companyService";
import { COLORS, FONTS, SPACING } from "../../theme/tokens";

const AddEditDepartmentScreen = ({ route, navigation }) => {
  const item = route.params?.item;
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [status, setStatus] = useState(item?.status || "active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Department name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = { name: name.trim(), description, status };
      if (isEdit) {
        await updateDepartmentApi(item._id, payload);
      } else {
        await createDepartmentApi(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <AppInput label="Department Name *" value={name} onChangeText={setName} placeholder="e.g. Engineering" />
      <AppInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description of the department's role"
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
        title={isEdit ? "Update Department" : "Create Department"}
        onPress={handleSubmit}
        loading={loading}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: COLORS.background, flexGrow: 1 },
  error: { color: COLORS.danger, marginBottom: 12, textAlign: "center", fontFamily: FONTS.bodySemiBold, fontSize: 14 },
  submitBtn: { marginTop: 10 },
});

export default AddEditDepartmentScreen;
