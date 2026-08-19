import React, { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const StatePickerModal = ({ visible, onClose, onSelect, selectedState }) => {
  const [search, setSearch] = useState("");
  const [filteredStates, setFilteredStates] = useState(INDIAN_STATES);

  useEffect(() => {
    if (visible) {
      setSearch("");
      setFilteredStates(INDIAN_STATES);
    }
  }, [visible]);

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFilteredStates(INDIAN_STATES);
    } else {
      const filtered = INDIAN_STATES.filter(state =>
        state.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStates(filtered);
    }
  };

  const handleSelect = (state) => {
    onSelect(state);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.dropdownCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Indian States..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* States list */}
          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = item.toLowerCase() === selectedState?.toLowerCase();
              return (
                <TouchableOpacity
                  style={[styles.stateItem, isSelected && styles.selectedStateItem]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.stateText, isSelected && styles.selectedStateText]}>
                    {item}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matching states found.</Text>
              </View>
            )}
            style={{ maxHeight: 300 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  dropdownCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#334155",
    padding: 0,
  },
  stateItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
  },
  selectedStateItem: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  stateText: {
    fontSize: 13.5,
    color: "#334155",
    fontWeight: "600",
  },
  selectedStateText: {
    color: "#2563eb",
    fontWeight: "750",
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});

export default StatePickerModal;
