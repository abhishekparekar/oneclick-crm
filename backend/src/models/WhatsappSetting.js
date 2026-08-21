const mongoose = require("mongoose");

const whatsappSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true,
    },
    apiProvider: {
      type: String,
      default: "OFFICIAL_META",
    },
    businessAccountId: {
      type: String,
      default: "",
    },
    phoneNumberId: {
      type: String,
      default: "",
    },
    displayPhoneNumber: {
      type: String,
      default: "",
    },
    verifiedName: {
      type: String,
      default: "",
    },
    qualityRating: {
      type: String,
      default: "GREEN",
    },
    accessToken: {
      type: String,
      default: "",
    },
    thirdPartyToken: {
      type: String,
      default: "",
    },
    thirdPartyEndpoint: {
      type: String,
      default: "https://crm.click2api.in/api/meta",
    },
    thirdPartyInstanceId: {
      type: String,
      default: "",
    },
    metaApiBaseUrl: {
      type: String,
      default: "https://graph.facebook.com",
    },
    apiEndpoint: {
      type: String,
      default: "https://graph.facebook.com",
    },
    apiVersion: {
      type: String,
      default: "v20.0",
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      default: "DISCONNECTED",
    },
    connectionStatus: {
      type: String,
      default: "DISCONNECTED",
    },
    customTemplates: {
      type: mongoose.Schema.Types.Mixed,
      default: () => [],
    },
    eventMappings: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("WhatsappSetting", whatsappSettingSchema);
