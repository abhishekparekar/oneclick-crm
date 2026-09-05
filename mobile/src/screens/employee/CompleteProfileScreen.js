import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../config/firebase";
import EmployeeLayout from "../../components/EmployeeLayout";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import Loader from "../../components/Loader";
import { getMyProfileForEditApi, saveProfileDraftApi, completeProfileApi } from "../../api/employeeService";
import { useAppData } from "../../context/AppDataContext";
import DatePickerModal from "../../components/DatePickerModal";
import StatePickerModal from "../../components/StatePickerModal";

const STEPS = [
  "Personal Info",
  "Address Details",
  "Emergency Contact",
  "Identity Proofs",
  "Bank Accounts",
];

// Utility: Format DB date (YYYY-MM-DD) to screen date (DD/MM/YYYY)
const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";
  const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Utility: Format screen date (DD/MM/YYYY) to standard date (YYYY-MM-DD)
const parseDDMMYYYYToDateStr = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const CompleteProfileScreen = ({ navigation }) => {
  const { refreshEmployeeDashboard } = useAppData();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [statePickerVisible, setStatePickerVisible] = useState(false);

  // steppers required profile fields
  const [photo, setPhoto] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [currentAddress, setCurrentAddress] = useState({
    addressLine1: "", city: "", state: "", pincode: "", country: "India"
  });

  const [emergencyContact, setEmergencyContact] = useState({
    name: "", phone: "", relationship: "Family"
  });

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");

  const [bankDetails, setBankDetails] = useState({
    bankName: "", accountHolderName: "", accountNumber: "", ifscCode: ""
  });

  // Load existing profile details automatically
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const res = await getMyProfileForEditApi();
      if (res.data && res.data.success) {
        const emp = res.data.employee;

        // Auto-fill existing fields
        setPhoto(emp.photo || "");
        setGender(emp.gender || "");
        if (emp.dateOfBirth) {
          setDateOfBirth(formatDateToDDMMYYYY(emp.dateOfBirth));
        }

        if (emp.currentAddress) {
          setCurrentAddress({
            addressLine1: emp.currentAddress.addressLine1 || "",
            city: emp.currentAddress.city || "",
            state: emp.currentAddress.state || "",
            pincode: emp.currentAddress.pincode || "",
            country: emp.currentAddress.country || "India"
          });
        }

        if (emp.emergencyContact) {
          setEmergencyContact({
            name: emp.emergencyContact.name || "",
            phone: emp.emergencyContact.phone || "",
            relationship: emp.emergencyContact.relationship || "Family"
          });
        }

        const formatAadhaar = (num) => {
          if (!num) return "";
          const clean = num.toString().replace(/\s/g, "");
          let formatted = "";
          for (let i = 0; i < clean.length && i < 12; i++) {
            if (i > 0 && i % 4 === 0) {
              formatted += " ";
            }
            formatted += clean[i];
          }
          return formatted;
        };
        setAadhaarNumber(formatAadhaar(emp.aadhaarNumber));
        setPanNumber(emp.panNumber || "");

        if (emp.bankDetails) {
          setBankDetails({
            bankName: emp.bankDetails.bankName || "",
            accountHolderName: emp.bankDetails.accountHolderName || "",
            accountNumber: emp.bankDetails.accountNumber || "",
            ifscCode: emp.bankDetails.ifscCode || ""
          });
        }
      }
    } catch (err) {
      console.error("Failed to preload profile stepper:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // ── Pick photo from gallery & upload to Firebase ────────────
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo gallery.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],        // expo-image-picker v57+ format
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploadingPhoto(true);

      // Upload to Firebase Storage
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const fileName = `profile_photos/${Date.now()}_photo.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      setPhoto(downloadURL);
    } catch (err) {
      console.error("Photo upload error:", err);
      Alert.alert("Upload Failed", "Could not upload image. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Validation filter per stepper step
  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!photo.trim()) return "Profile photo is required. Please select a photo from your gallery.";
      if (!gender || gender === "prefer_not_say") return "Gender is required";
      if (!dateOfBirth.trim()) return "Date of Birth is required";
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth.trim())) return "DOB format must be DD/MM/YYYY";
      
      const dobStr = parseDDMMYYYYToDateStr(dateOfBirth);
      const dob = new Date(dobStr);
      if (isNaN(dob.getTime())) return "Invalid date of birth provided";
      if (dob >= new Date()) return "Date of birth cannot be in the future";
    }

    if (stepIndex === 1) {
      if (!currentAddress.addressLine1.trim()) return "Address Line 1 is required";
      if (!currentAddress.city.trim()) return "City is required";
      if (!currentAddress.state.trim()) return "State is required";
      if (!/^\d{6}$/.test(currentAddress.pincode.trim())) return "Pincode must be exactly 6 digits";
    }

    if (stepIndex === 2) {
      if (!emergencyContact.name.trim()) return "Emergency contact person name is required";
      if (!/^\d{10}$/.test(emergencyContact.phone.trim())) return "Emergency phone must be exactly 10 digits";
    }

    if (stepIndex === 3) {
      const aadhaarClean = aadhaarNumber.replace(/\s/g, "");
      if (!/^\d{12}$/.test(aadhaarClean)) return "Aadhaar Card number must be exactly 12 digits";
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.trim().toUpperCase())) return "PAN Card must match standard format (e.g. ABCDE1234F)";
    }

    if (stepIndex === 4) {
      const hasAnyBankDetail = bankDetails.bankName?.trim() || bankDetails.accountHolderName?.trim() || bankDetails.accountNumber?.trim() || bankDetails.ifscCode?.trim();
      if (hasAnyBankDetail) {
        if (!bankDetails.bankName.trim()) return "Bank Name is required";
        if (!bankDetails.accountHolderName.trim()) return "Account Holder Name is required";
        if (!bankDetails.accountNumber.trim()) return "Account Number is required";
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.trim().toUpperCase())) return "IFSC Code format is invalid (e.g. SBIN0001234)";
      }
    }

    return null;
  };

  const handleNext = async () => {
    const error = validateStep(currentStep);
    if (error) {
      Alert.alert("Required Field Missing", error);
      return;
    }

    try {
      await saveProfileDraftApi(getFormDataObj());
    } catch (err) {
      console.log("Silent draft save failed:", err);
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFormDataObj = () => {
    return {
      photo: photo.trim(),
      gender,
      dateOfBirth: parseDDMMYYYYToDateStr(dateOfBirth),
      currentAddress,
      emergencyContact,
      aadhaarNumber: aadhaarNumber.replace(/\s/g, ""),
      panNumber: panNumber.trim().toUpperCase(),
      bankDetails,
    };
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const res = await saveProfileDraftApi(getFormDataObj());
      if (res.data && res.data.success) {
        Alert.alert("Draft Saved", "Your profile progress has been saved.");
      }
    } catch (err) {
      Alert.alert("Save Failed", err.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const error = validateStep(currentStep);
    if (error) {
      Alert.alert("Required Field Missing", error);
      return;
    }

    try {
      setSaving(true);
      const res = await completeProfileApi(getFormDataObj());
      if (res.data && res.data.success) {
        Alert.alert("Success", "Profile successfully completed and submitted!", [
          {
            text: "Great",
            onPress: async () => {
              if (refreshEmployeeDashboard) {
                await refreshEmployeeDashboard();
              }
              navigation.navigate("MainTabs", { screen: "EmployeeDashboard" });
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert("Submission Failed", err.response?.data?.message || "Failed to submit profile details.");
    } finally {
      setSaving(false);
    }
  };

  const renderStepFields = () => {
    switch (currentStep) {
      case 0:
        return (
          <View>
            <Text style={styles.subCardTitle}>Step 1: Personal Details</Text>

            {/* ── Profile Photo Picker ──────────────────────── */}
            <Text style={styles.fieldLabel}>PROFILE PHOTO *</Text>
            <TouchableOpacity
              style={styles.photoPicker}
              onPress={handlePickPhoto}
              activeOpacity={0.8}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <View style={styles.photoPickerInner}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.photoPickerText}>Uploading…</Text>
                </View>
              ) : photo ? (
                <View style={styles.photoPickerInner}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.photoPreview}
                  />
                  <View style={styles.photoChangeBtn}>
                    <Ionicons name="camera-outline" size={14} color="#2563eb" />
                    <Text style={styles.photoChangeBtnText}>Change Photo</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPickerInner}>
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person-circle-outline" size={52} color="#cbd5e1" />
                  </View>
                  <View style={styles.photoSelectBtn}>
                    <Ionicons name="image-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.photoSelectBtnText}>Choose from Gallery</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>GENDER *</Text>
            <View style={styles.genderRow}>
              {["male", "female", "other"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderPill, gender === g && styles.genderPillActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderPillText, gender === g && styles.genderPillTextActive]}>
                    {g.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>DATE OF BIRTH (DD/MM/YYYY) *</Text>
            <TouchableOpacity onPress={() => setDatePickerVisible(true)} style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
              <Text style={{ fontSize: 13.5, color: dateOfBirth ? "#334155" : "#94a3b8" }}>
                {dateOfBirth || "Select Date of Birth"}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.subCardTitle}>Step 2: Address Information</Text>
            
            <Text style={styles.fieldLabel}>ADDRESS LINE 1 *</Text>
            <TextInput
              style={styles.input}
              placeholder="Building, street details"
              placeholderTextColor="#94a3b8"
              value={currentAddress.addressLine1}
              onChangeText={(text) => setCurrentAddress({ ...currentAddress, addressLine1: text })}
            />

            <View style={styles.inputRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.fieldLabel}>CITY *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City name"
                  placeholderTextColor="#94a3b8"
                  value={currentAddress.city}
                  onChangeText={(text) => setCurrentAddress({ ...currentAddress, city: text })}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Text style={styles.fieldLabel}>STATE *</Text>
                <TouchableOpacity onPress={() => setStatePickerVisible(true)} style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, color: currentAddress.state ? "#334155" : "#94a3b8" }}>
                    {currentAddress.state || "Select State"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.fieldLabel}>PINCODE (6 DIGITS) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 400001"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={6}
              value={currentAddress.pincode}
              onChangeText={(text) => setCurrentAddress({ ...currentAddress, pincode: text.replace(/[^0-9]/g, "") })}
            />
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.subCardTitle}>Step 3: Emergency Contacts</Text>

            <Text style={styles.fieldLabel}>CONTACT PERSON NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="Emergency contact person name"
              placeholderTextColor="#94a3b8"
              value={emergencyContact.name}
              onChangeText={(text) => setEmergencyContact({ ...emergencyContact, name: text })}
            />

            <Text style={styles.fieldLabel}>PHONE NUMBER (10 DIGITS) *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={10}
              value={emergencyContact.phone}
              onChangeText={(text) => setEmergencyContact({ ...emergencyContact, phone: text.replace(/[^0-9]/g, "") })}
            />
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.subCardTitle}>Step 4: Identity Proofs</Text>

            <Text style={styles.fieldLabel}>AADHAAR CARD NUMBER (12 DIGITS) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1234 5678 9012"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={14}
              value={aadhaarNumber}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9]/g, "");
                let formatted = "";
                for (let i = 0; i < clean.length && i < 12; i++) {
                  if (i > 0 && i % 4 === 0) {
                    formatted += " ";
                  }
                  formatted += clean[i];
                }
                setAadhaarNumber(formatted);
              }}
            />

            <Text style={styles.fieldLabel}>PAN CARD NUMBER (10 CHARS) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ABCDE1234F"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              maxLength={10}
              value={panNumber}
              onChangeText={(text) => setPanNumber(text.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
            />
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={styles.subCardTitle}>Step 5: Bank Ledger Account</Text>

            <Text style={styles.fieldLabel}>BANK NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. State Bank of India"
              placeholderTextColor="#94a3b8"
              value={bankDetails.bankName}
              onChangeText={(text) => setBankDetails({ ...bankDetails, bankName: text })}
            />

            <Text style={styles.fieldLabel}>ACCOUNT HOLDER NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Name matching bank account"
              placeholderTextColor="#94a3b8"
              value={bankDetails.accountHolderName}
              onChangeText={(text) => setBankDetails({ ...bankDetails, accountHolderName: text })}
            />

            <Text style={styles.fieldLabel}>BANK ACCOUNT NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="Bank account number digits"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              value={bankDetails.accountNumber}
              onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })}
            />

            <Text style={styles.fieldLabel}>IFSC CODE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SBIN0001234"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              maxLength={11}
              value={bankDetails.ifscCode}
              onChangeText={(text) => setBankDetails({ ...bankDetails, ifscCode: text })}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) return <Loader />;

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <EmployeeLayout navigation={navigation} title="Complete Profile">
      <View style={styles.container}>
        {/* Step Indicator Header Progress Bar */}
        <View style={styles.indicatorContainer}>
          <View style={styles.indicatorTextRow}>
            <Text style={styles.indicatorTitle}>Step {currentStep + 1} of {STEPS.length}</Text>
            <Text style={styles.indicatorDesc}>{STEPS[currentStep]}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppCard style={styles.stepperCard}>
            {renderStepFields()}
          </AppCard>

          {/* Bottom steppers navigation */}
          <View style={styles.controlsRow}>
            {currentStep > 0 ? (
              <AppButton
                title="Back"
                onPress={handlePrev}
                variant="outline"
                style={styles.controlBtn}
                icon="chevron-back"
              />
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <AppButton
              title="Save Draft"
              onPress={handleSaveDraft}
              variant="outline"
              style={[styles.controlBtn, { borderColor: "#bfdbfe", marginHorizontal: 4 }]}
              icon="save-outline"
            />

            {isLastStep ? (
              <AppButton
                title="Submit"
                onPress={handleSubmit}
                loading={saving}
                style={[styles.controlBtn, { backgroundColor: "#10b981" }]}
                icon="checkmark-circle-outline"
              />
            ) : (
              <AppButton
                title="Next"
                onPress={handleNext}
                style={styles.controlBtn}
                icon="chevron-forward"
              />
            )}
          </View>
        </ScrollView>
        <DatePickerModal
          visible={datePickerVisible}
          onClose={() => setDatePickerVisible(false)}
          onSelect={(date) => setDateOfBirth(date)}
          initialDate={dateOfBirth}
        />
        <StatePickerModal
          visible={statePickerVisible}
          onClose={() => setStatePickerVisible(false)}
          onSelect={(state) => setCurrentAddress({ ...currentAddress, state })}
          selectedState={currentAddress.state}
        />
      </View>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  indicatorContainer: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  indicatorTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  indicatorTitle: {
    fontSize: 12,
    fontWeight: "750",
    color: "#64748b",
  },
  indicatorDesc: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563eb",
  },
  progressBg: {
    height: 5,
    backgroundColor: "#e2e8f0",
    borderRadius: 2.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepperCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  subCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: "850",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#334155",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  genderPillActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  genderPillText: {
    fontSize: 11.5,
    fontWeight: "750",
    color: "#475569",
  },
  genderPillTextActive: {
    color: "#2563eb",
  },
  cardDivider: {
    height: 0.5,
    backgroundColor: "#e2e8f0",
    marginVertical: 14,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  controlBtn: {
    flex: 1,
    marginHorizontal: 3,
  },

  // ── Photo Picker ──────────────────────────────────────────────
  photoPicker: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  photoPickerInner: {
    alignItems: "center",
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#bfdbfe",
  },
  photoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  photoSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  photoSelectBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  photoChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  photoChangeBtnText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },
  photoPickerText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
});

export default CompleteProfileScreen;
