import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
  Clipboard,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CompanyAdminLayout from "../../components/CompanyAdminLayout";
import leadsService from "../../api/leadsService";
import { FONTS } from "../../theme/tokens";

const C = {
  primary: "#F97316",
  primaryHover: "#EA580C",
  primaryLight: "#FFF7ED",
  primaryBorder: "#FFEDD5",
  darkNavy: "#0F172A",
  slateHeader: "#1E293B",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  text: "#0F172A",
  sub: "#475569",
  muted: "#94A3B8",
  green: "#10B981", greenBg: "#ECFDF5", greenBorder: "#A7F3D0",
  blue: "#3B82F6", blueBg: "#EFF6FF",
  indigo: "#6366F1", indigoBg: "#EEF2FF",
  purple: "#8B5CF6", purpleBg: "#F5F3FF",
  red: "#EF4444", redBg: "#FEF2F2",
};

const COLOR_PRESETS = [
  "#3B82F6", "#10B981", "#EAB308", "#F97316", "#8B5CF6", "#EC4899", "#06B6D4", "#64748B", "#EF4444"
];

const TABS = [
  { id: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" },
  { id: "profile", label: "Profile", icon: "business-outline" },
  { id: "statuses", label: "Stages", icon: "git-branch-outline" },
  { id: "sources", label: "Sources", icon: "funnel-outline" },
  { id: "tags", label: "Tags & Form", icon: "pricetags-outline" },
];

export default function LeadSettingsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWa, setTestingWa] = useState(false);

  // WhatsApp State
  const [apiProvider, setApiProvider] = useState("OFFICIAL_META");
  const [waStatus, setWaStatus] = useState("CONNECTED");
  const [whatsapp, setWhatsapp] = useState({
    displayPhoneNumber: "+91 98220 12345",
    phoneNumberId: "109823489234",
    businessAccountId: "108923489234",
    accessToken: "••••••••••••••••••••",
    thirdPartyEndpoint: "https://app.click2api.in",
    thirdPartyInstanceId: "INST-90234",
    thirdPartyToken: "••••••••••••",
  });

  // Business Profile State
  const [profile, setProfile] = useState({
    name: "One Click Business Solutions",
    ownerName: "Admin",
    businessCategory: "Services & SaaS",
    phone: "+91 98220 12345",
    email: "contact@oneclick.in",
    website: "https://oneclick.in",
    address: "IT Park, Sector 5",
    city: "Pune",
    state: "Maharashtra",
    timezone: "Asia/Kolkata",
  });

  // Pipeline Data States
  const [statuses, setStatuses] = useState([]);
  const [sources, setSources] = useState([]);
  const [tags, setTags] = useState([]);
  const [publicToken, setPublicToken] = useState("oneclick-demo-portal-2026");

  // Modals
  const [modalType, setModalType] = useState(null);
  const [statusForm, setStatusForm] = useState({ name: "", color: "#3B82F6", isDefault: false });
  const [sourceName, setSourceName] = useState("");
  const [tagName, setTagName] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [waRes, profRes, stRes, soRes, tgRes, tokRes] = await Promise.all([
        leadsService.getWhatsAppAccount().catch(() => ({})),
        leadsService.getBusinessProfile().catch(() => ({})),
        leadsService.getStatuses(),
        leadsService.getSources(),
        leadsService.getTags(),
        leadsService.getPublicToken().catch(() => ({})),
      ]);

      if (waRes) {
        setWhatsapp((p) => ({ ...p, ...waRes }));
        if (waRes.apiProvider) setApiProvider(waRes.apiProvider);
        if (waRes.connectionStatus) setWaStatus(waRes.connectionStatus);
      }
      if (profRes) setProfile((p) => ({ ...p, ...profRes }));
      setStatuses(Array.isArray(stRes) ? stRes : []);
      setSources(Array.isArray(soRes) ? soRes : []);
      setTags(Array.isArray(tgRes) ? tgRes : []);
      if (tokRes?.publicToken) setPublicToken(tokRes.publicToken);
    } catch (err) {
      console.warn("[LeadSettings] Fetch note:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── WhatsApp Actions ──
  const handleSaveWhatsApp = async () => {
    try {
      setSaving(true);
      await leadsService.updateWhatsAppAccount({
        ...whatsapp,
        apiProvider,
        connectionStatus: waStatus,
      });
      Alert.alert("Success", "WhatsApp configuration saved!");
    } catch (err) {
      Alert.alert("Error", "Failed to save WhatsApp settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    try {
      setTestingWa(true);
      const res = await leadsService.testWhatsAppConnection(whatsapp);
      setWaStatus("CONNECTED");
      Alert.alert("Connected", res?.message || "WhatsApp connection verified successfully!");
    } catch (err) {
      setWaStatus("CONNECTION_FAILED");
      Alert.alert("Failed", "Unable to connect to WhatsApp API. Check credentials.");
    } finally {
      setTestingWa(false);
    }
  };

  // ── Profile Actions ──
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await leadsService.updateBusinessProfile(profile);
      Alert.alert("Success", "Business profile saved!");
    } catch (err) {
      Alert.alert("Error", "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ── Status Actions ──
  const handleAddStatus = async () => {
    if (!statusForm.name.trim()) return Alert.alert("Required", "Status name is required");
    try {
      setSaving(true);
      await leadsService.createStatus(statusForm);
      setModalType(null);
      setStatusForm({ name: "", color: "#3B82F6", isDefault: false });
      fetchData();
      Alert.alert("Success", "Stage added!");
    } catch (err) {
      Alert.alert("Error", "Failed to add stage");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStatus = (id, name) => {
    Alert.alert("Delete Stage", `Delete "${name}" stage?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await leadsService.deleteStatus(id);
            fetchData();
          } catch (err) {
            Alert.alert("Error", "Could not delete stage");
          }
        },
      },
    ]);
  };

  // ── Source Actions ──
  const handleAddSource = async () => {
    if (!sourceName.trim()) return Alert.alert("Required", "Source name is required");
    try {
      setSaving(true);
      await leadsService.createSource({ name: sourceName.trim() });
      setModalType(null);
      setSourceName("");
      fetchData();
      Alert.alert("Success", "Source added!");
    } catch (err) {
      Alert.alert("Error", "Failed to add source");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSource = (id, name) => {
    Alert.alert("Delete Source", `Delete "${name}" source?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await leadsService.deleteSource(id);
            fetchData();
          } catch (err) {
            Alert.alert("Error", "Could not delete source");
          }
        },
      },
    ]);
  };

  // ── Tag Actions ──
  const handleAddTag = async () => {
    if (!tagName.trim()) return Alert.alert("Required", "Tag name is required");
    try {
      setSaving(true);
      await leadsService.createTag({ name: tagName.trim() });
      setModalType(null);
      setTagName("");
      fetchData();
      Alert.alert("Success", "Tag added!");
    } catch (err) {
      Alert.alert("Error", "Failed to create tag");
    } finally {
      setSaving(false);
    }
  };

  const copyPublicLink = () => {
    const url = `https://app.oneclick.in/lead-capture/${publicToken}`;
    Clipboard.setString(url);
    Alert.alert("Copied", "Public lead capture URL copied to clipboard!");
  };

  const sharePublicLink = async () => {
    const url = `https://app.oneclick.in/lead-capture/${publicToken}`;
    try {
      await Share.share({
        message: `Submit your inquiry here: ${url}`,
        url: url,
        title: "Lead Capture Form",
      });
    } catch (_) {}
  };

  return (
    <CompanyAdminLayout
      navigation={navigation}
      title="Lead Engine & WhatsApp"
      subtitle="CRM pipeline & WhatsApp API integration"
      activeTab="Lead Settings"
    >
      <View style={styles.container}>
        {/* Compact Segmented Pills Strip */}
        <View style={styles.tabStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {TABS.map((t) => {
              const isSel = activeTab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabBtn, isSel && styles.tabBtnActive]}
                  onPress={() => setActiveTab(t.id)}
                >
                  <Ionicons
                    name={t.icon}
                    size={13}
                    color={isSel ? "#FFF" : C.sub}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.tabBtnText, isSel && styles.tabBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* ══════════ 1. WHATSAPP API TAB ══════════ */}
            {activeTab === "whatsapp" && (
              <View style={styles.compactCard}>
                {/* Micro Status Bar */}
                <View style={styles.statusBar}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <View style={styles.waIconMini}>
                      <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
                    </View>
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.statusBarTitle}>Cloud API & Instance</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}>
                        <View
                          style={[
                            styles.microDot,
                            { backgroundColor: waStatus === "CONNECTED" ? C.green : C.red },
                          ]}
                        />
                        <Text style={[styles.microText, { color: waStatus === "CONNECTED" ? C.green : C.red }]}>
                          {waStatus === "CONNECTED" ? "Connected" : "Disconnected"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.testBtnMini}
                    onPress={handleTestWhatsApp}
                    disabled={testingWa}
                  >
                    {testingWa ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <>
                        <Ionicons name="flash" size={11} color="#10B981" style={{ marginRight: 3 }} />
                        <Text style={styles.testBtnMiniText}>Test API</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Compact Provider Switcher */}
                <View style={styles.providerRow}>
                  <TouchableOpacity
                    style={[styles.providerTab, apiProvider === "OFFICIAL_META" && styles.providerTabActive]}
                    onPress={() => setApiProvider("OFFICIAL_META")}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={13}
                      color={apiProvider === "OFFICIAL_META" ? C.primary : C.muted}
                    />
                    <Text style={[styles.providerTabText, apiProvider === "OFFICIAL_META" && styles.providerTabTextActive]}>
                      Meta Cloud API
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.providerTab, apiProvider === "THIRD_PARTY_CLICK2API" && styles.providerTabActive]}
                    onPress={() => setApiProvider("THIRD_PARTY_CLICK2API")}
                  >
                    <Ionicons
                      name="server"
                      size={13}
                      color={apiProvider === "THIRD_PARTY_CLICK2API" ? C.primary : C.muted}
                    />
                    <Text
                      style={[
                        styles.providerTabText,
                        apiProvider === "THIRD_PARTY_CLICK2API" && styles.providerTabTextActive,
                      ]}
                    >
                      Click2API Instance
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Inputs */}
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Display Number</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="+91 98220..."
                    value={whatsapp.displayPhoneNumber}
                    onChangeText={(v) => setWhatsapp((p) => ({ ...p, displayPhoneNumber: v }))}
                  />
                </View>

                {apiProvider === "OFFICIAL_META" ? (
                  <>
                    <View style={styles.row2}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Phone Number ID</Text>
                        <TextInput
                          style={styles.inputMini}
                          placeholder="Phone ID"
                          value={whatsapp.phoneNumberId}
                          onChangeText={(v) => setWhatsapp((p) => ({ ...p, phoneNumberId: v }))}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>WABA ID</Text>
                        <TextInput
                          style={styles.inputMini}
                          placeholder="WABA ID"
                          value={whatsapp.businessAccountId}
                          onChangeText={(v) => setWhatsapp((p) => ({ ...p, businessAccountId: v }))}
                        />
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.fieldLabel}>Permanent Access Token</Text>
                      <TextInput
                        style={styles.inputMini}
                        placeholder="EAA..."
                        secureTextEntry
                        value={whatsapp.accessToken}
                        onChangeText={(v) => setWhatsapp((p) => ({ ...p, accessToken: v }))}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.fieldLabel}>Instance Endpoint</Text>
                      <TextInput
                        style={styles.inputMini}
                        placeholder="https://app.click2api.in"
                        value={whatsapp.thirdPartyEndpoint}
                        onChangeText={(v) => setWhatsapp((p) => ({ ...p, thirdPartyEndpoint: v }))}
                      />
                    </View>

                    <View style={styles.row2}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Instance ID</Text>
                        <TextInput
                          style={styles.inputMini}
                          placeholder="INST-12345"
                          value={whatsapp.thirdPartyInstanceId}
                          onChangeText={(v) => setWhatsapp((p) => ({ ...p, thirdPartyInstanceId: v }))}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Instance Secret</Text>
                        <TextInput
                          style={styles.inputMini}
                          placeholder="Secret token"
                          secureTextEntry
                          value={whatsapp.thirdPartyToken}
                          onChangeText={(v) => setWhatsapp((p) => ({ ...p, thirdPartyToken: v }))}
                        />
                      </View>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={styles.saveBtnCompact}
                  onPress={handleSaveWhatsApp}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="save" size={13} color="#FFF" style={{ marginRight: 5 }} />
                      <Text style={styles.saveBtnCompactText}>Save Configuration</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ══════════ 2. CRM PROFILE TAB ══════════ */}
            {activeTab === "profile" && (
              <View style={styles.compactCard}>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Business / Company Name *</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="Company Name"
                    value={profile.name}
                    onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
                  />
                </View>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Owner / Director</Text>
                    <TextInput
                      style={styles.inputMini}
                      placeholder="Owner Name"
                      value={profile.ownerName}
                      onChangeText={(v) => setProfile((p) => ({ ...p, ownerName: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Category / Industry</Text>
                    <TextInput
                      style={styles.inputMini}
                      placeholder="e.g. Services"
                      value={profile.businessCategory}
                      onChangeText={(v) => setProfile((p) => ({ ...p, businessCategory: v }))}
                    />
                  </View>
                </View>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Phone</Text>
                    <TextInput
                      style={styles.inputMini}
                      placeholder="+91..."
                      value={profile.phone}
                      onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      style={styles.inputMini}
                      placeholder="info@..."
                      value={profile.email}
                      onChangeText={(v) => setProfile((p) => ({ ...p, email: v }))}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Website</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="https://..."
                    value={profile.website}
                    onChangeText={(v) => setProfile((p) => ({ ...p, website: v }))}
                  />
                </View>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Office Address</Text>
                    <TextInput
                      style={styles.inputMini}
                      placeholder="Address"
                      value={profile.address}
                      onChangeText={(v) => setProfile((p) => ({ ...p, address: v }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>City / State</Text>
                    <TextInput
                      style={styles.inputMini}
                      placeholder="Pune, MH"
                      value={profile.city}
                      onChangeText={(v) => setProfile((p) => ({ ...p, city: v }))}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveBtnCompact}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="save" size={13} color="#FFF" style={{ marginRight: 5 }} />
                      <Text style={styles.saveBtnCompactText}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ══════════ 3. PIPELINE STAGES TAB ══════════ */}
            {activeTab === "statuses" && (
              <View style={styles.compactCard}>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>Pipeline Stages ({statuses.length})</Text>
                  <TouchableOpacity
                    style={styles.addBtnMini}
                    onPress={() => {
                      setStatusForm({ name: "", color: "#3B82F6", isDefault: false });
                      setModalType("status");
                    }}
                  >
                    <Ionicons name="add" size={13} color="#FFF" />
                    <Text style={styles.addBtnMiniText}>New Stage</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 6 }}>
                  {statuses.map((st) => (
                    <View key={st.id || st._id} style={styles.stageRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={[styles.colorChip, { backgroundColor: st.color || C.primary }]} />
                        <Text style={styles.stageTitle}>{st.name}</Text>
                        {st.isDefault && <Text style={styles.microDefaultBadge}>Default</Text>}
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteStatus(st.id || st._id, st.name)}
                        style={styles.trashBtnMini}
                      >
                        <Ionicons name="trash-outline" size={14} color={C.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ══════════ 4. LEAD SOURCES TAB ══════════ */}
            {activeTab === "sources" && (
              <View style={styles.compactCard}>
                <View style={styles.cardHeaderStrip}>
                  <Text style={styles.cardHeaderTitle}>Lead Sources ({sources.length})</Text>
                  <TouchableOpacity
                    style={styles.addBtnMini}
                    onPress={() => {
                      setSourceName("");
                      setModalType("source");
                    }}
                  >
                    <Ionicons name="add" size={13} color="#FFF" />
                    <Text style={styles.addBtnMiniText}>New Source</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 6 }}>
                  {sources.map((src) => (
                    <View key={src.id || src._id} style={styles.stageRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <Ionicons name="funnel-outline" size={13} color={C.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.stageTitle}>{src.name}</Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteSource(src.id || src._id, src.name)}
                        style={styles.trashBtnMini}
                      >
                        <Ionicons name="trash-outline" size={14} color={C.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ══════════ 5. TAGS & WEB FORM TAB ══════════ */}
            {activeTab === "tags" && (
              <View style={styles.compactCard}>
                {/* Public Form Micro Box */}
                <View style={styles.formBoxMini}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.formBoxTitle}>🌐 Public Lead Capture Form</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <TouchableOpacity style={styles.copyBtnMini} onPress={copyPublicLink}>
                        <Ionicons name="copy" size={11} color="#FFF" style={{ marginRight: 3 }} />
                        <Text style={styles.copyBtnMiniText}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.shareBtnMini} onPress={sharePublicLink}>
                        <Ionicons name="share-social" size={11} color={C.primary} style={{ marginRight: 3 }} />
                        <Text style={styles.shareBtnMiniText}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.formUrlMini} numberOfLines={1}>
                    https://app.oneclick.in/lead-capture/{publicToken}
                  </Text>
                </View>

                {/* Priority Tags Header */}
                <View style={[styles.cardHeaderStrip, { marginTop: 12 }]}>
                  <Text style={styles.cardHeaderTitle}>Priority Tags ({tags.length})</Text>
                  <TouchableOpacity
                    style={styles.addBtnMini}
                    onPress={() => {
                      setTagName("");
                      setModalType("tag");
                    }}
                  >
                    <Ionicons name="add" size={13} color="#FFF" />
                    <Text style={styles.addBtnMiniText}>New Tag</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tagGrid}>
                  {tags.map((tg) => (
                    <View key={tg.id || tg._id} style={styles.tagMiniChip}>
                      <Ionicons name="pricetag" size={10} color="#4F46E5" style={{ marginRight: 4 }} />
                      <Text style={styles.tagMiniText}>{tg.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── MODAL ── */}
        <Modal visible={modalType !== null} animationType="fade" transparent>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalType === "status" ? "New Stage" : modalType === "source" ? "New Source" : "New Tag"}
                </Text>
                <TouchableOpacity onPress={() => setModalType(null)}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {modalType === "status" && (
                <View>
                  <Text style={styles.fieldLabel}>Stage Name *</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="e.g. Negotiation"
                    value={statusForm.name}
                    onChangeText={(v) => setStatusForm((p) => ({ ...p, name: v }))}
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Color Code</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 6 }}>
                    {COLOR_PRESETS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.presetDotMini,
                          { backgroundColor: color },
                          statusForm.color === color && styles.presetDotMiniActive,
                        ]}
                        onPress={() => setStatusForm((p) => ({ ...p, color }))}
                      />
                    ))}
                  </View>

                  <TouchableOpacity style={styles.saveBtnCompact} onPress={handleAddStatus} disabled={saving}>
                    <Text style={styles.saveBtnCompactText}>{saving ? "Saving..." : "Create Stage"}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {modalType === "source" && (
                <View>
                  <Text style={styles.fieldLabel}>Channel / Source Name *</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="e.g. LinkedIn"
                    value={sourceName}
                    onChangeText={setSourceName}
                  />

                  <TouchableOpacity style={styles.saveBtnCompact} onPress={handleAddSource} disabled={saving}>
                    <Text style={styles.saveBtnCompactText}>{saving ? "Saving..." : "Create Source"}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {modalType === "tag" && (
                <View>
                  <Text style={styles.fieldLabel}>Tag Name *</Text>
                  <TextInput
                    style={styles.inputMini}
                    placeholder="e.g. VIP Client"
                    value={tagName}
                    onChangeText={setTagName}
                  />

                  <TouchableOpacity style={styles.saveBtnCompact} onPress={handleAddTag} disabled={saving}>
                    <Text style={styles.saveBtnCompactText}>{saving ? "Saving..." : "Create Tag"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </CompanyAdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  tabStrip: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 6,
  },
  tabScroll: {
    paddingHorizontal: 10,
    gap: 4,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: C.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: C.sub,
  },
  tabBtnTextActive: {
    color: "#FFF",
    fontFamily: FONTS.bodyBold,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 11,
    fontFamily: FONTS.bodyMedium,
    color: C.muted,
    marginTop: 6,
  },
  content: {
    padding: 10,
    paddingBottom: 30,
  },
  compactCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: C.greenBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  waIconMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBarTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  microDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  microText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
  },
  testBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: C.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testBtnMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#10B981",
  },
  providerRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
    marginBottom: 10,
    gap: 2,
  },
  providerTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  providerTabActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  providerTabText: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    color: C.muted,
  },
  providerTabTextActive: {
    color: C.primary,
    fontFamily: FONTS.bodyBold,
  },
  formGroup: {
    marginBottom: 8,
  },
  row2: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: C.sub,
    textTransform: "uppercase",
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  inputMini: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11.5,
    fontFamily: FONTS.body,
    color: C.text,
  },
  saveBtnCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  saveBtnCompactText: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: "#FFF",
  },
  cardHeaderStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  addBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  addBtnMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#FFF",
    marginLeft: 2,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: C.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  colorChip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  stageTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    color: C.text,
  },
  microDefaultBadge: {
    fontSize: 8.5,
    fontFamily: FONTS.bodyBold,
    color: C.primary,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 5,
  },
  trashBtnMini: {
    padding: 3,
  },
  formBoxMini: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    padding: 8,
  },
  formBoxTitle: {
    fontSize: 11.5,
    fontFamily: FONTS.displayBold,
    color: "#3730A3",
  },
  formUrlMini: {
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    color: "#312E81",
    backgroundColor: "#FFF",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  copyBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  copyBtnMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#FFF",
  },
  shareBtnMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: C.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  shareBtnMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: C.primary,
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  tagMiniChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  tagMiniText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: "#4338CA",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: C.text,
  },
  presetDotMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  presetDotMiniActive: {
    borderWidth: 2.5,
    borderColor: C.darkNavy,
  },
});
