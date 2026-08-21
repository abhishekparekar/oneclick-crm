const axios = require("axios");
const WhatsappSetting = require("../models/WhatsappSetting");
const WhatsappLog = require("../models/WhatsappLog");

const DEFAULT_API_VERSION = process.env.WHATSAPP_API_VERSION || "v20.0";

/**
 * Format and sanitize phone number (adds 91 for Indian 10-digit numbers)
 */
function formatRecipientPhone(recipient) {
  if (!recipient) return "";
  let formatted = String(recipient).replace(/^\+/, "").replace(/\D/g, "");
  if (formatted.length === 10) {
    formatted = `91${formatted}`;
  }
  return formatted;
}

/**
 * Unified WhatsApp Error Diagnostics Analyzer
 */
function analyzeWhatsAppError(error) {
  const status = error.response?.status;
  const rawError = error.response?.data?.error;
  const responseData = error.response?.data;
  const code = rawError?.code || status || null;
  const rawMsg = rawError?.message || (typeof responseData === "string" ? responseData : "") || error.message || "";

  let errorCategory = "GATEWAY_ERROR";
  let resolutionHint = "Please check your WhatsApp API credentials and permissions.";
  let formattedMessage = rawMsg;

  if (/channel not active/i.test(rawMsg)) {
    errorCategory = "CLICK2API_CHANNEL_INACTIVE";
    resolutionHint = "Your Click2API WhatsApp channel is currently inactive or QR is disconnected. Please login to crm.click2api.in > Channels > Relink/Scan WhatsApp QR.";
    formattedMessage = "Click2API WhatsApp channel is inactive or disconnected. Please scan QR in Click2API dashboard.";
  } else if (/invalid call/i.test(rawMsg) || (responseData?.error === 'invalid call')) {
    errorCategory = "CLICK2API_INVALID_CALL";
    resolutionHint = "Click2API rejected the send request. Possible reasons: (1) Phone number not properly registered in Click2API portal, (2) API token lacks send permission, (3) Template not approved in the linked WhatsApp Business Account. Visit crm.click2api.in to verify your account and phone setup.";
    formattedMessage = "Click2API rejected message send: 'invalid call'. Phone/token may not have send permission in Click2API portal.";
  } else if (/unauthorized access/i.test(rawMsg)) {
    errorCategory = "CLICK2API_UNAUTHORIZED";
    resolutionHint = "Click2API token is expired or wallet balance is zero. Check your Click2API dashboard (crm.click2api.in).";
    formattedMessage = "Click2API authorization rejected. Check token and balance in Click2API portal.";
  } else if (code === 190 || /malformed|invalid.*token/i.test(rawMsg)) {
    errorCategory = "INVALID_ACCESS_TOKEN";
    resolutionHint = "Meta Access Token is invalid or expired. Copy a fresh token from developers.facebook.com > WhatsApp > API Setup.";
    formattedMessage = "Meta Access Token is malformed or invalid. Please copy a valid token from Meta Developers Portal.";
  } else if (code === 131030 || /not registered|recipient/i.test(rawMsg)) {
    errorCategory = "UNREGISTERED_RECIPIENT";
    resolutionHint = "The recipient number is not registered in Meta Sandbox test phone numbers. Add it under API Setup > To field.";
    formattedMessage = "Recipient is not registered in your Meta Sandbox phone numbers list.";
  } else if (code === 132000 || code === 132001 || /parameter|variable/i.test(rawMsg)) {
    errorCategory = "PARAMETER_MISMATCH";
    resolutionHint = "The number of variable parameters sent does not match the template structure in Meta.";
    formattedMessage = "Template parameter mismatch: check {{1}}, {{2}} variable counts.";
  } else if (code === 131009 || code === 131008 || /parameter missing/i.test(rawMsg)) {
    errorCategory = "REQUIRED_PARAM_MISSING";
    resolutionHint = "A required header media URL or parameter was omitted in the payload.";
    formattedMessage = "Required parameter or media header was missing.";
  } else if (status === 404 || /cannot get|not found/i.test(rawMsg)) {
    errorCategory = "ENDPOINT_NOT_FOUND";
    resolutionHint = "Phone Number ID or endpoint URL is incorrect. Ensure Meta uses https://graph.facebook.com.";
    formattedMessage = "Gateway endpoint not found (HTTP 404). Check Phone Number ID and API Base URL.";
  } else if (status === 401 || status === 403 || /permission/i.test(rawMsg)) {
    errorCategory = "PERMISSIONS_DENIED";
    resolutionHint = "Your WhatsApp Gateway token lacks permission or channel is unauthorized.";
    formattedMessage = "Permission denied or channel unauthorized by WhatsApp gateway.";
  } else if (/timeout|econnaborted|enotfound/i.test(error.message || "")) {
    errorCategory = "NETWORK_TIMEOUT";
    resolutionHint = "Could not reach WhatsApp gateway. Check internet connection and API base URL.";
    formattedMessage = "Network timeout communicating with WhatsApp API server.";
  }

  return {
    errorCode: code ? String(code) : "UNKNOWN",
    errorCategory,
    resolutionHint,
    formattedMessage,
    fullMessage: `[${errorCategory}] ${formattedMessage} (Fix: ${resolutionHint})`,
  };
}

