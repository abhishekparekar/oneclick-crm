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

const AppTimePicker = ({ label, value, onChangeText, placeholder = "HH:MM", error }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState("17");
  const [selectedMinute, setSelectedMinute] = useState("00");

  useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setSelectedHour(h || "17");
      setSelectedMinute(m || "00");
    }
  }, [value, modalVisible]);

  const handleDone = () => {
    onChangeText(`${selectedHour}:${selectedMinute}`);
    setModalVisible(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={[styles.inputWrapper, error && styles.inputError]} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.inputText, !value && { color: "#9ca3af" }]}>
          {value || placeholder}
        </Text>
        <View style={styles.clockIcon}>
          <Ionicons name="time-outline" size={20} color="#6b7280" />
        </View>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Select Time</Text>
              <TouchableOpacity onPress={handleDone}>
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
  container: {},
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
    justifyContent: 'space-between'
  },
  inputText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  cancelBtn: {
    fontSize: 16,
    color: "#64748b",
  },
  doneBtn: {
    fontSize: 16,
    color: "#C2410C",
    fontWeight: "700",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  pickerWrapper: {
    width: 100,
  },
  colon: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginHorizontal: 8,
  }
});

export default AppTimePicker;
