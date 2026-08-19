import { useState } from "react";
import { Text, StyleSheet, ScrollView } from "react-native";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { createBranchApi, updateBranchApi } from "../../api/companyService";
import { COLORS, FONTS, SPACING } from "../../theme/tokens";

const AddEditBranchScreen = ({ route, navigation }) => {
  const item = route.params?.item;
  const isEdit = !!item;

  const [branchName, setBranchName] = useState(item?.branchName || "");
  const [address, setAddress] = useState(item?.address || "");
  const [city, setCity] = useState(item?.city || "");
  const [stateVal, setStateVal] = useState(item?.state || "");
  const [pincode, setPincode] = useState(item?.pincode || "");
  const [status, setStatus] = useState(item?.status || "active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!branchName.trim()) {
      setError("Branch name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = { branchName: branchName.trim(), address, city, state: stateVal, pincode, status };
      if (isEdit) {
        await updateBranchApi(item._id, payload);
      } else {
        await createBranchApi(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <AppInput label="Branch Name *" value={branchName} onChangeText={setBranchName} placeholder="e.g. Head Office" />
      <AppInput label="Address" value={address} onChangeText={setAddress} placeholder="Street address" />
      <AppInput label="City" value={city} onChangeText={setCity} placeholder="Mumbai" />
      <AppInput label="State" value={stateVal} onChangeText={setStateVal} placeholder="Maharashtra" />
      <AppInput label="Pincode" value={pincode} onChangeText={setPincode} placeholder="400001" keyboardType="numeric" />
      <AppInput
        label="Status (active/inactive)"
        value={status}
        onChangeText={setStatus}
        placeholder="active"
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton
        title={isEdit ? "Update Branch" : "Create Branch"}
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

export default AddEditBranchScreen;