/**
 * Helper: Make Meta API request with dynamic base URL, versioning, timeout, and clean error extraction
 */
async function makeMetaRequest(endpoint, token, method = "GET", data = null, customBaseUrl = null) {
  const cleanToken = String(token || "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\r?\n|\r/g, "")
    .trim();
  const cleanEndpoint = String(endpoint || "").trim();
  const cleanBase = (customBaseUrl && String(customBaseUrl).trim())
    ? String(customBaseUrl).trim().replace(/\/+$/, "")
    : "https://graph.facebook.com";

  let baseUrl;
  if (/\/v\d+(\.\d+)?$/i.test(cleanBase)) {
    baseUrl = cleanBase;
  } else {
    baseUrl = `${cleanBase}/${DEFAULT_API_VERSION}`;
  }

  const url = cleanEndpoint.startsWith("http")
    ? cleanEndpoint
    : `${baseUrl}/${cleanEndpoint.replace(/^\/+/, "")}`;
  const isGet = method.toUpperCase() === "GET";

  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    ...(isGet ? {} : { "Content-Type": "application/json" }),
  };

  console.log(`[Meta WhatsApp API Request] ${method} ${url}`);

  try {
    const response = await axios({
      url,
      method,
      headers,
      ...(isGet || !data ? {} : { data }),
      timeout: 15000,
    });
    console.log(`[Meta WhatsApp API Response] ${method} ${url} -> Status: ${response.status}`);
    return response.data;
  } catch (error) {
    const analysis = analyzeWhatsAppError(error);
    console.error(`[Meta WhatsApp API Error] ${method} ${url} -> ${analysis.fullMessage}`);
    throw new Error(analysis.fullMessage);
  }
}

/**
 * Universal WhatsApp Notification Dispatcher
 */
