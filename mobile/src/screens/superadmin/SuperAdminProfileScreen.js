import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import AppCard from "../../components/AppCard";
import { getMeApi } from "../../api/authService";

const SuperAdminProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({
    name: "Super Admin",
    email: "admin@icoded.com",
    phone: "+91 99999 88888",
    role: "SuperAdmin",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getMeApi();
      if (data.user) {
        setProfile({
          name: data.user.name || "Super Admin",
          email: data.user.email || "admin@icoded.com",
          phone: data.user.phone || "+91 99999 88888",
          role: data.user.role || "SuperAdmin",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const handleUpdateProfile = () => {
    if (!profile.name.trim()) {
      Alert.alert("Validation Error", "Full name is required");
      return;
    }
    if (!profile.email.trim()) {
      Alert.alert("Validation Error", "Email address is required");
      return;
    }

    setUpdating(true);
    // Simulate API profile updates
    setTimeout(() => {
      setUpdating(false);
      Alert.alert("Success", "Profile details updated successfully!");
    }, 1200);
  };

  const handleChangePassword = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      Alert.alert("Validation Error", "Current password is required");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Validation Error", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match");
      return;
    }

    setChangingPassword(true);
    // Simulate secure crypt password updates
    setTimeout(() => {
      setChangingPassword(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      Alert.alert("Success", "Password updated successfully! Session remains active.");
    }, 1500);
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>SuperAdmin Account Info</Text>

        {loading ? (
          <Loader />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            {/* Profile Avatar Card */}
            <View style={styles.avatarCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profile.name ? profile.name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2) : "SA"}
                </Text>
                <TouchableOpacity style={styles.cameraBtn}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileName}>{profile.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{profile.role}</Text>
              </View>
            </View>

            {/* Profile Edit Card */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Personal Details</Text>
              </View>

              <AppInput
                label="Full Name"
                value={profile.name}
                onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
                placeholder="Super Admin"
              />

              <AppInput
                label="Email Address"
                value={profile.email}
                onChangeText={(v) => setProfile((p) => ({ ...p, email: v }))}
                placeholder="admin@icoded.com"
                keyboardType="email-address"
              />

              <AppInput
                label="Phone Number"
                value={profile.phone}
                onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
                placeholder="+91 99999 88888"
                keyboardType="phone-pad"
              />

              <AppButton
                title="Update Profile Info"
                onPress={handleUpdateProfile}
                loading={updating}
                style={styles.saveBtn}
              />
            </AppCard>

            {/* Security Change Password Card */}
            <AppCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="lock-closed-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Change Password</Text>
              </View>

              <AppInput
                label="Current Password"
                placeholder="••••••••"
                secureTextEntry={true}
                value={passwordForm.currentPassword}
                onChangeText={(v) => setPasswordForm((p) => ({ ...p, currentPassword: v }))}
              />

              <AppInput
                label="New Password"
                placeholder="••••••••"
                secureTextEntry={true}
                value={passwordForm.newPassword}
                onChangeText={(v) => setPasswordForm((p) => ({ ...p, newPassword: v }))}
              />

              <AppInput
                label="Confirm New Password"
                placeholder="••••••••"
                secureTextEntry={true}
                value={passwordForm.confirmPassword}
                onChangeText={(v) => setPasswordForm((p) => ({ ...p, confirmPassword: v }))}
              />

              <AppButton
                title="Update Password"
                onPress={handleChangePassword}
                loading={changingPassword}
                variant="outline"
                style={styles.saveBtn}
              />
            </AppCard>
          </ScrollView>
        )}
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  avatarCard: { alignItems: "center", marginVertical: 16 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", position: "relative" },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#2563eb" },
  cameraBtn: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  profileName: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginTop: 12 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: "#eff6ff", marginTop: 6, borderWidth: 1, borderColor: "#bfdbfe" },
  roleText: { fontSize: 11, fontWeight: "600", color: "#2563eb" },
  card: { marginBottom: 16, padding: 16, borderRadius: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  saveBtn: { marginTop: 14 },
  errorText: { color: "#ef4444", padding: 16, textAlign: "center" },
});

export default SuperAdminProfileScreen;
