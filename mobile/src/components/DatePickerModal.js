import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DatePickerModal = ({ visible, onClose, onSelect, initialDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [mode, setMode] = useState("calendar"); // "calendar" | "year"

  useEffect(() => {
    if (visible) {
      let initialY = new Date().getFullYear() - 25; // default to 25 years ago for DOB
      let initialM = new Date().getMonth();
      let initialD = null;

      if (initialDate) {
        const parts = initialDate.split("/");
        if (parts.length === 3) {
          initialD = parseInt(parts[0], 10);
          initialM = parseInt(parts[1], 10) - 1;
          initialY = parseInt(parts[2], 10);
        }
      }

      setCurrentYear(initialY);
      setCurrentMonth(initialM);
      setSelectedDay(initialD);
      setMode("calendar");
    }
  }, [visible, initialDate]);

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Years from 1950 to current year
  const years = [];
  const currentMaxYear = new Date().getFullYear();
  for (let y = currentMaxYear; y >= 1950; y--) {
    years.push(y);
  }

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const daysGrid = [];
  for (let i = 0; i < firstDay; i++) {
    daysGrid.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(i);
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDate = (day) => {
    if (!day) return;
    setSelectedDay(day);
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    onSelect(`${dayStr}/${monthStr}/${currentYear}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.calendarCard}>
          {mode === "calendar" ? (
            <>
              {/* Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.headerChevron}>
                  <Ionicons name="chevron-back" size={20} color="#1e293b" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setMode("year")} style={styles.headerTitleBtn}>
                  <Text style={styles.headerTitleText}>
                    {MONTHS[currentMonth]} {currentYear}
                  </Text>
                  <Ionicons name="caret-down" size={12} color="#C2410C" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNextMonth} style={styles.headerChevron}>
                  <Ionicons name="chevron-forward" size={20} color="#1e293b" />
                </TouchableOpacity>
              </View>

              {/* Weekday Labels */}
              <View style={styles.weekdaysRow}>
                {DAYS_OF_WEEK.map((d) => (
                  <Text key={d} style={styles.weekdayLabel}>{d}</Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {daysGrid.map((day, idx) => {
                  const isSelected = day === selectedDay;
                  return (
                    <TouchableOpacity
                      key={idx}
                      disabled={!day}
                      onPress={() => handleSelectDate(day)}
                      style={[
                        styles.dayCell,
                        isSelected && styles.selectedDayCell
                      ]}
                    >
                      <Text style={[
                        styles.dayCellText,
                        !day && { color: "transparent" },
                        isSelected && styles.selectedDayCellText
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Year Selector */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Year</Text>
                <TouchableOpacity onPress={() => setMode("calendar")}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {years.map((item) => {
                  const isSelected = item === currentYear;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.yearItem, isSelected && styles.selectedYearItem]}
                      onPress={() => {
                        setCurrentYear(item);
                        setMode("calendar");
                      }}
                    >
                      <Text style={[styles.yearItemText, isSelected && styles.selectedYearItemText]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerChevron: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  headerTitleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(15, 118, 110, 0.1)",
  },
  headerTitleText: {
    fontSize: 14.5,
    fontWeight: "750",
    color: "#1e293b",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedDayCell: {
    backgroundColor: "#C2410C",
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  selectedDayCellText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
  },
  cancelBtnText: {
    fontSize: 13.5,
    color: "#ef4444",
    fontWeight: "750",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  yearItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: "center",
  },
  selectedYearItem: {
    backgroundColor: "rgba(15, 118, 110, 0.1)",
  },
  yearItemText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "650",
  },
  selectedYearItemText: {
    color: "#C2410C",
    fontWeight: "800",
  },
});

export default DatePickerModal;
