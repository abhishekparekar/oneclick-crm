const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../middleware/roleMiddleware");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrimaryAdmin: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    isPasswordResetRequired: {
      type: Boolean,
      default: false,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    profileImage: {
      type: String,
      default: "",
    },
    isLocationTrackingEnabled: {
      type: Boolean,
      default: false,
    },
    assignedModules: {
      type: [String],
      default: ["attendance", "leave", "tasks", "leads", "payroll", "projects", "reports"],
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: null,
    },
    // ─── One User One Login Per Platform ─────────────────────────────────────
    // Stores SHA-256 hash of the currently active JWT for each platform.
    // Null = no active session. Set on login, cleared on logout.
    activeWebToken: {
      type: String,
      default: null,
    },
    activeWebTokenExpire: {
      type: Date,
      default: null,
    },
    activeMobileToken: {
      type: String,
      default: null,
    },
    activeMobileTokenExpire: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  console.log("[User] Hashing password for user:", this.email);
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("[User] Password hashed successfully for:", this.email);
  } catch (error) {
    console.error("[User] Password hashing failed:", error.message);
    throw error;
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    if (!enteredPassword || !this.password) {
      return false;
    }
    const isMatch = await bcrypt.compare(String(enteredPassword), String(this.password));
    console.log("[User] Password match check for", this.email + ":", isMatch);
    return isMatch;
  } catch (error) {
    console.error("[User] Password comparison error:", error.message);
    return false;
  }
};

userSchema.methods.getResetPasswordToken = function () {
  const crypto = require("crypto");
  // Generate token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire to 1 hour
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

userSchema.methods.generateResetPasswordOtp = function () {
  const crypto = require("crypto");
  // Generate secure 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP and store in database
  this.resetPasswordOtp = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  // Valid for 10 minutes
  this.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000;

  return otp;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
