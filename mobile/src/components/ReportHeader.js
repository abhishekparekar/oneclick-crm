import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, StatusBar } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONTS } from "../theme/tokens";

const MONTHS = [
  { label: "All Months", value: "" },
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const YEARS = ["", "2024", "2025", "2026", "2027"];

const ReportHeader = ({ title, month, year, setMonth, setYear, onDownload, downloading }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => { if (navigation.canGoBack()) navigation.goBack(); }} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>
        <TouchableOpacity style={styles.downloadBtn} onPress={onDownload} disabled={downloading}>
          {downloading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="arrow-down-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadBtnText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterRow}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={month}
            onValueChange={(itemValue) => setMonth(itemValue)}
            style={styles.picker}
            dropdownIconColor="#475569"
            mode="dropdown"
          >
            {MONTHS.map((m) => (
              <Picker.Item
                key={m.label}
                label={m.label}
                value={m.value}
                color="#0f172a"
                style={{ fontSize: 13, fontFamily: FONTS.bodyMedium }}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={year}
            onValueChange={(itemValue) => setYear(itemValue)}
            style={styles.picker}
            dropdownIconColor="#475569"
            mode="dropdown"
          >
            <Picker.Item label="All Years" value="" color="#0f172a" style={{ fontSize: 13, fontFamily: FONTS.bodyMedium }} />
            {YEARS.filter(Boolean).map((y) => (
              <Picker.Item key={y} label={y} value={y} color="#0f172a" style={{ fontSize: 13, fontFamily: FONTS.bodyMedium }} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: "#0f172a",
    fontWeight: "800",
  },
  downloadBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  downloadBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    height: 46,
    justifyContent: "center",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 46,
    color: "#0f172a",
  },
});

export default ReportHeader;
