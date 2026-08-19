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

  if (code === 190 || /malformed|invalid.*token/i.test(rawMsg)) {
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
    resolutionHint = "Your Meta Token lacks 'whatsapp_business_messaging' or 'whatsapp_business_management' permissions.";
    formattedMessage = "Permission denied. Ensure System User has whatsapp_business_messaging permission.";
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

    const token = config?.accessToken || process.env.WHATSAPP_API_TOKEN;
    const phoneId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return {
        success: false,
        error: "WhatsApp API Credentials (Phone Number ID / Meta Access Token) are missing. Please enter and save your credentials in WhatsApp Settings.",
      };
    }

    let externalWamid = null;
    let dispatchError = null;
    const cleanBase = (config?.apiEndpoint || config?.metaApiBaseUrl || "https://graph.facebook.com").trim().replace(/\/+$/, "");

    // Dispatch via Official Meta Cloud API
    const metaBase = cleanBase || "https://graph.facebook.com";
    let metaBaseUrl;
    if (/\/v\d+(\.\d+)?$/i.test(metaBase)) {
      metaBaseUrl = metaBase;
    } else {
      metaBaseUrl = `${metaBase}/${DEFAULT_API_VERSION}`;
    }
    const sendUrl = `${metaBaseUrl}/${phoneId}/messages`;

      let bodyPayload;

      if (payload?.template) {
        // 1. Meta Template Message Format
        const templateName = payload.template;
        const customTemplates = Array.isArray(config?.customTemplates) ? config.customTemplates : [];
        const matchedTpl = customTemplates.find((t) => t.name === templateName);
        const templateLang = payload.language || matchedTpl?.language || "en_US";
        const components = [];

        // Determine Header Media Component (IMAGE, VIDEO, DOCUMENT) based on template definition
        const headerFormat = (matchedTpl?.headerType || payload.mediaType || "NONE").toUpperCase();
        const headerLink = payload.mediaUrl || matchedTpl?.headerContent;

        const isValidHttpUrl = headerLink && (headerLink.startsWith("http://") || headerLink.startsWith("https://"));

        if (headerFormat === "IMAGE" && isValidHttpUrl) {
          components.push({
            type: "header",
            parameters: [{ type: "image", image: { link: headerLink } }],
          });
        } else if (headerFormat === "VIDEO" && isValidHttpUrl) {
          components.push({
            type: "header",
            parameters: [{ type: "video", video: { link: headerLink } }],
          });
        } else if (headerFormat === "DOCUMENT" && isValidHttpUrl) {
          components.push({
            type: "header",
            parameters: [{ type: "document", document: { link: headerLink } }],
          });
        }

        // Add Body Parameters with safe padding
        const resolvedParams = payload.params && Array.isArray(payload.params)
          ? payload.params
          : Object.values(payload.variables || {});

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
          apiData?.queue_id ||
          apiData?.data?.queue_id ||
          apiData?.id ||
          apiData?.data?.id ||
          apiData?.message_id ||
          apiData?.data?.message_id ||
          apiData?.wamid ||
          apiData?.data?.wamid;

        const isQueuedOrSent =
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
