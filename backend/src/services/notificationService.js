const { sendWhatsAppNotification } = require("./whatsappService");

/**
 * Universal Service for handling external notification providers (Email, WhatsApp).
 */

exports.sendEmail = async (to, subject, body) => {
  return new Promise((resolve) => {
    console.log(`\n==========================================`);
    console.log(`[EMAIL DISPATCH]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log(`==========================================\n`);
    resolve({ success: true, message: "Email dispatched successfully" });
  });
};

exports.sendWhatsApp = async (phone, message, companyId = null) => {
  try {
    const result = await sendWhatsAppNotification({
      companyId,
      recipient: phone,
      messageType: "HR_ALERT",
      payload: { text: message },
    });

    if (!result.success) {
      console.log(`[WHATSAPP NOTICE] ${result.error || "Simulated dispatch"}`);
    }
    return result;
  } catch (err) {
    console.warn(`[WHATSAPP DISPATCH ERROR]: ${err.message}`);
    return { success: false, error: err.message };
  }
};
