import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const AppDatePicker = ({ label, value, onChangeText, placeholder = "DD/MM/YYYY", error, compact = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Set the current view of calendar based on initial value
  useEffect(() => {
    if (value && value.includes("/")) {
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

  // Months lists
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Weekdays lists
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Helper: Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper: Get first day of month (0 = Sunday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Handle previous month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Handle next month
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate days array
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const daysArray = [];

  // Add leading empty days
  for (let i = 0; i < firstDay; i++) {
    daysArray.push({ type: "empty", value: "" });
  }

  // Add month days
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push({ type: "day", value: i });
  }

  // Select day handler
  const handleDaySelect = (day) => {
    const dStr = String(day).padStart(2, "0");
    const mStr = String(currentMonth + 1).padStart(2, "0");
    onChangeText(`${dStr}/${mStr}/${currentYear}`);
    setModalVisible(false);
  };

  // Year Picker Years Generation (e.g., from 1950 to 2035)
  const startYear = 1950;
  const yearsList = [];
  for (let y = new Date().getFullYear() + 10; y >= startYear; y--) {
    yearsList.push(y);
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, compact && styles.inputCompact]}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
        />
        <TouchableOpacity 
          style={styles.calendarIcon} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Calendar Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            
            {/* Calendar Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={20} color="#4b5563" />
              </TouchableOpacity>
              
              <View style={styles.headerTitleContainer}>
                <TouchableOpacity 
                  onPress={() => setShowYearPicker(!showYearPicker)}
                  style={styles.headerTitleBtn}
                >
                  <Text style={styles.headerTitle}>
                    {months[currentMonth]} {currentYear}
                  </Text>
                  <Ionicons 
                    name={showYearPicker ? "chevron-up" : "chevron-down"} 
                    size={14} 
                    color="#4b5563" 
                    style={{ marginLeft: 4 }} 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {showYearPicker ? (
              /* Year List Selection */
              <View style={styles.yearPickerListContainer}>
                <FlatList
                  data={yearsList}
                  keyExtractor={(item) => String(item)}
                  initialScrollIndex={yearsList.indexOf(currentYear) !== -1 ? Math.max(0, yearsList.indexOf(currentYear) - 4) : 0}
                  getItemLayout={(data, index) => ({ length: 44, offset: 44 * index, index })}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.yearItem,
                        item === currentYear ? styles.yearItemActive : null,
                      ]}
                      onPress={() => {
                        setCurrentYear(item);
                        setShowYearPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.yearItemText,
                        item === currentYear ? styles.yearItemTextActive : null
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : (
              /* Grid Calendar days */
              <View style={styles.calendarGrid}>
                {/* Weekdays Row */}
                <View style={styles.weekdaysRow}>
                  {weekdays.map((w, idx) => (
                    <Text key={idx} style={styles.weekdayText}>{w}</Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {daysArray.map((d, index) => {
                    const isSelected = value === `${String(d.value).padStart(2, "0")}/${String(currentMonth + 1).padStart(2, "0")}/${currentYear}`;
                    return d.type === "empty" ? (
                      <View key={index} style={styles.dayCellEmpty} />
                    ) : (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dayCell,
                          isSelected ? styles.dayCellSelected : null
                        ]}
                        onPress={() => handleDaySelect(d.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.dayText,
                          isSelected ? styles.dayTextSelected : null
                        ]}>
                          {d.value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => {
                  setModalVisible(false);
                  setShowYearPicker(false);
                }}
              >
                <Text style={styles.closeBtnText}>Close</Text>
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputCompact: {
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  calendarIcon: {
    padding: 6,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 340,
    padding: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  calendarGrid: {
    marginTop: 8,
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 6,
  },
  weekdayText: {
    width: 38,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 19,
    marginVertical: 2,
    marginHorizontal: 2,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 2,
    marginHorizontal: 2,
  },
  dayCellSelected: {
    backgroundColor: "#C2410C",
  },
  dayText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  dayTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  yearPickerListContainer: {
    height: 250,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
  },
  yearItem: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  yearItemActive: {
    backgroundColor: "rgba(15, 118, 110, 0.1)",
  },
  yearItemText: {
    fontSize: 15,
    color: "#374151",
  },
  yearItemTextActive: {
    color: "#C2410C",
    fontWeight: "700",
  },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeBtnText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "600",
  },
});

export default AppDatePicker;