async function sendWhatsAppNotification({
  companyId = null,
  recipient,
  messageType = "NOTIFICATION",
  payload = {},
}) {
  try {
    const formattedRecipient = formatRecipientPhone(recipient);

    if (!formattedRecipient || formattedRecipient.length < 10) {
      console.warn("[WhatsApp Service] Invalid recipient mobile number:", recipient);
      return {
        success: false,
        error: "Invalid recipient mobile number. Must include country code (e.g. 919876543210).",
      };
    }

    // Fetch Company-specific or default WhatsApp API Settings
    let config = null;
    if (companyId) {
      config = await WhatsappSetting.findOne({ $or: [{ companyId }, { companyId: null }] }).sort({ companyId: -1 });
    } else {
      config = await WhatsappSetting.findOne();
    }

    // Check if WhatsApp is disabled
    if (config && config.isEnabled === false) {
      console.log(`[WhatsApp API] Skipped: WhatsApp disabled in settings`);
      return { success: false, error: "WhatsApp service is disabled in Settings." };
    }

    const isClick2Api = config?.apiProvider === "THIRD_PARTY_CLICK2API" || String(config?.apiEndpoint || "").includes("click2api");
    const token = (isClick2Api
      ? (config?.thirdPartyToken || config?.accessToken)
      : (config?.accessToken || config?.thirdPartyToken)) || process.env.WHATSAPP_API_TOKEN;

    const phoneId = config?.phoneNumberId || config?.thirdPartyInstanceId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return {
        success: false,
        error: "WhatsApp API Credentials (Phone Number ID / Access Token) are missing. Please enter and save your credentials in WhatsApp Settings.",
      };
    }

    let externalWamid = null;
    let dispatchError = null;

    let cleanBase;
    if (isClick2Api) {
      cleanBase = (config?.thirdPartyEndpoint || config?.apiEndpoint || "https://crm.click2api.in/api/meta").trim().replace(/\/+$/, "");
    } else {
      cleanBase = (config?.apiEndpoint || config?.metaApiBaseUrl || "https://graph.facebook.com").trim().replace(/\/+$/, "");
    }

    let metaBaseUrl;
    if (/\/v\d+(\.\d+)?$/i.test(cleanBase)) {
      metaBaseUrl = cleanBase;
    } else {
      metaBaseUrl = `${cleanBase}/${DEFAULT_API_VERSION}`;
    }
    const sendUrl = `${metaBaseUrl}/${phoneId}/messages`;

      let bodyPayload;

      if (payload?.template) {
        // 1. Meta Template Message Format
        const templateName = payload.template;
        const customTemplates = Array.isArray(config?.customTemplates) ? config.customTemplates : [];
        let matchedTpl = customTemplates.find((t) => t.name === templateName);
        if (!matchedTpl) {
          try {
            const LeadTemplate = require("../models/LeadTemplate");
            const dbTpl = await LeadTemplate.findOne({ name: templateName, isActive: { $ne: false } });
            if (dbTpl) matchedTpl = dbTpl.toJSON ? dbTpl.toJSON() : dbTpl;
          } catch (_) {}
        }

        const templateLang = payload.language || matchedTpl?.language || "en";
        const components = [];

        // Determine Header Media Component (IMAGE, VIDEO, DOCUMENT) based on template definition
        const headerFormat = (matchedTpl?.headerType || payload.mediaType || "NONE").toUpperCase();
        let headerLink = payload.mediaUrl || matchedTpl?.headerContent;

        const isValidHttpUrl = headerLink && (headerLink.startsWith("http://") || headerLink.startsWith("https://"));

        // If template requires a header media but none provided, provide standard placeholder
        if (!isValidHttpUrl) {
          if (headerFormat === "IMAGE") {
            headerLink = "https://images.unsplash.com/photo-1579389083078-4e7018379f7e?w=800";
          } else if (headerFormat === "VIDEO") {
            headerLink = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
          } else if (headerFormat === "DOCUMENT") {
            headerLink = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
          }
        }

        if (headerFormat === "IMAGE" && headerLink) {
          components.push({
            type: "header",
            parameters: [{ type: "image", image: { link: headerLink } }],
          });
        } else if (headerFormat === "VIDEO" && headerLink) {
          components.push({
            type: "header",
            parameters: [{ type: "video", video: { link: headerLink } }],
          });
        } else if (headerFormat === "DOCUMENT" && headerLink) {
          components.push({
            type: "header",
            parameters: [{ type: "document", document: { link: headerLink, filename: "Details.pdf" } }],
          });
        }

        // Add Body Parameters with safe padding
        const resolvedParams = payload.params && Array.isArray(payload.params)
          ? payload.params
          : Object.values(payload.variables || payload.variableValues || {});

        const bodyParamsCount = Math.max(
          resolvedParams.length,
          matchedTpl?.variablesJson?.length || 0,
          (matchedTpl?.bodyText?.match(/\{\{\d+\}\}/g) || []).length
        );

        if (bodyParamsCount > 0) {
          const bodyParameters = [];
          for (let i = 0; i < bodyParamsCount; i++) {
            const val = resolvedParams[i] !== undefined && resolvedParams[i] !== null && String(resolvedParams[i]).trim() !== ""
              ? String(resolvedParams[i])
              : `Param ${i + 1}`;
            bodyParameters.push({ type: "text", text: val });
          }
          components.push({ type: "body", parameters: bodyParameters });
        }

        bodyPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedRecipient,
          type: "template",
          template: {
            name: templateName,
            language: { code: templateLang },
            ...(components.length > 0 ? { components } : {}),
          },
        };
      } else {
        // 2. Direct Text Message Format
        const textMessage = payload?.text || "Hello from ONE CLICK CRM!";
        bodyPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedRecipient,
          type: "text",
          text: {
            preview_url: false,
            body: textMessage,
          },
        };
      }

      console.log(`[Meta WhatsApp Outbound Dispatch] POST ${sendUrl} to ${formattedRecipient}`);
      console.log(`[Meta WhatsApp Payload]:`, JSON.stringify(bodyPayload, null, 2));
      console.log(`[Meta WhatsApp PhoneId]: ${phoneId}, Provider: ${isClick2Api ? 'CLICK2API' : 'META_DIRECT'}`);
      console.log(`[Meta WhatsApp Token Prefix]: ${String(token).substring(0, 20)}...`);
      try {
        const cleanToken = String(token).replace(/^Bearer\s+/i, "").trim();
        const response = await axios.post(sendUrl, bodyPayload, {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });

        const apiData = response.data;
        console.log(`[WhatsApp API Response Raw]:`, JSON.stringify(apiData));

        const extractedId =
          apiData?.messages?.[0]?.id ||
          apiData?.data?.messages?.[0]?.id ||
          apiData?.message?.queue_id ||
          apiData?.queue_id ||
          apiData?.data?.queue_id ||
          apiData?.id ||
          apiData?.data?.id ||
          apiData?.message_id ||
          apiData?.data?.message_id ||
          apiData?.wamid ||
          apiData?.data?.wamid;

        const isQueuedOrSent =
          apiData?.message?.message_status === "queued" ||
          apiData?.message_status === "queued" ||
          apiData?.message_status === "accepted" ||
          apiData?.status === "sent" ||
          apiData?.status === "queued" ||
          apiData?.success === true;

        if (extractedId) {
          externalWamid = extractedId;
          console.log(`[WhatsApp API Dispatch SUCCESS] to ${formattedRecipient}: ID = ${externalWamid}`);
        } else if (isQueuedOrSent || (response.status >= 200 && response.status < 300 && !apiData?.error && apiData?.success !== false)) {
          externalWamid = `wamid_${Date.now()}`;
          console.log(`[WhatsApp API Dispatch SUCCESS (HTTP ${response.status})] to ${formattedRecipient}: ID = ${externalWamid}`);
        } else {
          const rawErr = apiData?.error || apiData?.message;
          dispatchError = typeof rawErr === "string" ? rawErr : (rawErr?.message || JSON.stringify(apiData));
          console.error(`[WhatsApp API Dispatch REJECTED] to ${formattedRecipient}:`, dispatchError);
        }
      } catch (err) {
        const analysis = analyzeWhatsAppError(err);
        dispatchError = analysis.fullMessage;
        console.error(`[WhatsApp API Dispatch ERROR] to ${formattedRecipient}:`, dispatchError);
      }

    const resolvedProvider = "META_CLOUD_API";

    // Log the notification attempt into database with full diagnostics
    let log = null;
    try {
      let errAnalysis = null;
      if (dispatchError) {
        errAnalysis = analyzeWhatsAppError(new Error(dispatchError));
      }
      log = await WhatsappLog.create({
        companyId: companyId || config?.companyId || null,
        recipient: formattedRecipient,
        messageType: messageType || "NOTIFICATION",
        provider: resolvedProvider,
        payload: {
          ...payload,
          ...(externalWamid && { wamid: externalWamid }),
          ...(dispatchError && { error: dispatchError }),
        },
        status: dispatchError ? "FAILED" : "SENT",
        wamid: externalWamid,
        error: dispatchError,
        errorCode: errAnalysis?.errorCode || null,
        errorCategory: errAnalysis?.errorCategory || null,
        resolutionHint: errAnalysis?.resolutionHint || null,
        sentAt: new Date(),
      });
    } catch (logErr) {
      console.warn("[WhatsApp Log Creation Warning]:", logErr.message);
    }

    if (dispatchError) {
      return {
        success: false,
        error: dispatchError,
        logId: log?._id || null,
        status: "FAILED",
      };
    }

    return {
      success: true,
      logId: log?._id || null,
      recipient: formattedRecipient,
      status: "SENT",
      wamid: externalWamid,
      templateUsed: payload?.template || "TEXT_MESSAGE",
      provider: resolvedProvider,
    };
  } catch (error) {
    const analysis = analyzeWhatsAppError(error);
    console.error("WhatsApp Service Error:", analysis.fullMessage);
    return { success: false, error: analysis.fullMessage };
  }
}

/**
 * Helper to build dynamic parameter values for Meta templates based on event mappings
 */
function resolveEventParameters({
  eventMapping,
  templateVariables = [],
  tokenValues = {},
  fallbackParams = [],
}) {
  if (!Array.isArray(templateVariables) || templateVariables.length === 0) {
    return fallbackParams;
  }

  const varMap = eventMapping?.varMap || {};

  return templateVariables.map((varNum, idx) => {
    const mapping = varMap[varNum] || varMap[String(varNum)];
    if (mapping && typeof mapping === "string") {
      if (mapping.startsWith("CUSTOM:")) {
        return mapping.substring(7);
      }
      if (tokenValues[mapping] !== undefined) {
        return String(tokenValues[mapping]);
      }
      const cleanToken = mapping.replace(/[{}]/g, "");
      if (tokenValues[cleanToken] !== undefined) {
        return String(tokenValues[cleanToken]);
      }
    }
    return fallbackParams[idx] || (mapping ? mapping.replace(/[{}]/g, "") : `Param ${varNum}`);
  });
}

module.exports = {
  DEFAULT_API_VERSION,
  formatRecipientPhone,
  makeMetaRequest,
  sendWhatsAppNotification,
  resolveEventParameters,
  analyzeWhatsAppError,
};
