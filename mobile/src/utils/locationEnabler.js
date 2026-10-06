import { NativeModules, Platform } from "react-native";

const { LocationEnabler } = NativeModules;

/**
 * Prompts the user to enable device GPS / Location Accuracy via Google Play Services dialog.
 * Shows the exact native dialog:
 * "For a better experience, your device will need to use Location Accuracy" -> [Turn on]
 * 
 * @returns {Promise<boolean>} true if location is turned on or already active, false otherwise
 */
export const promptEnableLocation = async () => {
  if (Platform.OS !== "android") {
    return true;
  }

  if (!LocationEnabler || typeof LocationEnabler.promptForEnableLocation !== "function") {
    console.log("[LocationEnabler] Native module not registered or available");
    return false;
  }

  try {
    const result = await LocationEnabler.promptForEnableLocation();
    console.log("[LocationEnabler] Prompt result:", result);
    return result === "ALREADY_ENABLED" || result === "ENABLED";
  } catch (err) {
    console.log("[LocationEnabler] Prompt notice:", err?.message || err);
    return false;
  }
};

export default {
  promptEnableLocation,
};
