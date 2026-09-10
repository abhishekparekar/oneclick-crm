import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/tokens";

const { width } = Dimensions.get("window");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AttendanceDatePickerModal = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const todayStr = getTodayStr();

  // Parse initial year and month
  const parseYearMonth = (dateStr) => {
    if (dateStr && typeof dateStr === "string" && dateStr.includes("-")) {
      const parts = dateStr.split("-").map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { year: parts[0], month: parts[1] - 1 };
      }
    }
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  };

  const [viewYear, setViewYear] = useState(() => parseYearMonth(selectedDate).year);
  const [viewMonth, setViewMonth] = useState(() => parseYearMonth(selectedDate).month);

  useEffect(() => {
    if (visible) {
      const { year, month } = parseYearMonth(selectedDate);
      setViewYear(year);
      setViewMonth(month);
    }
  }, [visible, selectedDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day) => {
    const monthStr = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const newDateStr = `${viewYear}-${monthStr}-${dayStr}`;
    onSelectDate(newDateStr);
    onClose();
  };

  const handleSelectToday = () => {
    onSelectDate(todayStr);
    onClose();
  };

  // Calendar calculations
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(viewMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const cellDateStr = `${viewYear}-${monthStr}-${dayStr}`;
    const isSelected = cellDateStr === selectedDate;
    const isToday = cellDateStr === todayStr;

    cells.push(
      <TouchableOpacity
        key={`day-${day}`}
        style={[
          styles.dayCell,
          isSelected && styles.selectedDayCell,
          isToday && !isSelected && styles.todayDayCell,
        ]}
        onPress={() => handleSelectDay(day)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayCellText,
            isSelected && styles.selectedDayCellText,
            isToday && !isSelected && styles.todayDayCellText,
          ]}
        >
          {day}
        </Text>
        {isToday && !isSelected && <View style={styles.todayDot} />}
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalCard}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation?.()}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={handlePrevMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.headerTitleBox}>
              <Ionicons name="calendar-outline" size={16} color="#1268D9" style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={handleNextMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Days of Week */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((dw, idx) => (
              <View key={dw} style={styles.weekHeaderCell}>
                <Text
                  style={[
                    styles.weekHeaderText,
                    (idx === 0 || idx === 6) && styles.weekendText,
                  ]}
                >
                  {dw}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>{cells}</View>

          {/* Footer Controls */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={handleSelectToday}
              activeOpacity={0.7}
            >
              <Ionicons name="today-outline" size={14} color="#1268D9" style={{ marginRight: 5 }} />
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: Math.min(width - 32, 360),
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  headerTitleBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 6,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: "center",
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  weekendText: {
    color: "#EF4444",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
    borderRadius: 19,
    position: "relative",
  },
  selectedDayCell: {
    backgroundColor: "#1268D9",
  },
  todayDayCell: {
    borderWidth: 1.5,
    borderColor: "#1268D9",
    backgroundColor: "#EFF6FF",
  },
  dayCellText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  selectedDayCellText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  todayDayCellText: {
    color: "#1268D9",
    fontWeight: "700",
  },
  todayDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1268D9",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1268D9",
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
});

export default AttendanceDatePickerModal;
