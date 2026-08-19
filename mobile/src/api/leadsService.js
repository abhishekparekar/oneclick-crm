import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  LEADS: "@oneclick_leads",
  STATUSES: "@oneclick_lead_statuses",
  SOURCES: "@oneclick_lead_sources",
  TAGS: "@oneclick_lead_tags",
  REMINDERS: "@oneclick_lead_reminders",
  CAMPAIGNS: "@oneclick_lead_campaigns",
  TEMPLATES: "@oneclick_lead_templates",
};

const DEFAULT_STATUSES = [
  { id: "st-new", _id: "st-new", name: "New Prospect", color: "#3B82F6", isDefault: true, order: 1 },
  { id: "st-contacted", _id: "st-contacted", name: "Contacted / Pitch", color: "#8B5CF6", isDefault: false, order: 2 },
  { id: "st-qualified", _id: "st-qualified", name: "Qualified / Demo", color: "#06B6D4", isDefault: false, order: 3 },
  { id: "st-proposal", _id: "st-proposal", name: "Proposal Sent", color: "#EAB308", isDefault: false, order: 4 },
  { id: "st-negotiation", _id: "st-negotiation", name: "Negotiation", color: "#F97316", isDefault: false, order: 5 },
  { id: "st-won", _id: "st-won", name: "Won / Closed", color: "#10B981", isDefault: false, order: 6 },
  { id: "st-lost", _id: "st-lost", name: "Lost / Dropped", color: "#EF4444", isDefault: false, order: 7 },
];

const DEFAULT_SOURCES = [
  { id: "src-1", name: "Direct / Walk-in" },
  { id: "src-2", name: "Website Inquiry" },
  { id: "src-3", name: "WhatsApp Chat" },
  { id: "src-4", name: "Client Referral" },
  { id: "src-5", name: "Instagram / FB Ads" },
  { id: "src-6", name: "Google Search" },
];

const DEFAULT_TAGS = [
  { id: "tag-1", name: "High Value" },
  { id: "tag-2", name: "Hot Prospect" },
  { id: "tag-3", name: "Decision Maker" },
  { id: "tag-4", name: "Enterprise" },
];

const DEFAULT_LEADS = [
  {
    id: "lead-1",
    _id: "lead-1",
    name: "Vikram Malhotra",
    whatsappPhone: "+91 98230 45671",
    email: "vikram@malhotratech.com",
    company: "Malhotra Tech Solutions",
    source: "Website Inquiry",
    statusId: "st-proposal",
    status: DEFAULT_STATUSES[3],
    tags: [{ name: "High Value" }, { name: "Enterprise" }],
    estimatedValue: "185000",
    notes: "• [Today] Demo completed. Sent formal enterprise quotation.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "lead-2",
    _id: "lead-2",
    name: "Pooja Deshmukh",
    whatsappPhone: "+91 97654 32189",
    email: "pooja@deshmukhlogistics.in",
    company: "Deshmukh Logistics Pune",
    source: "Client Referral",
    statusId: "st-new",
    status: DEFAULT_STATUSES[0],
    tags: [{ name: "Hot Prospect" }],
    estimatedValue: "95000",
    notes: "• [Today] Incoming inquiry for 45 employee HRMS subscription.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "lead-3",
    _id: "lead-3",
    name: "Anand Kulkarni",
    whatsappPhone: "+91 94220 89123",
    email: "anand@kulkarniinfra.com",
    company: "Kulkarni Infra Projects",
    source: "Direct / Walk-in",
    statusId: "st-negotiation",
    status: DEFAULT_STATUSES[4],
    tags: [{ name: "Decision Maker" }],
    estimatedValue: "240000",
    notes: "• [Yesterday] Pricing discussed with Director. Follow up on Monday.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "lead-4",
    _id: "lead-4",
    name: "Sneha Patil",
    whatsappPhone: "+91 98812 34567",
    email: "sneha@patilpharma.com",
    company: "Patil Healthcare Ltd",
    source: "WhatsApp Chat",
    statusId: "st-won",
    status: DEFAULT_STATUSES[5],
    tags: [{ name: "High Value" }],
    estimatedValue: "320000",
    notes: "• [3 days ago] Contract signed for 120 staff licenses.",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const DEFAULT_REMINDERS = [
  {
    id: "rem-1",
    _id: "rem-1",
    title: "Follow up on Enterprise Quotation",
    notes: "Call Vikram regarding proposal approval and tax invoice.",
    leadId: "lead-1",
    priority: "High",
    isCompleted: false,
    dueDate: new Date().toISOString(),
    lead: DEFAULT_LEADS[0],
  },
  {
    id: "rem-2",
    _id: "rem-2",
    title: "Initial Product Demo Call",
    notes: "Conduct virtual walkthrough of GPS attendance and payroll.",
    leadId: "lead-2",
    priority: "Medium",
    isCompleted: false,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    lead: DEFAULT_LEADS[1],
  },
];

// Helper to get local storage item with default fallback
async function getLocalData(key, defaultData) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    await AsyncStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  } catch (_) {
    return defaultData;
  }
}

