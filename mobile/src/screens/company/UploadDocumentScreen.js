import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import { COLORS, FONTS, SHADOWS, ROUNDING, SPACING } from "../../theme/tokens";
import { getEmployeesApi } from "../../api/employeeService";
import { uploadEmployeeDocumentApi } from "../../api/companyService";

const DOCUMENT_CATEGORIES = [
  { label: "Offer Letter", value: "Offer Letter" },
  { label: "Joining Letter", value: "Joining Letter" },
  { label: "Aadhaar Card", value: "Aadhaar Card" },
  { label: "PAN Card", value: "PAN Card" },
  { label: "Resume", value: "Resume" },
  { label: "Previous Salary Slip", value: "Previous Salary Slip" },
  { label: "Other (Custom)", value: "Other" },
];

const UploadDocumentScreen = ({ navigation }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customTitle, setCustomTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Modals
  const [empModalVisible, setEmpModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data } = await getEmployeesApi();
      if (data && data.employees) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to select document");
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      return Alert.alert("Error", "Please select an employee");
    }
    if (!selectedCategory) {
      return Alert.alert("Error", "Please select a document category");
    }
    if (selectedCategory.value === "Other" && !customTitle.trim()) {
      return Alert.alert("Error", "Please enter a custom document title");
    }
    if (!selectedFile) {
      return Alert.alert("Error", "Please select a file to upload");
    }

    const title = selectedCategory.value === "Other" ? customTitle.trim() : selectedCategory.value;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: selectedFile.mimeType || "application/octet-stream",
    });

    setSubmitting(true);
    try {
      const { data } = await uploadEmployeeDocumentApi(selectedEmployee._id, formData);
      if (data && data.success) {
        Alert.alert("Success", "Document uploaded successfully");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", error.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.employeeCode && e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Document</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Upload and dispatch official documents to an employee's record.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Select Employee *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setEmpModalVisible(true)} activeOpacity={0.8}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Ionicons name="person-outline" size={16} color={selectedEmployee ? "#1268D9" : "#94A3B8"} style={{ marginRight: 8 }} />
              <Text style={[styles.pickerText, !selectedEmployee && styles.placeholderText]} numberOfLines={1}>
                {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeCode})` : "Choose an employee..."}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <Text style={styles.label}>Document Category *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setCatModalVisible(true)} activeOpacity={0.8}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Ionicons name="folder-outline" size={16} color={selectedCategory ? "#1268D9" : "#94A3B8"} style={{ marginRight: 8 }} />
              <Text style={[styles.pickerText, !selectedCategory && styles.placeholderText]} numberOfLines={1}>
                {selectedCategory ? selectedCategory.label : "Choose category..."}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {selectedCategory?.value === "Other" && (
            <>
              <Text style={styles.label}>Custom Document Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Warning Letter / Performance Note"
                placeholderTextColor="#94A3B8"
                value={customTitle}
                onChangeText={setCustomTitle}
              />
            </>
          )}

          <Text style={styles.label}>Document File *</Text>
          <TouchableOpacity style={styles.fileBox} onPress={handleFileSelect} activeOpacity={0.75}>
            {selectedFile ? (
              <View style={{ alignItems: "center" }}>
                <Ionicons name="document-text" size={32} color="#1268D9" />
                <Text style={[styles.fileBoxText, { fontWeight: "700", color: "#0F172A", marginTop: 4 }]} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={{ fontSize: 11, color: "#10B981", marginTop: 2, fontWeight: "600" }}>✓ File Selected (Tap to change)</Text>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <Ionicons name="cloud-upload-outline" size={32} color="#1268D9" />
                <Text style={styles.fileBoxText}>Tap to browse & select PDF or Document</Text>
                <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Supports PDF, DOC, Images</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.uploadBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.uploadBtnText}>Upload & Dispatch Document</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Employee Modal */}
      <Modal visible={empModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setEmpModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.dark} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or code..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={filteredEmployees}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedEmployee(item);
                    setEmpModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.firstName} {item.lastName}</Text>
                  <Text style={styles.modalItemSub}>{item.employeeCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={catModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "50%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.dark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DOCUMENT_CATEGORIES}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCategory(item);
                    setCatModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    backgroundColor: "#082B52",
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: SPACING.md,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.text.muted,
    fontFamily: FONTS.body,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: COLORS.text.dark,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: ROUNDING.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    backgroundColor: "#f8fafc",
  },
  pickerText: {
    fontSize: 13.5,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
  },
  placeholderText: {
    color: COLORS.text.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: ROUNDING.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    backgroundColor: "#f8fafc",
    fontSize: 13.5,
    fontFamily: FONTS.body,
    color: COLORS.text.dark,
  },
  fileBox: {
    borderWidth: 1.5,
    borderColor: "#1268D9",
    borderStyle: "dashed",
    borderRadius: ROUNDING.md,
    height: 110,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.xs,
    paddingHorizontal: 16,
  },
  fileBoxText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    color: "#1268D9",
  },
  uploadBtn: {
    backgroundColor: "#1268D9",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 24,
    shadowColor: "#1268D9",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  uploadBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: ROUNDING.xl,
    borderTopRightRadius: ROUNDING.xl,
    padding: SPACING.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.text.dark,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: ROUNDING.md,
    paddingHorizontal: SPACING.md,
    height: 40,
    marginBottom: SPACING.md,
    fontFamily: FONTS.body,
  },
  modalItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalItemText: {
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.dark,
  },
  modalItemSub: {
    fontSize: 12,
    fontFamily: FONTS.body,
    color: COLORS.text.muted,
    marginTop: 2,
  },
});

export default UploadDocumentScreen;
