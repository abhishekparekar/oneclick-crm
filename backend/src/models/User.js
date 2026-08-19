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

const User = mongoose.model("User", userSchema);

module.exports = User;
