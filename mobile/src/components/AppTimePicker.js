import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Standard lists for 12-hour clock
const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const parseTo12HourParts = (rawVal) => {
  let h24 = 10;
  let min = 0;

  if (rawVal) {
    if (typeof rawVal === "string" && rawVal.includes("T")) {
      const d = new Date(rawVal);
      if (!isNaN(d.getTime())) {
        h24 = d.getHours();
        min = d.getMinutes();
      }
    } else if (typeof rawVal === "string" && rawVal.includes(":")) {
      const parts = rawVal.split(":");
      h24 = parseInt(parts[0], 10) || 0;
      min = parseInt(parts[1], 10) || 0;
    }
  }

  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;

  return {
    hour: String(h12).padStart(2, "0"),
    minute: String(min).padStart(2, "0"),
    period,
  };
};

const convert12To24Hour = (hour12Str, minuteStr, period) => {
  let h = parseInt(hour12Str, 10) || 12;
  const m = parseInt(minuteStr, 10) || 0;

  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const AppTimePicker = ({
  label,
  value,
  onChangeText,
  onChange,
  placeholder = "HH:MM",
  error,
  containerStyle,
  disabled = false,
}) => {
  const systemTheme = useColorScheme();
  const isDark = systemTheme === "dark";

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState("10");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedPeriod, setSelectedPeriod] = useState("AM");

  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);

  // Formatted display on the trigger button
  const displayTime = useMemo(() => {
    if (!value) return "";
    if (typeof value === "string") {
      if (value.includes("T")) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          let hours = d.getHours();
          const minutes = String(d.getMinutes()).padStart(2, "0");
          const ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12 || 12;
          return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
        }
      }
      if (value.includes(":")) {
        const parts = value.split(":");
        let hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const ampm = hours >= 12 ? "PM" : "AM";
          const h12 = hours % 12 || 12;
          return `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
        }
      }
    }
    return String(value);
  }, [value]);

  // Sync internal state when value or modal visibility changes
  useEffect(() => {
    if (modalVisible) {
      const parts = parseTo12HourParts(value);
      setSelectedHour(parts.hour);
      setSelectedMinute(parts.minute);
      setSelectedPeriod(parts.period);

      // Auto-scroll to selected items for great UX
      setTimeout(() => {
        const hIdx = HOURS.indexOf(parts.hour);
        if (hIdx > 0 && hourScrollRef.current) {
          hourScrollRef.current.scrollTo({ y: Math.max(0, (hIdx - 1) * 42), animated: true });
        }
        const mIdx = MINUTES.indexOf(parts.minute);
        if (mIdx > 0 && minuteScrollRef.current) {
          minuteScrollRef.current.scrollTo({ y: Math.max(0, (mIdx - 1) * 42), animated: true });
        }
      }, 120);
    }
  }, [modalVisible, value]);

  const handleDone = () => {
    const val24 = convert12To24Hour(selectedHour, selectedMinute, selectedPeriod);
    if (typeof onChangeText === "function") onChangeText(val24);
    if (typeof onChange === "function") onChange(val24);
    setModalVisible(false);
  };

  const handleSelectPreset = (h, m, p) => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedPeriod(p);
    // Smoothly scroll to preset
    const hIdx = HOURS.indexOf(h);
    if (hIdx >= 0 && hourScrollRef.current) {
      hourScrollRef.current.scrollTo({ y: Math.max(0, (hIdx - 1) * 42), animated: true });
    }
    const mIdx = MINUTES.indexOf(m);
    if (mIdx >= 0 && minuteScrollRef.current) {
      minuteScrollRef.current.scrollTo({ y: Math.max(0, (mIdx - 1) * 42), animated: true });
    }
  };

  const handleSelectNow = () => {
    const d = new Date();
    const parts = parseTo12HourParts(d.toISOString());
    handleSelectPreset(parts.hour, parts.minute, parts.period);
  };

  // Preset chips
  const presets = [
    { label: "09:00 AM", h: "09", m: "00", p: "AM" },
    { label: "10:00 AM", h: "10", m: "00", p: "AM" },
    { label: "02:00 PM", h: "02", m: "00", p: "PM" },
    { label: "06:00 PM", h: "06", m: "00", p: "PM" },
  ];

  // Dynamic Theme Colors
  const themeColors = {
    overlay: isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(15, 23, 42, 0.65)",
    cardBg: isDark ? "#0F172A" : "#FFFFFF",
    cardBorder: isDark ? "#1E293B" : "#E2E8F0",
    headerBg: isDark ? "#1E293B" : "#F8FAFC",
    headerBorder: isDark ? "#334155" : "#F1F5F9",
    title: isDark ? "#F8FAFC" : "#0F172A",
    cancelBtn: isDark ? "#94A3B8" : "#64748B",
    doneBtn: "#F97316",
    displayBoxBg: isDark ? "#1E293B" : "#F1F5F9",
    displayDigits: isDark ? "#38BDF8" : "#1268D9",
    columnBg: isDark ? "#1E293B" : "#F8FAFC",
    columnBorder: isDark ? "#334155" : "#E2E8F0",
    columnLabel: isDark ? "#64748B" : "#94A3B8",
    itemText: isDark ? "#CBD5E1" : "#334155",
    itemActiveBg: "#1268D9",
    itemActiveText: "#FFFFFF",
    periodActiveBg: "#F97316",
    presetBg: isDark ? "#1E293B" : "#EFF6FF",
    presetBorder: isDark ? "#334155" : "#DBEAFE",
    presetText: isDark ? "#38BDF8" : "#1268D9",
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputWrapper, error && styles.inputError, disabled && { opacity: 0.6 }]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={[styles.inputText, !value && { color: "#64748B" }]}>
          {displayTime || placeholder}
        </Text>
        <View style={styles.clockIconBtn}>
          <Ionicons name="time" size={18} color="#1D4ED8" />
        </View>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: themeColors.overlay }]}>
          <View
            style={[
              styles.pickerCard,
              {
                backgroundColor: themeColors.cardBg,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                styles.header,
                {
                  backgroundColor: themeColors.headerBg,
                  borderBottomColor: themeColors.headerBorder,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.headerBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.cancelBtn, { color: themeColors.cancelBtn }]}>Cancel</Text>
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: themeColors.title }]}>Select Time</Text>

              <TouchableOpacity
                onPress={handleDone}
                style={styles.headerBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.doneBtn, { color: themeColors.doneBtn }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Prominent Digital Time Preview Badge */}
            <View
              style={[
                styles.digitalPreviewBox,
                {
                  backgroundColor: themeColors.displayBoxBg,
                  borderColor: themeColors.columnBorder,
                },
              ]}
            >
              <View style={styles.digitalDigitsRow}>
                <Text style={[styles.digitalDigitText, { color: themeColors.displayDigits }]}>
                  {selectedHour}
                </Text>
                <Text style={[styles.digitalColonText, { color: themeColors.displayDigits }]}>
                  :
                </Text>
                <Text style={[styles.digitalDigitText, { color: themeColors.displayDigits }]}>
                  {selectedMinute}
                </Text>
                <View
                  style={[
                    styles.digitalPeriodBadge,
                    { backgroundColor: themeColors.periodActiveBg },
                  ]}
                >
                  <Text style={styles.digitalPeriodText}>{selectedPeriod}</Text>
                </View>
              </View>
            </View>

            {/* Time Columns: Hour | Minute | AM/PM */}
            <View style={styles.columnsContainer}>
              {/* Hour Column */}
              <View style={styles.columnWrap}>
                <Text style={[styles.columnLabel, { color: themeColors.columnLabel }]}>HOUR</Text>
                <View
                  style={[
                    styles.scrollBox,
                    {
                      backgroundColor: themeColors.columnBg,
                      borderColor: themeColors.columnBorder,
                    },
                  ]}
                >
                  <ScrollView
                    ref={hourScrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >
                    {HOURS.map((h) => {
                      const isSelected = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.itemCell,
                            isSelected && { backgroundColor: themeColors.itemActiveBg },
                          ]}
                          onPress={() => setSelectedHour(h)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.itemCellText,
                              { color: isSelected ? themeColors.itemActiveText : themeColors.itemText },
                              isSelected && styles.itemCellTextSelected,
                            ]}
                          >
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              <Text style={[styles.middleColon, { color: themeColors.columnLabel }]}>:</Text>

              {/* Minute Column */}
              <View style={styles.columnWrap}>
                <Text style={[styles.columnLabel, { color: themeColors.columnLabel }]}>MINUTE</Text>
                <View
                  style={[
                    styles.scrollBox,
                    {
                      backgroundColor: themeColors.columnBg,
                      borderColor: themeColors.columnBorder,
                    },
                  ]}
                >
                  <ScrollView
                    ref={minuteScrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >
                    {MINUTES.map((m) => {
                      const isSelected = selectedMinute === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.itemCell,
                            isSelected && { backgroundColor: themeColors.itemActiveBg },
                          ]}
                          onPress={() => setSelectedMinute(m)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.itemCellText,
                              { color: isSelected ? themeColors.itemActiveText : themeColors.itemText },
                              isSelected && styles.itemCellTextSelected,
                            ]}
                          >
                            {m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              {/* AM / PM Toggle Column */}
              <View style={[styles.columnWrap, { width: 68 }]}>
                <Text style={[styles.columnLabel, { color: themeColors.columnLabel }]}>PERIOD</Text>
                <View
                  style={[
                    styles.scrollBox,
                    styles.periodBox,
                    {
                      backgroundColor: themeColors.columnBg,
                      borderColor: themeColors.columnBorder,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.periodCell,
                      selectedPeriod === "AM" && { backgroundColor: themeColors.periodActiveBg },
                    ]}
                    onPress={() => setSelectedPeriod("AM")}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.periodCellText,
                        { color: selectedPeriod === "AM" ? "#FFFFFF" : themeColors.itemText },
                        selectedPeriod === "AM" && styles.itemCellTextSelected,
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.periodCell,
                      selectedPeriod === "PM" && { backgroundColor: themeColors.periodActiveBg },
                    ]}
                    onPress={() => setSelectedPeriod("PM")}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.periodCellText,
                        { color: selectedPeriod === "PM" ? "#FFFFFF" : themeColors.itemText },
                        selectedPeriod === "PM" && styles.itemCellTextSelected,
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Presets Row */}
            <View style={styles.presetsRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsContent}>
                <TouchableOpacity
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: themeColors.presetBg,
                      borderColor: themeColors.presetBorder,
                    },
                  ]}
                  onPress={handleSelectNow}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flash-outline" size={13} color={themeColors.presetText} style={{ marginRight: 3 }} />
                  <Text style={[styles.presetChipText, { color: themeColors.presetText }]}>Now</Text>
                </TouchableOpacity>

                {presets.map((p) => {
                  const isActive = selectedHour === p.h && selectedMinute === p.m && selectedPeriod === p.p;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isActive ? themeColors.itemActiveBg : themeColors.presetBg,
                          borderColor: isActive ? themeColors.itemActiveBg : themeColors.presetBorder,
                        },
                      ]}
                      onPress={() => handleSelectPreset(p.h, p.m, p.p)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isActive ? "#FFFFFF" : themeColors.presetText },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    justifyContent: "space-between",
    minHeight: 40,
  },
  inputText: {
    fontSize: 13.5,
    color: "#0F172A",
    fontWeight: "700",
  },
  clockIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 3,
  },

  // Modal Card Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  pickerCard: {
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cancelBtn: {
    fontSize: 14,
    fontWeight: "600",
  },
  doneBtn: {
    fontSize: 15,
    fontWeight: "800",
  },

  // Digital Time Preview
  digitalPreviewBox: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  digitalDigitsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  digitalDigitText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
  },
  digitalColonText: {
    fontSize: 24,
    fontWeight: "900",
    marginHorizontal: 4,
  },
  digitalPeriodBadge: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  digitalPeriodText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Columns
  columnsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  columnWrap: {
    flex: 1,
    alignItems: "center",
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  middleColon: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 16,
  },
  scrollBox: {
    height: 160,
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  periodBox: {
    justifyContent: "center",
    padding: 6,
    gap: 8,
  },
  scrollContent: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  itemCell: {
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  itemCellText: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemCellTextSelected: {
    fontWeight: "800",
    fontSize: 17,
  },
  periodCell: {
    height: 58,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  periodCellText: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Presets Row
  presetsRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
  },
  presetsContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

export default AppTimePicker;
