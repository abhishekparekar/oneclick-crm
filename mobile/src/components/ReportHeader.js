import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
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

const ReportHeader = ({
  title,
  month,
  year,
  setMonth,
  setYear,
  onDownload,
  downloading = false,
  onExportExcel,
  exportingExcel = false,
  extraFilters,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);

  const selectedMonthLabel =
    MONTHS.find((m) => String(m.value) === String(month))?.label || "Month";
  const selectedYearLabel = year ? String(year) : "All Years";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar: Back Button, Title, and Export Buttons */}
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
            }}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.actionGroup}>
          {onExportExcel && (
            <TouchableOpacity
              style={[
                styles.excelBtn,
                exportingExcel && { opacity: 0.6 },
              ]}
              onPress={onExportExcel}
              disabled={exportingExcel || downloading}
              activeOpacity={0.8}
            >
              {exportingExcel ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="document-text" size={13} color="#FFFFFF" />
                  <Text style={styles.btnLabel}>Excel</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {onDownload && (
            <TouchableOpacity
              style={[
                styles.pdfBtn,
                downloading && { opacity: 0.6 },
              ]}
              onPress={onDownload}
              disabled={downloading || exportingExcel}
              activeOpacity={0.8}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="arrow-down-circle" size={13} color="#FFFFFF" />
                  <Text style={styles.btnLabel}>PDF</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Compact Filters Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.pillDropdown}
          onPress={() => setShowMonthModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={13} color="#64748B" />
          <Text style={styles.pillText} numberOfLines={1}>
            {selectedMonthLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillDropdown}
          onPress={() => setShowYearModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={13} color="#64748B" />
          <Text style={styles.pillText} numberOfLines={1}>
            {selectedYearLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {extraFilters && <View style={styles.extraFilterRow}>{extraFilters}</View>}

      {/* Month Selector Modal */}
      <Modal visible={showMonthModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {MONTHS.map((m) => {
                const isSelected = String(m.value) === String(month);
                return (
                  <TouchableOpacity
                    key={m.label}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setMonth(m.value);
                      setShowMonthModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#0284C7" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Year Selector Modal */}
      <Modal visible={showYearModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearModal(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260 }}>
              {YEARS.map((y) => {
                const isSelected = String(y) === String(year);
                return (
                  <TouchableOpacity
                    key={y || "all"}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setYear(y);
                      setShowYearModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextActive,
                      ]}
                    >
                      {y ? y : "All Years"}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#0284C7" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    fontWeight: "800",
    flex: 1,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  excelBtn: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 7,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  pdfBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 7,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  btnLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  pillDropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#1E293B",
    flex: 1,
    marginHorizontal: 6,
  },
  extraFilterRow: {
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.displayBold,
    color: "#0F172A",
    fontWeight: "700",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 1,
  },
  modalOptionActive: {
    backgroundColor: "#F0F9FF",
  },
  modalOptionText: {
    fontSize: 12.5,
    fontFamily: FONTS.body,
    color: "#334155",
  },
  modalOptionTextActive: {
    color: "#0284C7",
    fontFamily: FONTS.bodyBold,
    fontWeight: "700",
  },
});

export default ReportHeader;
