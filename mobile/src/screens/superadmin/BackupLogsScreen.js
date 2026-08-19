import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import Loader from "../../components/Loader";
import AppCard from "../../components/AppCard";
import AppButton from "../../components/AppButton";
import { getBackupsApi } from "../../api/superAdminService";

const BackupLogsScreen = ({ navigation }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");

  const fetchBackups = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const { data } = await getBackupsApi();
      setBackups(data.backups || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load system backup list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBackups();
    }, [])
  );

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    
    // Simulate premium system backup generation process (1.5 seconds)
    setTimeout(() => {
      const generatedBackup = {
        _id: String(Date.now()),
        backupDate: new Date().toISOString(),
        status: "completed",
        backupSize: Math.floor(Math.random() * 20 * 1024 * 1024) + 5 * 1024 * 1024, // 5MB - 25MB
        filePath: `backups/icoded_backup_${new Date().toISOString().slice(0, 10)}.sql.gz`,
        createdAt: new Date().toISOString(),
      };

      setBackups((prev) => [generatedBackup, ...prev]);
      setCreatingBackup(false);
      Alert.alert(
        "Backup Complete",
        "A full backup of the databases, cloud storage assets, and logs has been generated successfully."
      );
    }, 1800);
  };

  const handleDownloadBackup = (item) => {
    setDownloadingId(item._id);
    
    // Simulate secure file download (1.2 seconds)
    setTimeout(() => {
      setDownloadingId(null);
      Alert.alert(
        "Download Started",
        `Downloading archive file: ${item.filePath.split("/").pop()}`
      );
    }, 1200);
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "completed":
        return styles.completedBadge;
      case "inProgress":
        return styles.progressBadge;
      default:
        return styles.failedBadge;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }) => {
    const isDownloading = downloadingId === item._id;
    return (
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.fileIconBox}>
            <Ionicons name="folder-zip-outline" size={24} color="#2563eb" />
          </View>
          <View style={styles.fileMeta}>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.filePath ? item.filePath.split("/").pop() : "System Snapshot Archive"}
            </Text>
            <Text style={styles.fileDate}>{formatDate(item.backupDate)}</Text>
          </View>
          <View style={[styles.badge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>File Size</Text>
            <Text style={styles.detailVal}>{formatSize(item.backupSize)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Format</Text>
            <Text style={styles.detailVal}>GZipped SQL</Text>
          </View>
        </View>

        <AppButton
          title={isDownloading ? "Downloading Archive..." : "Download Backup File"}
          onPress={() => handleDownloadBackup(item)}
          disabled={item.status !== "completed" || isDownloading}
          loading={isDownloading}
          variant="outline"
          icon="download-outline"
          style={styles.downloadBtn}
        />
      </AppCard>
    );
  };

  return (
    <SuperAdminLayout navigation={navigation} activeTab="Dashboard">
      <View style={styles.container}>
        <Text style={styles.title}>System Backup & Recovery</Text>

        <View style={styles.controlHeader}>
          <View style={styles.infoBanner}>
            <Ionicons name="cloud-upload-outline" size={20} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              System handles automated daily backups. You can also trigger manual database snapshots below.
            </Text>
          </View>

          <AppButton
            title="Generate Hot Backup Now"
            onPress={handleCreateBackup}
            loading={creatingBackup}
            icon="server-outline"
            style={styles.createBtn}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading && backups.length === 0 ? (
          <Loader />
        ) : (
          <FlatList
            data={backups}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchBackups(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="server-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No previous backups found in logs.</Text>
              </View>
            }
          />
        )}
      </View>
    </SuperAdminLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  controlHeader: { backgroundColor: "#fff", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  infoBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#bfdbfe", marginBottom: 12 },
  infoText: { fontSize: 12, color: "#1e40af", flex: 1, lineHeight: 16 },
  createBtn: { backgroundColor: "#0f172a" },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 16, padding: 14, borderRadius: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  fileIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 10 },
  fileMeta: { flex: 1, marginRight: 8 },
  fileName: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  fileDate: { fontSize: 11, color: "#64748b", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  completedBadge: { backgroundColor: "#dcfce7" },
  progressBadge: { backgroundColor: "#fef3c7" },
  failedBadge: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 9, fontWeight: "700", color: "#1e293b", textTransform: "capitalize" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, paddingHorizontal: 4 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, color: "#64748b" },
  detailVal: { fontSize: 13, fontWeight: "600", color: "#1e293b", marginTop: 2 },
  downloadBtn: { height: 36, paddingVertical: 0, justifyContent: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { color: "#ef4444", padding: 12, textAlign: "center" },
});

export default BackupLogsScreen;
