/**
 * Utility Service for handling external notification providers.
 * Currently simulates sending via console.log to prevent blocking without API keys.
 */

exports.sendEmail = async (to, subject, body) => {
  return new Promise((resolve) => {
    console.log(`\n==========================================`);
    console.log(`[EMAIL SIMULATION]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log(`==========================================\n`);
    resolve({ success: true, message: "Email simulated successfully" });
  });
};

exports.sendWhatsApp = async (phone, message) => {
  return new Promise((resolve) => {
    console.log(`\n==========================================`);
    console.log(`[WHATSAPP SIMULATION]`);
    console.log(`To: ${phone}`);
    console.log(`Message:\n${message}`);
    console.log(`==========================================\n`);
    resolve({ success: true, message: "WhatsApp simulated successfully" });
  });
};