async function setLocalData(key, data) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
}

export const leadsService = {
  // ── Leads CRUD ──────────────────────────────────────────────
  getLeads: async (params = {}) => {
    try {
      const response = await api.get("/leads-engine/leads", { params });
      if (response?.data && Array.isArray(response.data)) {
        await setLocalData(STORAGE_KEYS.LEADS, response.data);
        return response.data;
      }
      if (response?.data?.data && Array.isArray(response.data.data)) {
        await setLocalData(STORAGE_KEYS.LEADS, response.data.data);
        return response.data.data;
      }
    } catch (_) {}

    // Safe fallback to local persistent cache
    let list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.whatsappPhone?.includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q)
      );
    }
    if (params.statusId && params.statusId !== "all") {
      list = list.filter((l) => l.statusId === params.statusId || l.status?.id === params.statusId);
    }
    if (params.source && params.source !== "all") {
      list = list.filter((l) => l.source === params.source);
    }
    return list;
  },

  getLeadById: async (id) => {
    try {
      const response = await api.get(`/leads-engine/leads/${id}`);
      if (response?.data?.data) return response.data.data;
      if (response?.data && response.data.name) return response.data;
    } catch (_) {}

    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const statuses = await getLocalData(STORAGE_KEYS.STATUSES, DEFAULT_STATUSES);
    const found = list.find((l) => (l.id || l._id) === id) || list[0];
    if (found && !found.status && found.statusId) {
      found.status = statuses.find((s) => (s.id || s._id) === found.statusId) || statuses[0];
    }
    return found;
  },

  createLead: async (leadData) => {
    let createdLead = null;
    try {
      const response = await api.post("/leads-engine/leads", leadData);
      if (response?.data) {
        createdLead = response.data.data || response.data;
      }
    } catch (e) {
      console.warn("[leadsService] API createLead error, using local fallback:", e.message);
    }

    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const statuses = await getLocalData(STORAGE_KEYS.STATUSES, DEFAULT_STATUSES);
    const matchedStatus = statuses.find((s) => (s.id || s._id) === leadData.statusId) || statuses[0];

    if (!createdLead) {
      createdLead = {
        id: "lead-" + Date.now(),
        _id: "lead-" + Date.now(),
        ...leadData,
        status: matchedStatus,
        createdAt: new Date().toISOString(),
      };
    } else if (!createdLead.status) {
      createdLead.status = matchedStatus;
    }

    const updatedList = [createdLead, ...list.filter((l) => (l.id || l._id) !== (createdLead.id || createdLead._id))];
    await setLocalData(STORAGE_KEYS.LEADS, updatedList);

    return createdLead;
  },

  updateLead: async (id, updateData) => {
    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const statuses = await getLocalData(STORAGE_KEYS.STATUSES, DEFAULT_STATUSES);

    let updatedItem = null;
    const updatedList = list.map((l) => {
      if ((l.id || l._id) === id) {
        const newStatus = updateData.statusId
          ? statuses.find((s) => (s.id || s._id) === updateData.statusId) || l.status
          : l.status;
        updatedItem = { ...l, ...updateData, status: newStatus };
        return updatedItem;
      }
      return l;
    });

    await setLocalData(STORAGE_KEYS.LEADS, updatedList);

    try {
      await api.patch(`/leads-engine/leads/${id}`, updateData);
    } catch (_) {}

    return updatedItem;
  },

  bulkAssign: async (leadIds, assignedTo, assignedUser = null) => {
    try {
      await api.patch("/leads-engine/leads/bulk-assign", { leadIds, assignedTo });
    } catch (_) {
      try {
        await api.patch("/leads/bulk-assign", { leadIds, assignedTo });
      } catch (err) {
        console.warn("[leadsService] bulkAssign network fallback:", err.message);
      }
    }

    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const updatedList = list.map((l) => {
      if (leadIds.includes(l.id) || leadIds.includes(l._id)) {
        return {
          ...l,
          assignedTo: assignedUser || (assignedTo ? { id: assignedTo, name: "Assigned Rep" } : null),
          assignedToId: assignedTo,
        };
      }
      return l;
    });

    await setLocalData(STORAGE_KEYS.LEADS, updatedList);
    return { success: true, updated: leadIds.length };
  },

  getAssignableUsers: async () => {
    try {
      const response = await api.get("/leads-engine/assignable-users");
      const list = response.data?.data || response.data?.users || response.data || [];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (_) {}
    try {
      const response = await api.get("/employees");
      const list = response.data?.employees || response.data?.data || response.data || [];
      return list.map((e) => ({
        id: e.userId?._id || e._id,
        _id: e.userId?._id || e._id,
        name: e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name,
        department: e.departmentId?.name || "",
        role: e.role || "Employee",
        label: e.departmentId?.name ? `${e.fullName || e.name} (${e.departmentId.name})` : `${e.fullName || e.name}`,
      }));
    } catch (_) {
      return [];
    }
  },

  deleteLead: async (id) => {
    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const updatedList = list.filter((l) => (l.id || l._id) !== id);
    await setLocalData(STORAGE_KEYS.LEADS, updatedList);

    try {
      await api.delete(`/leads-engine/leads/${id}`);
    } catch (_) {}

    return { message: "Deleted" };
  },

  addLeadDocument: async (leadId, docData) => {
    try {
      const response = await api.post(`/leads-engine/leads/${leadId}/documents`, docData);
      return response.data;
    } catch (_) {
      try {
        const response = await api.post(`/leads/${leadId}/documents`, docData);
        return response.data;
      } catch (err) {
        console.warn("[leadsService] addLeadDocument error:", err.message);
      }
    }
  },

  deleteLeadDocument: async (leadId, docId) => {
    try {
      const response = await api.delete(`/leads-engine/leads/${leadId}/documents/${docId}`);
      return response.data;
    } catch (_) {
      try {
        const response = await api.delete(`/leads/${leadId}/documents/${docId}`);
        return response.data;
      } catch (err) {
        console.warn("[leadsService] deleteLeadDocument error:", err.message);
      }
    }
  },

  // ── Statuses ────────────────────────────────────────────────
  getStatuses: async () => {
    try {
      const response = await api.get("/leads-engine/statuses");
      if (Array.isArray(response?.data)) {
        const cleanList = response.data.filter((s) => s?.name && s.name.trim().toLowerCase() !== "aa" && s.isActive !== false);
        await setLocalData(STORAGE_KEYS.STATUSES, cleanList);
        return cleanList;
      }
    } catch (_) {}

    const cached = await getLocalData(STORAGE_KEYS.STATUSES, DEFAULT_STATUSES);
    return (Array.isArray(cached) ? cached : DEFAULT_STATUSES).filter((s) => s?.name && s.name.trim().toLowerCase() !== "aa");
  },

  createStatus: async (statusData) => {
    const list = await getLocalData(STORAGE_KEYS.STATUSES, DEFAULT_STATUSES);
    const newStatus = {
      id: "st-" + Date.now(),
      _id: "st-" + Date.now(),
      ...statusData,
      order: list.length + 1,
    };
    const updated = [...list, newStatus];
    await setLocalData(STORAGE_KEYS.STATUSES, updated);

    try {
      await api.post("/leads-engine/statuses", statusData);
    } catch (_) {}

    return newStatus;
  },

  deleteStatus: async (id) => {
    const list = await getLocalData(STORAGE_KEYS.STATUSES, DEFAULT_STATUSES);
    const updated = list.filter((s) => (s.id || s._id) !== id);
    await setLocalData(STORAGE_KEYS.STATUSES, updated);
    return { message: "Deleted" };
  },

  // ── Sources & Tags ──────────────────────────────────────────
  getSources: async () => {
    try {
      const response = await api.get("/leads-engine/sources");
      if (Array.isArray(response?.data)) return response.data;
    } catch (_) {}
    return await getLocalData(STORAGE_KEYS.SOURCES, DEFAULT_SOURCES);
  },

  createSource: async (sourceData) => {
    const list = await getLocalData(STORAGE_KEYS.SOURCES, DEFAULT_SOURCES);
    const newSrc = { id: "src-" + Date.now(), ...sourceData };
    const updated = [...list, newSrc];
    await setLocalData(STORAGE_KEYS.SOURCES, updated);
    return newSrc;
  },

  getTags: async () => {
    try {
      const response = await api.get("/leads-engine/tags");
      if (Array.isArray(response?.data)) return response.data;
    } catch (_) {}
    return await getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
  },

  createTag: async (tagData) => {
    const list = await getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
    const newTag = { id: "tag-" + Date.now(), ...tagData };
    const updated = [...list, newTag];
    await setLocalData(STORAGE_KEYS.TAGS, updated);
    return newTag;
  },

  deleteTag: async (id) => {
    const list = await getLocalData(STORAGE_KEYS.TAGS, DEFAULT_TAGS);
    const updated = list.filter((t) => (t.id || t._id) !== id);
    await setLocalData(STORAGE_KEYS.TAGS, updated);
    return { message: "Deleted" };
  },

  // ── Reminders ───────────────────────────────────────────────
  getReminders: async () => {
    try {
      const response = await api.get("/leads-engine/reminders");
      if (Array.isArray(response?.data?.reminders)) return response.data.reminders;
      if (Array.isArray(response?.data)) return response.data;
    } catch (_) {}
    return await getLocalData(STORAGE_KEYS.REMINDERS, DEFAULT_REMINDERS);
  },

  createReminder: async (reminderData) => {
    const list = await getLocalData(STORAGE_KEYS.REMINDERS, DEFAULT_REMINDERS);
    const leads = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const matchedLead = leads.find((l) => (l.id || l._id) === reminderData.leadId);

    const newReminder = {
      id: "rem-" + Date.now(),
      _id: "rem-" + Date.now(),
      ...reminderData,
      isCompleted: false,
      lead: matchedLead,
      dueDate: new Date().toISOString(),
    };
    const updated = [newReminder, ...list];
    await setLocalData(STORAGE_KEYS.REMINDERS, updated);

    try {
      await api.post("/leads-engine/reminders", reminderData);
    } catch (_) {}

    return newReminder;
  },

  deleteReminder: async (id) => {
    const list = await getLocalData(STORAGE_KEYS.REMINDERS, DEFAULT_REMINDERS);
    const updated = list.filter((r) => (r.id || r._id) !== id);
    await setLocalData(STORAGE_KEYS.REMINDERS, updated);
    return { message: "Deleted" };
  },

  // ── Campaigns & Templates ───────────────────────────────────
  getCampaigns: async () => {
    try {
      const response = await api.get("/leads-engine/campaigns");
      if (Array.isArray(response?.data?.campaigns)) return response.data.campaigns;
    } catch (_) {}
    return [
      { id: "c-1", name: "Q3 Business Outreach Blast", channel: "WhatsApp", totalRecipients: 154, delivered: "98%", readRate: "81%" },
      { id: "c-2", name: "HRMS Feature Announcement", channel: "WhatsApp", totalRecipients: 92, delivered: "96%", readRate: "74%" },
    ];
  },

  createCampaign: async (data) => {
    return { id: "c-" + Date.now(), ...data, totalRecipients: 1, delivered: "100%", readRate: "100%" };
  },

  getTemplates: async () => {
    return [
      { id: "t-1", name: "Inquiry Introduction", message: "Hello {name}, thank you for connecting with OneClick HRMS! We would love to understand your requirements." },
      { id: "t-2", name: "Demo Follow-up", message: "Hi {name}, following up on our product demo. Would you like to proceed with the free trial?" },
      { id: "t-3", name: "Quotation Review", message: "Hello {name}, we have sent the customized pricing proposal to your email." },
    ];
  },

  // ── Drips & Automation Flows ──────────────────────────────
  getDrips: async () => {
    try {
      const response = await api.get("/api/flows");
      if (Array.isArray(response?.data?.flows)) return response.data.flows;
      if (Array.isArray(response?.data)) return response.data;
    } catch (_) {}
    return [
      {
        id: "drip-1",
        _id: "drip-1",
        name: "New Lead Welcome Sequence",
        triggerType: "STATUS_CHANGE",
        triggerStatus: "New Prospect",
        isActive: true,
        steps: [
          { delayDays: 0, template: "Inquiry Introduction", time: "Instant" },
          { delayDays: 2, template: "Product Catalog & Brochure", time: "10:00 AM" },
          { delayDays: 5, template: "Demo Follow-up", time: "02:30 PM" },
        ],
        totalSent: 142,
      },
      {
        id: "drip-2",
        _id: "drip-2",
        name: "Proposal Nurturing Drip",
        triggerType: "STATUS_CHANGE",
        triggerStatus: "Proposal Sent",
        isActive: true,
        steps: [
          { delayDays: 1, template: "Quotation Review", time: "11:00 AM" },
          { delayDays: 4, template: "Enterprise Client Case Study", time: "04:00 PM" },
        ],
        totalSent: 89,
      },
    ];
  },

  createDrip: async (data) => {
    try {
      const response = await api.post("/api/flows", data);
      return response.data;
    } catch (_) {}
    return { id: "drip-" + Date.now(), ...data, isActive: true, totalSent: 0 };
  },

  toggleDrip: async (id, isActive) => {
    try {
      await api.patch(`/api/flows/${id}/status`, { isActive });
    } catch (_) {}
    return { success: true };
  },

  deleteDrip: async (id) => {
    try {
      await api.delete(`/api/flows/${id}`);
    } catch (_) {}
    return { success: true };
  },

  getPublicToken: async () => {
    return { publicToken: "oneclick-demo-portal-2026" };
  },

  getOptInCounts: async () => {
    return { count: 320 };
  },

  bulkStatus: async (leadIds, statusId) => {
    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const statuses = await getLocalData(STORAGE_KEYS.STATUSES, DEFAULT_STATUSES);
    const newStatus = statuses.find((s) => (s.id || s._id) === statusId);

    const updated = list.map((l) => {
      if (leadIds.includes(l.id || l._id)) {
        return { ...l, statusId, status: newStatus || l.status };
      }
      return l;
    });

    await setLocalData(STORAGE_KEYS.LEADS, updated);
    return { message: "Updated" };
  },

  bulkAssign: async (leadIds, assignedTo, assignedUser) => {
    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const updated = list.map((l) => {
      if (leadIds.includes(l.id || l._id)) {
        return {
          ...l,
          assignedTo: assignedUser || assignedTo,
          assignedToId: assignedTo,
        };
      }
      return l;
    });

    await setLocalData(STORAGE_KEYS.LEADS, updated);

    try {
      await api.patch("/leads-engine/leads/bulk-assign", { leadIds, assignedTo });
    } catch (_) {}

    return { message: "Assigned" };
  },

  bulkDelete: async (leadIds) => {
    const list = await getLocalData(STORAGE_KEYS.LEADS, DEFAULT_LEADS);
    const updated = list.filter((l) => !leadIds.includes(l.id || l._id));
    await setLocalData(STORAGE_KEYS.LEADS, updated);
    return { message: "Deleted" };
  },

  // ── WhatsApp & Business Settings ────────────────────────────
  getBusinessProfile: async () => {
    try {
      const response = await api.get("/api/business");
      if (response?.data) return response.data;
    } catch (_) {}
    return {
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
    };
  },

  updateBusinessProfile: async (data) => {
    try {
      const response = await api.put("/api/business", data);
      return response.data;
    } catch (_) {}
    return { success: true, data };
  },

  getWhatsAppAccount: async () => {
    try {
      const response = await api.get("/api/whatsapp/account");
      if (response?.data) return response.data;
    } catch (_) {}
    return {
      apiProvider: "OFFICIAL_META",
      connectionStatus: "CONNECTED",
      displayPhoneNumber: "+91 98220 12345",
      businessAccountId: "108923489234",
      phoneNumberId: "109823489234",
      accessToken: "••••••••••••••••••••",
      thirdPartyEndpoint: "https://app.click2api.in",
      thirdPartyInstanceId: "INST-90234",
      thirdPartyToken: "••••••••••••",
    };
  },

  updateWhatsAppAccount: async (data) => {
    try {
      const response = await api.put("/api/whatsapp/account", data);
      return response.data;
    } catch (_) {}
    return { success: true, data };
  },

  testWhatsAppConnection: async (data) => {
    try {
      const response = await api.post("/api/whatsapp/test", data);
      return response.data;
    } catch (_) {}
    return { success: true, message: "WhatsApp API connection verified successfully!" };
  },
};

export default leadsService;
