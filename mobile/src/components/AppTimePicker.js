import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

const AppTimePicker = ({ label, value, onChangeText, onChange, placeholder = "HH:MM", error, containerStyle, disabled = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState("17");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const displayTime = React.useMemo(() => {
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

  useEffect(() => {
    if (value) {
      if (typeof value === "string" && value.includes("T")) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          setSelectedHour(String(d.getHours()).padStart(2, "0"));
          setSelectedMinute(String(d.getMinutes()).padStart(2, "0"));
          return;
        }
      }
      if (typeof value === "string" && value.includes(":")) {
        const [h, m] = value.split(":");
        setSelectedHour(h ? h.trim().padStart(2, "0") : "17");
        setSelectedMinute(m ? m.trim().slice(0, 2).padStart(2, "0") : "00");
      }
    }
  }, [value, modalVisible]);

  const handleDone = () => {
    const val = `${selectedHour}:${selectedMinute}`;
    if (typeof onChangeText === "function") onChangeText(val);
    if (typeof onChange === "function") onChange(val);
    setModalVisible(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

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

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerBtn}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Select Time</Text>
              <TouchableOpacity onPress={handleDone} style={styles.headerBtn}>
                <Text style={styles.doneBtn}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedHour}
                  onValueChange={(itemValue) => setSelectedHour(itemValue)}
                >
                  {hours.map((h) => (
                    <Picker.Item key={h} label={h} value={h} />
                  ))}
                </Picker>
              </View>
              <Text style={styles.colon}>:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedMinute}
                  onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                >
                  {minutes.map((m) => (
                    <Picker.Item key={m} label={m} value={m} />
                  ))}
                </Picker>
              </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    paddingBottom: 16,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  headerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cancelBtn: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  doneBtn: {
    fontSize: 14,
    color: "#F97316",
    fontWeight: "700",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  pickerWrapper: {
    width: 110,
  },
  colon: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginHorizontal: 4,
  },
});

export default AppTimePicker;
