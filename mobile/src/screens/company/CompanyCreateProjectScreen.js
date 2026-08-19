import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import AppDatePicker from "../../components/AppDatePicker";
import { createProjectApi, updateProjectApi } from "../../api/companyService";
import { getEmployeesApi } from "../../api/employeeService";
import { parseDDMMYYYYToISO, formatDateToDDMMYYYY } from "../../utils/dateFormatter";
import { COLORS, SPACING, ROUNDING, SHADOWS } from "../../theme/tokens";

const CompanyCreateProjectScreen = ({ route, navigation }) => {
  const { editingProject } = route.params || {};

  const [name, setName] = useState(editingProject?.name || "");
  const [description, setDescription] = useState(editingProject?.description || "");
  const [status, setStatus] = useState(editingProject?.status || "planning");
  const [startDate, setStartDate] = useState(
    editingProject?.startDate 
      ? formatDateToDDMMYYYY(editingProject.startDate) 
      : formatDateToDDMMYYYY(new Date())
  );
  const [endDate, setEndDate] = useState(
    editingProject?.endDate 
      ? formatDateToDDMMYYYY(editingProject.endDate) 
      : ""
  );
  
  const [selectedMembers, setSelectedMembers] = useState(
    editingProject?.members 
      ? editingProject.members.map((m) => (typeof m === "object" ? m._id : m)) 
      : []
  );
  
  const [projectManager, setProjectManager] = useState(
    editingProject?.projectManager
      ? (typeof editingProject.projectManager === "object" ? editingProject.projectManager._id : editingProject.projectManager)
      : ""
  );
  
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const empRes = await getEmployeesApi({ status: "active" });
        if (empRes.data?.employees) {
          setEmployees(empRes.data.employees);
        }
      } catch (err) {
        Alert.alert("Error", "Failed to load employees for project assignment.");
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const toggleMemberSelection = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((mId) => mId !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  const submitForm = async () => {
    if (!name.trim()) {
      Alert.alert("Warning", "Project name is required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name,
        description,
        status,
        startDate: parseDDMMYYYYToISO(startDate) || null,
        endDate: parseDDMMYYYYToISO(endDate) || null,
        projectManager: projectManager || null,
        members: selectedMembers,
      };

      if (editingProject) {
        await updateProjectApi(editingProject._id, payload);
        Alert.alert("Success", "Project updated successfully");
      } else {
        await createProjectApi(payload);
        Alert.alert("Success", "Project created successfully");
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save project");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CompanyAdminLayout navigation={navigation} activeTab="Dashboard">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading workspace...</Text>
        </View>
      </CompanyAdminLayout>
    );
  }

  return (
    <CompanyAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text.dark} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>{editingProject ? "Edit Project" : "Initiate New Project"}</Text>
          <Text style={styles.subtitle}>Define scope, timeline, and resources</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.formContainer} contentContainerStyle={styles.formContent}>
        
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Project Name <Text style={{color: COLORS.danger}}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Q3 Marketing Campaign"
              placeholderTextColor={COLORS.text.light}
              value={name}
              onChangeText={(text) => setName(text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Summarize project scope and deliverables..."
              placeholderTextColor={COLORS.text.light}
              value={description}
              onChangeText={(text) => setDescription(text)}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pillContainer}>
              {[
                { label: "Planning", value: "planning" },
                { label: "Active", value: "active" },
                { label: "On Hold", value: "on-hold" },
                { label: "Completed", value: "completed" },
              ].map(s => (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setStatus(s.value)}
                  style={[styles.pickerTab, status === s.value && styles.pickerTabActive]}
                >
                  <Text style={[styles.pickerTabText, status === s.value && styles.pickerTabTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: SPACING.sm }}>
              <AppDatePicker
                label="Start Date"
                value={startDate}
                onChangeText={(text) => setStartDate(text)}
                placeholder="DD/MM/YYYY"
              />
            </View>

            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <AppDatePicker
                label="End Date"
                value={endDate}
                onChangeText={(text) => setEndDate(text)}
                placeholder="DD/MM/YYYY"
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Project Manager</Text>
            <Text style={styles.inputSub}>Assign a manager to lead this project.</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={projectManager} onValueChange={setProjectManager}>
                <Picker.Item label="None Assigned" value="" />
                {employees.map(emp => (
                  <Picker.Item key={emp._id} label={`${emp.firstName} ${emp.lastName} (${emp.employeeCode})`} value={emp._id} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assign Team Members</Text>
            <Text style={styles.inputSub}>Select all employees that will work on this project.</Text>
            <View style={styles.checklist}>
              {employees.map((emp) => {
                const isSelected = selectedMembers.includes(emp._id);
                return (
                  <TouchableOpacity
                    key={emp._id}
                    onPress={() => toggleMemberSelection(emp._id)}
                    style={[styles.checklistItem, isSelected && styles.checklistItemActive]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={22}
                      color={isSelected ? COLORS.primary : COLORS.text.light}
                    />
                    <Text style={[styles.checklistText, isSelected && styles.checklistTextActive]}>
                      {emp.firstName} {emp.lastName} <Text style={styles.empCode}>({emp.employeeCode})</Text>
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {employees.length === 0 && (
                <Text style={styles.emptyChecklist}>No active employees found in workspace</Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={submitForm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>
              {editingProject ? "Save Project Changes" : "Create Project"}
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </CompanyAdminLayout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.muted,
  },
  screenHeader: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.text.muted,
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: SPACING.md,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDING.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.sm,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text.muted,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputSub: {
    fontSize: 12,
    color: COLORS.text.light,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: ROUNDING.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text.dark,
    backgroundColor: COLORS.background,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: ROUNDING.sm,
    backgroundColor: COLORS.background,
    overflow: "hidden",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerTabActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '40',
  },
  pickerTabText: {
    fontSize: 13,
    color: COLORS.text.muted,
    fontWeight: "600",
  },
  pickerTabTextActive: {
    color: COLORS.primary,
  },
  checklist: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: ROUNDING.sm,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checklistItemActive: {
    backgroundColor: COLORS.primary + '0A',
  },
  checklistText: {
    fontSize: 14,
    color: COLORS.text.muted,
    marginLeft: 12,
    fontWeight: "500",
  },
  checklistTextActive: {
    color: COLORS.text.dark,
    fontWeight: "700",
  },
  empCode: {
    fontSize: 12,
    color: COLORS.text.light,
    fontWeight: "400",
  },
  emptyChecklist: {
    fontSize: 13,
    color: COLORS.text.light,
    textAlign: "center",
    paddingVertical: 24,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: ROUNDING.sm,
    alignItems: "center",
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default CompanyCreateProjectScreen;
