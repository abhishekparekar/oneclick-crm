import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  StatusBar,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PhotoPickerField from "../../components/PhotoPickerField";
import DocumentPickerField from "../../components/DocumentPickerField";
import EmployeeLayout from "../../components/EmployeeLayout";
import ManagerLayout from "../../components/ManagerLayout";
import { useAuth } from "../../context/AuthContext";
import { isEmployeeRole } from "../../utils/roleHelpers";
import Loader from "../../components/Loader";
import { getMyProfileForEditApi, updateSelfProfileApi, saveProfileDraftApi } from "../../api/employeeService";
import { useAppData } from "../../context/AppDataContext";
import DatePickerModal from "../../components/DatePickerModal";
import StatePickerModal from "../../components/StatePickerModal";
import { COLORS, SPACING, ROUNDING, SHADOWS, FONTS } from "../../theme/tokens";

const STEPS = [
  "Personal Info",
  "Address Details",
  "Emergency Contact",
  "Identity Proofs",
  "Bank Accounts",
];

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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Other"];

const SimpleSelectionModal = ({ visible, onClose, onSelect, selectedValue, options, title }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerModalOverlay}>
        <View style={[styles.pickerDropdownCard, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseIconBtn}>
              <Ionicons name="close" size={18} color={COLORS.darkNavy} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {options.map((item) => {
              const isSelected = item.toLowerCase() === selectedValue?.toLowerCase();
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.pickerItemRow, isSelected && styles.pickerSelectedItemRow]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pickerItemText, isSelected && styles.pickerSelectedItemText]}>
                    {item}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const EmployeeEditProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { bankList } = useAppData();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("male");
  const [bloodGroup, setBloodGroup] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [photo, setPhoto] = useState("");

  const [currAddrLine1, setCurrAddrLine1] = useState("");
  const [currCity, setCurrCity] = useState("");
  const [currState, setCurrState] = useState("");
  const [currPincode, setCurrPincode] = useState("");

  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [permAddrLine1, setPermAddrLine1] = useState("");
  const [permCity, setPermCity] = useState("");
  const [permState, setPermState] = useState("");
  const [permPincode, setPermPincode] = useState("");

  const [emergName, setEmergName] = useState("");
  const [emergRel, setEmergRel] = useState("");
  const [emergPhone, setEmergPhone] = useState("");
  const [emergAltPhone, setEmergAltPhone] = useState("");

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarFront, setAadhaarFront] = useState("");
  const [aadhaarBack, setAadhaarBack] = useState("");
  const [panCard, setPanCard] = useState("");
  const [resume, setResume] = useState("");

  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  // Modals
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showBloodModal, setShowBloodModal] = useState(false);
  const [showMaritalModal, setShowMaritalModal] = useState(false);
  const [showCurrStateModal, setShowCurrStateModal] = useState(false);
  const [showPermStateModal, setShowPermStateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const isLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!isLoadedRef.current) {
      isLoadedRef.current = true;
      loadProfile();
    }
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await getMyProfileForEditApi();
      if (data && data.success && data.employee) {
        const emp = data.employee;

        setFirstName(emp.firstName || "");
        setLastName(emp.lastName || "");
        setPhone(emp.phone || "");
        setPersonalEmail(emp.personalEmail || emp.email || "");
        setDateOfBirth(formatDateToDDMMYYYY(emp.dateOfBirth));
        setGender(emp.gender || "male");
        setBloodGroup(emp.bloodGroup || "");
        setMaritalStatus(emp.maritalStatus || "");
        setPhoto(emp.photo || "");

        const curr = emp.currentAddress || {};
        setCurrAddrLine1(curr.addressLine1 || "");
        setCurrCity(curr.city || "");
        setCurrState(curr.state || "");
        setCurrPincode(curr.pincode || "");

        const perm = emp.permanentAddress || {};
        setSameAsCurrent(emp.sameAsCurrentAddress || false);
        setPermAddrLine1(perm.addressLine1 || "");
        setPermCity(perm.city || "");
        setPermState(perm.state || "");
        setPermPincode(perm.pincode || "");

        const emerg = emp.emergencyContact || {};
        setEmergName(emerg.name || "");
        setEmergRel(emerg.relationship || "");
        setEmergPhone(emerg.phone || "");
        setEmergAltPhone(emerg.alternatePhone || "");

        const docs = emp.documents || {};
        setAadhaarNumber(docs.aadhaarNumber || "");
        setPanNumber(docs.panNumber || "");
        setAadhaarFront(docs.aadhaarFront || "");
        setAadhaarBack(docs.aadhaarBack || "");
        setPanCard(docs.panCard || "");
        setResume(docs.resume || "");

        const bank = emp.bankDetails || {};
        setBankName(bank.bankName || "");
        setAccountHolderName(bank.accountHolderName || "");
        setAccountNumber(bank.accountNumber || "");
        setIfscCode(bank.ifscCode || "");
        setUpiId(bank.upiId || "");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load profile for edit.");
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!firstName.trim()) return "First name is required.";
      if (!phone.trim()) return "Phone number is required.";
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep(currentStep);
    if (error) {
      Alert.alert("Validation Error", error);
      return;
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

  const handleSubmit = async () => {
    const error = validateStep(currentStep);
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName,
        lastName,
        phone,
        personalEmail,
        dateOfBirth: parseDDMMYYYYToDateStr(dateOfBirth),
        gender,
        bloodGroup,
        maritalStatus,
        photo,
        currentAddress: {
          addressLine1: currAddrLine1,
          city: currCity,
          state: currState,
          pincode: currPincode,
        },
        sameAsCurrentAddress: sameAsCurrent,
        permanentAddress: sameAsCurrent
          ? {
              addressLine1: currAddrLine1,
              city: currCity,
              state: currState,
              pincode: currPincode,
            }
          : {
              addressLine1: permAddrLine1,
              city: permCity,
              state: permState,
              pincode: permPincode,
            },
        emergencyContact: {
          name: emergName,
          relationship: emergRel,
          phone: emergPhone,
          alternatePhone: emergAltPhone,
        },
        documents: {
          aadhaarNumber,
          panNumber,
          aadhaarFront,
          aadhaarBack,
          panCard,
          resume,
        },
        bankDetails: {
          bankName,
          accountHolderName,
          accountNumber,
          ifscCode,
          upiId,
        },
      };

      const { data } = await updateSelfProfileApi(payload);
      if (data && data.success) {
        Alert.alert("Success", "Profile updated successfully!");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  let Layout;
  if (isEmployeeRole(user?.role)) {
    Layout = EmployeeLayout;
  } else if (user?.role === "Manager") {
    Layout = ManagerLayout;
  } else {
    Layout = EmployeeLayout;
  }

  return (
    <Layout navigation={navigation} title="Edit My Profile" showBackButton>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        {/* Step Indicator Header */}
        <View style={styles.stepperContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepperScroll}>
            {STEPS.map((stepName, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              return (
                <TouchableOpacity
                  key={stepName}
                  style={[
                    styles.stepPill,
                    isActive && styles.stepPillActive,
                    isCompleted && styles.stepPillCompleted
                  ]}
                  onPress={() => setCurrentStep(idx)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.stepNumBox, isActive && styles.stepNumBoxActive, isCompleted && styles.stepNumBoxCompleted]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.stepNumText, (isActive || isCompleted) && { color: "#FFFFFF" }]}>
                        {idx + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepPillText, isActive && styles.stepPillTextActive]}>
                    {stepName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Step 1: Personal Info */}
          {currentStep === 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                <Text style={styles.cardHeaderTitle}>Personal Information</Text>
              </View>

              <PhotoPickerField
                label="Profile Picture"
                value={photo}
                onChange={setPhoto}
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#94A3B8" />
                </View>

                <View style={styles.half}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#94A3B8" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Mobile phone contact" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Personal Email</Text>
              <TextInput style={styles.input} value={personalEmail} onChangeText={setPersonalEmail} keyboardType="email-address" placeholder="Personal email address" placeholderTextColor="#94A3B8" autoCapitalize="none" />

              <Text style={styles.inputLabel}>Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowDobPicker(true)} style={styles.selectInput} activeOpacity={0.8}>
                <Text style={[styles.selectInputText, !dateOfBirth && { color: "#94A3B8" }]}>{dateOfBirth || "DD/MM/YYYY"}</Text>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {["male", "female", "other"].map((g) => {
                  const isSelected = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderChip, isSelected && styles.genderChipActive]}
                      onPress={() => setGender(g)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genderChipText, isSelected && styles.genderChipTextActive]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.inputLabel}>Blood Group</Text>
                  <TouchableOpacity onPress={() => setShowBloodModal(true)} style={styles.selectInput} activeOpacity={0.8}>
                    <Text style={[styles.selectInputText, !bloodGroup && { color: "#94A3B8" }]}>{bloodGroup || "Select Group"}</Text>
                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.half}>
                  <Text style={styles.inputLabel}>Marital Status</Text>
                  <TouchableOpacity onPress={() => setShowMaritalModal(true)} style={styles.selectInput} activeOpacity={0.8}>
                    <Text style={[styles.selectInputText, !maritalStatus && { color: "#94A3B8" }]}>{maritalStatus || "Select Status"}</Text>
                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Address Details */}
          {currentStep === 1 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={styles.cardHeaderTitle}>Current Address</Text>
              </View>

              <Text style={styles.inputLabel}>Address Line 1</Text>
              <TextInput style={styles.input} value={currAddrLine1} onChangeText={setCurrAddrLine1} placeholder="Flat, Street, Building" placeholderTextColor="#94A3B8" />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput style={styles.input} value={currCity} onChangeText={setCurrCity} placeholder="City name" placeholderTextColor="#94A3B8" />
                </View>

                <View style={styles.half}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TouchableOpacity onPress={() => setShowCurrStateModal(true)} style={styles.selectInput} activeOpacity={0.8}>
                    <Text style={[styles.selectInputText, !currState && { color: "#94A3B8" }]}>{currState || "Select State"}</Text>
                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.inputLabel}>Pincode</Text>
              <TextInput style={styles.input} value={currPincode} onChangeText={setCurrPincode} keyboardType="number-pad" placeholder="6-digit Pincode" placeholderTextColor="#94A3B8" maxLength={6} />

              <View style={styles.cardDivider} />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Permanent address same as current address</Text>
                <Switch
                  value={sameAsCurrent}
                  onValueChange={(val) => {
                    setSameAsCurrent(val);
                    if (val) {
                      setPermAddrLine1(currAddrLine1);
                      setPermCity(currCity);
                      setPermState(currState);
                      setPermPincode(currPincode);
                    }
                  }}
                  trackColor={{ false: "#CBD5E1", true: COLORS.primarySoft }}
                  thumbColor={sameAsCurrent ? COLORS.primary : "#94A3B8"}
                />
              </View>

              {!sameAsCurrent && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.cardHeaderTitle}>Permanent Address</Text>

                  <Text style={styles.inputLabel}>Address Line 1</Text>
                  <TextInput style={styles.input} value={permAddrLine1} onChangeText={setPermAddrLine1} placeholder="Flat, Street, Building" placeholderTextColor="#94A3B8" />

                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={styles.inputLabel}>City</Text>
                      <TextInput style={styles.input} value={permCity} onChangeText={setPermCity} placeholder="City name" placeholderTextColor="#94A3B8" />
                    </View>

                    <View style={styles.half}>
                      <Text style={styles.inputLabel}>State</Text>
                      <TouchableOpacity onPress={() => setShowPermStateModal(true)} style={styles.selectInput} activeOpacity={0.8}>
                        <Text style={[styles.selectInputText, !permState && { color: "#94A3B8" }]}>{permState || "Select State"}</Text>
                        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Pincode</Text>
                  <TextInput style={styles.input} value={permPincode} onChangeText={setPermPincode} keyboardType="number-pad" placeholder="6-digit Pincode" placeholderTextColor="#94A3B8" maxLength={6} />
                </View>
              )}
            </View>
          )}

          {/* Step 3: Emergency Contact */}
          {currentStep === 2 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="heart-outline" size={16} color={COLORS.primary} />
                <Text style={styles.cardHeaderTitle}>Emergency Contact Details</Text>
              </View>

              <Text style={styles.inputLabel}>Contact Person Name</Text>
              <TextInput style={styles.input} value={emergName} onChangeText={setEmergName} placeholder="Full name of emergency contact" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput style={styles.input} value={emergRel} onChangeText={setEmergRel} placeholder="e.g. Spouse, Parent, Sibling" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.input} value={emergPhone} onChangeText={setEmergPhone} keyboardType="phone-pad" placeholder="Emergency contact phone" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Alternate Phone (Optional)</Text>
              <TextInput style={styles.input} value={emergAltPhone} onChangeText={setEmergAltPhone} keyboardType="phone-pad" placeholder="Secondary contact number" placeholderTextColor="#94A3B8" />
            </View>
          )}

          {/* Step 4: Identity Proofs */}
          {currentStep === 3 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
                <Text style={styles.cardHeaderTitle}>Identity & Documents</Text>
              </View>

              <Text style={styles.inputLabel}>Aadhaar Number</Text>
              <TextInput style={styles.input} value={aadhaarNumber} onChangeText={setAadhaarNumber} keyboardType="number-pad" placeholder="12-digit Aadhaar number" placeholderTextColor="#94A3B8" maxLength={12} />

              <DocumentPickerField label="Aadhaar Front Copy" value={aadhaarFront} onChange={setAadhaarFront} />
              <DocumentPickerField label="Aadhaar Back Copy" value={aadhaarBack} onChange={setAadhaarBack} />

              <View style={styles.cardDivider} />

              <Text style={styles.inputLabel}>PAN Number</Text>
              <TextInput style={styles.input} value={panNumber} onChangeText={setPanNumber} autoCapitalize="characters" placeholder="10-digit PAN ID" placeholderTextColor="#94A3B8" maxLength={10} />

              <DocumentPickerField label="PAN Card Document" value={panCard} onChange={setPanCard} />

              <View style={styles.cardDivider} />

              <DocumentPickerField label="Resume / Curriculum Vitae" value={resume} onChange={setResume} />
            </View>
          )}

          {/* Step 5: Bank Accounts */}
          {currentStep === 4 && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="business-outline" size={16} color={COLORS.primary} />
                <Text style={styles.cardHeaderTitle}>Bank Account Details</Text>
              </View>

              <Text style={styles.inputLabel}>Bank Name</Text>
              <TouchableOpacity onPress={() => setShowBankModal(true)} style={styles.selectInput} activeOpacity={0.8}>
                <Text style={[styles.selectInputText, !bankName && { color: "#94A3B8" }]}>{bankName || "Select Bank"}</Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput style={styles.input} value={accountHolderName} onChangeText={setAccountHolderName} placeholder="Name as per bank passbook" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Account Number</Text>
              <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" placeholder="Bank account number" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>IFSC Code</Text>
              <TextInput style={styles.input} value={ifscCode} onChangeText={setIfscCode} autoCapitalize="characters" placeholder="11-character IFSC code" placeholderTextColor="#94A3B8" maxLength={11} />

              <Text style={styles.inputLabel}>UPI ID (Optional)</Text>
              <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} placeholder="e.g. username@upi" placeholderTextColor="#94A3B8" autoCapitalize="none" />
            </View>
          )}

          <View style={{ height: 100 }} />
        </KeyboardAwareScrollView>

        {/* Sticky Action Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.prevBtn} onPress={handlePrev} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={18} color={COLORS.darkNavy} style={{ marginRight: 4 }} />
              <Text style={styles.prevBtnText}>Previous</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextBtnContainer, currentStep === 0 && { flex: 1 }]}
            onPress={currentStep === STEPS.length - 1 ? handleSubmit : handleNext}
            disabled={submitting}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#1268D9', '#0D50B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {currentStep === STEPS.length - 1 ? "Save Profile" : "Next Step"}
                  </Text>
                  <Ionicons
                    name={currentStep === STEPS.length - 1 ? "checkmark-circle" : "arrow-forward"}
                    size={18}
                    color="#FFFFFF"
                    style={{ marginLeft: 6 }}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Date of Birth Modal */}
        <DatePickerModal
          visible={showDobPicker}
          onClose={() => setShowDobPicker(false)}
          onSelectDate={(formattedDate) => {
            setDateOfBirth(formattedDate);
            setShowDobPicker(false);
          }}
        />

        {/* State Modals */}
        <StatePickerModal
          visible={showCurrStateModal}
          onClose={() => setShowCurrStateModal(false)}
          onSelectState={(st) => {
            setCurrState(st);
            if (sameAsCurrent) setPermState(st);
            setShowCurrStateModal(false);
          }}
          selectedState={currState}
        />

        <StatePickerModal
          visible={showPermStateModal}
          onClose={() => setShowPermStateModal(false)}
          onSelectState={(st) => {
            setPermState(st);
            setShowPermStateModal(false);
          }}
          selectedState={permState}
        />

        {/* Selection Modals */}
        <SimpleSelectionModal
          visible={showBloodModal}
          onClose={() => setShowBloodModal(false)}
          onSelect={setBloodGroup}
          selectedValue={bloodGroup}
          options={BLOOD_GROUPS}
          title="Select Blood Group"
        />

        <SimpleSelectionModal
          visible={showMaritalModal}
          onClose={() => setShowMaritalModal(false)}
          onSelect={setMaritalStatus}
          selectedValue={maritalStatus}
          options={MARITAL_STATUSES}
          title="Select Marital Status"
        />

        <SimpleSelectionModal
          visible={showBankModal}
          onClose={() => setShowBankModal(false)}
          onSelect={setBankName}
          selectedValue={bankName}
          options={bankList && bankList.length > 0 ? bankList : ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank"]}
          title="Select Bank Name"
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  stepperContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  stepperScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepPillActive: {
    backgroundColor: COLORS.darkNavy,
    borderColor: COLORS.darkNavy,
  },
  stepPillCompleted: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  stepNumBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  stepNumBoxActive: {
    backgroundColor: COLORS.primary,
  },
  stepNumBoxCompleted: {
    backgroundColor: "#10B981",
  },
  stepNumText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: COLORS.darkNavy,
  },
  stepPillText: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text.muted,
  },
  stepPillTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.bodyBold,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: ROUNDING.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...SHADOWS.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 14,
    color: COLORS.darkNavy,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  half: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12.5,
    color: COLORS.darkNavy,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 11,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 11,
  },
  selectInputText: {
    fontFamily: FONTS.body,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  genderChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  genderChipActive: {
    backgroundColor: COLORS.primaryGhost,
    borderColor: COLORS.primary,
  },
  genderChipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text.muted,
  },
  genderChipTextActive: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    flex: 1,
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.darkNavy,
    marginRight: 10,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    gap: 10,
    ...SHADOWS.md,
  },
  prevBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  prevBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.darkNavy,
  },
  nextBtnContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  nextBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  nextBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  pickerDropdownCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pickerModalTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 17,
    color: COLORS.darkNavy,
  },
  modalCloseIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pickerSelectedItemRow: {
    backgroundColor: COLORS.primaryGhost,
    borderRadius: 8,
  },
  pickerItemText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13.5,
    color: COLORS.darkNavy,
  },
  pickerSelectedItemText: {
    fontFamily: FONTS.bodyBold,
    color: COLORS.primary,
  },
});

export default EmployeeEditProfileScreen;
