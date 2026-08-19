import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import EmployeeLayout from "../../components/EmployeeLayout";
import { FONTS } from "../../theme/tokens";
import { getMyProfileApi } from "../../api/employeeService";
import Loader from "../../components/Loader";

const EmployeeDocumentsScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data } = await getMyProfileApi();
      if (data && data.success) {
        setProfile(data.employee);
      }
    } catch (err) {
      console.warn("[EmployeeDocuments] Could not fetch live profile details:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const handleOpenDoc = async (url) => {
    if (url) {
      try {
        await WebBrowser.openBrowserAsync(url);
      } catch (err) {
        Alert.alert("Error", "Could not open document.");
      }
    }
  };

  if (loading && !profile) {
    return (
      <EmployeeLayout navigation={navigation} title="My Documents">
        <Loader />
      </EmployeeLayout>
    );
  }

  const renderDocCard = (title, url, iconName = "document-text") => (
    <TouchableOpacity
      style={styles.docCard}
      activeOpacity={url ? 0.7 : 1}
      onPress={() => handleOpenDoc(url)}
    >
      <View style={styles.docLeft}>
        <View style={styles.iconBox}>
          <Ionicons name={iconName} size={24} color={url ? "#C2410C" : "#94a3b8"} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docTitle}>{title}</Text>
          {url ? (
            <Text style={[styles.docStatus, { color: "#16a34a" }]}>Available</Text>
          ) : (
            <Text style={styles.docStatus}>Pending / Not Uploaded</Text>
          )}
        </View>
      </View>
      {url && (
        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View</Text>
          <Ionicons name="open-outline" size={14} color="#C2410C" />
        </View>
      )}
    </TouchableOpacity>
  );

  const docs = profile?.documents || {};

  return (
    <EmployeeLayout navigation={navigation} title="My Documents">
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProfile(true)}
              colors={["#C2410C"]}
            />
          }
        >
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>My Documents</Text>
            <Text style={styles.headerDesc}>Official documents and files attached to your profile.</Text>
          </View>
          
          <Text style={styles.sectionTitle}>Identity & Core Documents</Text>
          {renderDocCard("Offer Letter", docs.offerLetter, "ribbon")}
          {renderDocCard("Joining Letter", docs.joiningLetter, "mail-open")}
          {renderDocCard("Aadhaar Card (Front)", docs.aadhaarFront, "card")}
          {renderDocCard("Aadhaar Card (Back)", docs.aadhaarBack, "card")}
          {renderDocCard("PAN Card", docs.panCard, "card")}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Additional Documents</Text>
          {renderDocCard("Previous Salary Slip", docs.salarySlipPrevious, "cash")}
          {renderDocCard("Resume", docs.resume, "document-attach")}
          {docs.customDocuments?.map((doc, index) => (
            <React.Fragment key={index}>
              {renderDocCard(doc.title || "Custom Document", doc.url, "document-text")}
            </React.Fragment>
          ))}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </EmployeeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBox: {
    marginTop: 10,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: "#0f172a",
  },
  headerDesc: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    color: "#64748b",
    marginTop: 2,
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  docLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: "#1e293b",
    marginBottom: 4,
  },
  docStatus: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyMedium,
    color: "#94a3b8",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  viewBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: "#C2410C",
    marginRight: 4,
  },
});

export default EmployeeDocumentsScreen;
