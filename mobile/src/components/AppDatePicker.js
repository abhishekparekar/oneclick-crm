import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const AppDatePicker = ({
  label,
  value,
  onChangeText,
  placeholder = "DD/MM/YYYY",
  error,
  compact = false,
  containerStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [viewMode, setViewMode] = useState("calendar"); // 'calendar' | 'month' | 'year'

  // Parse initial value into selected date state
  useEffect(() => {
    if (value && typeof value === "string" && value.includes("/")) {
      const parts = value.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && year < 2100) {
          setCurrentYear(year);
          setCurrentMonth(month);
        }
      }
    }
  }, [value, modalVisible]);

  // Today helpers
  const today = useMemo(() => new Date(), []);
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Selected date components
  const selectedDateComponents = useMemo(() => {
    if (!value || typeof value !== "string" || !value.includes("/")) return null;
    const parts = value.split("/");
    if (parts.length !== 3) return null;
    return {
      day: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1,
      year: parseInt(parts[2], 10),
    };
  }, [value]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Days in month calculation
  const daysArray = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalSlots = [];

    // Leading empty slots for alignment
    for (let i = 0; i < firstDayIndex; i++) {
      totalSlots.push({ type: "empty", key: `empty-${i}` });
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      totalSlots.push({ type: "day", value: d, key: `day-${d}` });
    }

    return totalSlots;
  }, [currentYear, currentMonth]);

  // Select day handler
  const handleSelectDay = (day) => {
    const dStr = String(day).padStart(2, "0");
    const mStr = String(currentMonth + 1).padStart(2, "0");
    onChangeText(`${dStr}/${mStr}/${currentYear}`);
    setModalVisible(false);
    setViewMode("calendar");
  };

  // Select Today handler
  const handleSelectToday = () => {
    const dStr = String(todayDay).padStart(2, "0");
    const mStr = String(todayMonth + 1).padStart(2, "0");
    onChangeText(`${dStr}/${mStr}/${todayYear}`);
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setModalVisible(false);
    setViewMode("calendar");
  };

  // Year list generation
  const yearsList = useMemo(() => {
    const startYear = 1970;
    const endYear = new Date().getFullYear() + 15;
    const list = [];
    for (let y = endYear; y >= startYear; y--) {
      list.push(y);
    }
    return list;
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputWrapper, error && styles.inputError]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <TextInput
          style={[styles.input, compact && styles.inputCompact]}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          maxLength={10}
        />
        <TouchableOpacity
          style={styles.calendarIconBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar" size={18} color="#F97316" />
        </TouchableOpacity>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Calendar Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            
            {/* Header / Month-Year Title & Navigation */}
            <View style={styles.cardHeader}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.navArrowBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={20} color="#334155" />
              </TouchableOpacity>

              <View style={styles.headerSelectorWrap}>
                <TouchableOpacity
                  style={[styles.selectorPill, viewMode === "month" && styles.selectorPillActive]}
                  onPress={() => setViewMode(viewMode === "month" ? "calendar" : "month")}
                >
                  <Text style={[styles.selectorPillText, viewMode === "month" && styles.selectorPillTextActive]}>
                    {MONTHS[currentMonth]}
                  </Text>
                  <Ionicons
                    name={viewMode === "month" ? "chevron-up" : "chevron-down"}
                    size={12}
                    color={viewMode === "month" ? "#F97316" : "#64748B"}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.selectorPill, viewMode === "year" && styles.selectorPillActive]}
                  onPress={() => setViewMode(viewMode === "year" ? "calendar" : "year")}
                >
                  <Text style={[styles.selectorPillText, viewMode === "year" && styles.selectorPillTextActive]}>
                    {currentYear}
                  </Text>
                  <Ionicons
                    name={viewMode === "year" ? "chevron-up" : "chevron-down"}
                    size={12}
                    color={viewMode === "year" ? "#F97316" : "#64748B"}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.navArrowBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-forward" size={20} color="#334155" />
              </TouchableOpacity>
            </View>

            {/* View Mode: Month Grid */}
            {viewMode === "month" && (
              <View style={styles.monthsGrid}>
                {SHORT_MONTHS.map((mName, idx) => {
                  const isCurMonth = idx === currentMonth;
                  return (
                    <TouchableOpacity
                      key={mName}
                      style={[styles.monthItem, isCurMonth && styles.monthItemActive]}
                      onPress={() => {
                        setCurrentMonth(idx);
                        setViewMode("calendar");
                      }}
                    >
                      <Text style={[styles.monthItemText, isCurMonth && styles.monthItemTextActive]}>
                        {mName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* View Mode: Year List */}
            {viewMode === "year" && (
              <View style={styles.yearPickerListContainer}>
                <FlatList
                  data={yearsList}
                  keyExtractor={(item) => String(item)}
                  initialScrollIndex={
                    yearsList.indexOf(currentYear) !== -1
                      ? Math.max(0, yearsList.indexOf(currentYear) - 3)
                      : 0
                  }
                  getItemLayout={(data, index) => ({ length: 44, offset: 44 * index, index })}
                  renderItem={({ item }) => {
                    const isCurYear = item === currentYear;
                    return (
                      <TouchableOpacity
                        style={[styles.yearItem, isCurYear && styles.yearItemActive]}
                        onPress={() => {
                          setCurrentYear(item);
                          setViewMode("calendar");
                        }}
                      >
                        <Text style={[styles.yearItemText, isCurYear && styles.yearItemTextActive]}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

            {/* View Mode: Standard Calendar Grid */}
            {viewMode === "calendar" && (
              <View style={styles.calendarContainer}>
                {/* Weekdays Row (Fixed 7 columns) */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((w, idx) => (
                    <View key={idx} style={styles.weekdayCol}>
                      <Text style={[styles.weekdayText, (idx === 0 || idx === 6) && styles.weekendText]}>
                        {w}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Days Matrix (Fixed 7 columns) */}
                <View style={styles.daysMatrix}>
                  {daysArray.map((slot) => {
                    if (slot.type === "empty") {
                      return <View key={slot.key} style={styles.dayCol} />;
                    }

                    const dayNum = slot.value;
                    const isSelected =
                      selectedDateComponents &&
                      selectedDateComponents.day === dayNum &&
                      selectedDateComponents.month === currentMonth &&
                      selectedDateComponents.year === currentYear;

                    const isToday =
                      todayDay === dayNum &&
                      todayMonth === currentMonth &&
                      todayYear === currentYear;

                    return (
                      <View key={slot.key} style={styles.dayCol}>
                        <TouchableOpacity
                          style={[
                            styles.dayCell,
                            isToday && styles.dayCellToday,
                            isSelected && styles.dayCellSelected,
                          ]}
                          onPress={() => handleSelectDay(dayNum)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isToday && styles.dayTextToday,
                              isSelected && styles.dayTextSelected,
                            ]}
                          >
                            {dayNum}
                          </Text>
                          {isToday && !isSelected && <View style={styles.todayDot} />}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Footer Actions */}
            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.todayShortcutBtn} onPress={handleSelectToday}>
                <Ionicons name="today-outline" size={15} color="#F97316" style={{ marginRight: 5 }} />
                <Text style={styles.todayShortcutText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeActionBtn}
                onPress={() => {
                  setModalVisible(false);
                  setViewMode("calendar");
                }}
              >
                <Text style={styles.closeActionText}>Close</Text>
              </TouchableOpacity>
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
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "600",
  },
  inputCompact: {
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  calendarIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },

  // Modal & Card Layout
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 350,
    padding: 16,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSelectorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectorPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectorPillActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  selectorPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  selectorPillTextActive: {
    color: "#F97316",
  },

  // Months Grid Mode
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  monthItem: {
    width: "30%",
    paddingVertical: 12,
    marginVertical: 4,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  monthItemActive: {
    backgroundColor: "#F97316",
    borderColor: "#EA580C",
  },
  monthItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  monthItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Year List Mode
  yearPickerListContainer: {
    height: 240,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  yearItem: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  yearItemActive: {
    backgroundColor: "#FFF7ED",
  },
  yearItemText: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "600",
  },
  yearItemTextActive: {
    color: "#F97316",
    fontWeight: "800",
    fontSize: 16,
  },

  // Calendar Day Grid
  calendarContainer: {
    paddingVertical: 4,
  },
  weekdaysRow: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  weekdayCol: {
    width: "14.285%",
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textAlign: "center",
  },
  weekendText: {
    color: "#CBD5E1",
  },
  daysMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  dayCol: {
    width: "14.285%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 1,
  },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  dayCellSelected: {
    backgroundColor: "#F97316",
    borderColor: "#EA580C",
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1E293B",
  },
  dayTextToday: {
    color: "#F97316",
    fontWeight: "800",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F97316",
    position: "absolute",
    bottom: 2,
  },

  // Footer Actions
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  todayShortcutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
  },
  todayShortcutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#F97316",
  },
  closeActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});

export default AppDatePicker;
