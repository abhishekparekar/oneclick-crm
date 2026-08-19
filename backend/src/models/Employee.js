const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  addressLine1: { type: String, trim: true, default: "" },
  addressLine2: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  pincode: { type: String, trim: true, default: "" },
  country: { type: String, trim: true, default: "" },
}, { _id: false });

const permanentAddressSchema = new mongoose.Schema({
  sameAsCurrent: { type: Boolean, default: false },
  addressLine1: { type: String, trim: true, default: "" },
  addressLine2: { type: String, trim: true, default: "" },
  city: { type: String, trim: true, default: "" },
  state: { type: String, trim: true, default: "" },
  pincode: { type: String, trim: true, default: "" },
  country: { type: String, trim: true, default: "" },
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: "" },
  relationship: { type: String, trim: true, default: "" },
  phone: { type: String, trim: true, default: "" },
  alternatePhone: { type: String, trim: true, default: "" },
}, { _id: false });

const bankDetailsSchema = new mongoose.Schema({
  bankName: { type: String, trim: true, default: "" },
  accountHolderName: { type: String, trim: true, default: "" },
  accountNumber: { type: String, trim: true, default: "" },
  ifscCode: { type: String, trim: true, default: "" },
  branchName: { type: String, trim: true, default: "" },
  upiId: { type: String, trim: true, default: "" },
}, { _id: false });

const educationSchema = new mongoose.Schema({
  qualification: { type: String, trim: true, default: "" },
  institute: { type: String, trim: true, default: "" },
  university: { type: String, trim: true, default: "" },
  passingYear: { type: Number, default: null },
  percentageOrCGPA: { type: String, trim: true, default: "" },
}, { _id: false });

const experienceSchema = new mongoose.Schema({
  companyName: { type: String, trim: true, default: "" },
  designation: { type: String, trim: true, default: "" },
  fromDate: { type: Date, default: null },
  toDate: { type: Date, default: null },
  totalExperience: { type: String, trim: true, default: "" },
  reasonForLeaving: { type: String, trim: true, default: "" },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  aadhaarFront: { type: String, trim: true, default: "" },
  aadhaarBack: { type: String, trim: true, default: "" },
  panCard: { type: String, trim: true, default: "" },
  resume: { type: String, trim: true, default: "" },
  photo: { type: String, trim: true, default: "" },
  offerLetter: { type: String, trim: true, default: "" },
  joiningLetter: { type: String, trim: true, default: "" },
  salarySlipPrevious: { type: String, trim: true, default: "" },
  customDocuments: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String }
  }]
}, { _id: false });

const employeeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },
    // Basic Employment
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    alternateMobile: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      default: "Employee",
    },
    managerAccessLevel: {
      type: String,
      enum: ["team", "department"],
      default: "team",
    },
    accessibleDepartments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    shiftStartTime: {
      type: String,
      default: "",
    },
    shiftEndTime: {
      type: String,
      default: "",
    },
    departmentName: {
      type: String,
      trim: true,
      default: "",
    },
    // Multiple departments support
    departmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
    },
    designationName: {
      type: String,
      trim: true,
      default: "",
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    branchName: {
      type: String,
      trim: true,
      default: "",
    },
    joiningDate: {
      type: Date,
      default: null,
    },
    confirmationDate: {
      type: Date,
      default: null,
    },
    noticePeriod: {
      type: String,
      trim: true,
      default: "",
    },
    employmentType: {
      type: String,
      default: "full-time",
    },
    workMode: {
      type: String,
      enum: ["office", "remote", "hybrid"],
      default: "office",
    },
    allowRemotePunch: {
      type: Boolean,
      default: false,
    },
    reportingManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    reportingManagerName: {
      type: String,
      trim: true,
      default: "",
    },
    salaryDetails: {
      type: new mongoose.Schema({
        ctc: { type: Number, default: null },
        basic: { type: Number, default: null },
        hra: { type: Number, default: null },
        specialAllowance: { type: Number, default: null },
        pf: { type: Number, default: null },
        esi: { type: Number, default: null },
        tds: { type: Number, default: null },
      }, { _id: false }),
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
    },

    // Profile
    photo: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_say", ""],
      default: "",
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: "",
    },
    maritalStatus: {
      type: String,
      trim: true,
      default: "",
    },
    personalEmail: {
      type: String,
      trim: true,
      default: "",
    },

    // Address
    currentAddress: {
      type: addressSchema,
      default: () => ({}),
    },
    permanentAddress: {
      type: permanentAddressSchema,
      default: () => ({}),
    },

    // Emergency Contact
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },

    // Identity
    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },
    panNumber: {
      type: String,
      trim: true,
      default: "",
    },

    // Bank
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },

    // Education & Experience Arrays
    educationDetails: {
      type: [educationSchema],
      default: [],
    },
    experienceDetails: {
      type: [experienceSchema],
      default: [],
    },
    skills: {
      type: [String],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },

    // Documents
    documents: {
      type: documentSchema,
      default: () => ({}),
    },

    // Profile Status
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    profileCompletionStatus: {
      type: String,
      enum: ["pending", "draft", "completed", "rejected"],
      default: "pending",
    },
    profileCompletionPercentage: {
      type: Number,
      default: 0,
    },
    profileLastUpdatedAt: {
      type: Date,
      default: null,
    },
    profileApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    profileApprovedAt: {
      type: Date,
      default: null,
    },
    profileRejectReason: {
      type: String,
      trim: true,
      default: "",
    },

    // Timestamps / CreatedBy
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

employeeSchema.pre("save", async function (next) {
  if (this.firstName || this.lastName) {
    this.fullName = `${this.firstName || ""} ${this.lastName || ""}`.trim();
  }
  if (this.isModified("reportingManagerId")) {
    if (this.reportingManagerId) {
      try {
        const EmployeeModel = this.constructor;
        const manager = await EmployeeModel.findById(this.reportingManagerId);
        this.reportingManagerName = manager ? `${manager.firstName || ""} ${manager.lastName || ""}`.trim() : "";
      } catch (err) {
        console.error("Error setting reportingManagerName in pre-save hook:", err);
      }
    } else {
      this.reportingManagerName = "";
    }
  }
  if (typeof next === "function") {
    next();
  }
});


employeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
employeeSchema.index({ status: 1, shiftStartTime: 1 }); // Ultra-fast querying for the Cron Job

employeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, departmentId: 1, status: 1 });

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
