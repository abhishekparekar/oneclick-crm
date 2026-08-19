const Employee = require("../models/Employee");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const calculateProfileCompletion = require("../utils/calculateProfileCompletion");

// Masking Helpers
const maskAadhaar = (num) => {
  if (!num) return "";
  const clean = num.toString().replace(/\s/g, "");
  if (clean.length < 4) return clean;
  return `XXXX XXXX ${clean.slice(-4)}`;
};

const maskPan = (num) => {
  if (!num) return "";
  const clean = num.toString().trim().toUpperCase();
  if (clean.length < 4) return clean;
  return `XXXXXX${clean.slice(-4)}`;
};

const maskBankAccount = (num) => {
  if (!num) return "";
  const clean = num.toString().trim();
  if (clean.length < 4) return clean;
  return `******${clean.slice(-4)}`;
};

const populateOptions = [
  { path: "departmentId", select: "name" },
  { path: "designationId", select: "name" },
  { path: "branchId", select: "branchName" },
  { path: "reportingManagerId", select: "firstName lastName employeeCode fullName" }
];

// Helper to assign permitted fields safely including dateOfBirth parsing
const assignPermittedFields = (employee, body) => {
  const permitted = [
    "photo", "gender", "bloodGroup", "maritalStatus", "personalEmail",
    "currentAddress", "permanentAddress", "emergencyContact", "bankDetails",
    "educationDetails", "experienceDetails", "aadhaarNumber", "panNumber", "documents"
  ];

  permitted.forEach((field) => {
    if (body[field] !== undefined) {
      employee[field] = body[field];
    }
  });

  if (body.dateOfBirth !== undefined) {
    let dobVal = body.dateOfBirth;
    if (dobVal) {
      let dob = new Date(dobVal);
      if (isNaN(dob.getTime())) {
        const parts = dobVal.toString().split("/");
        if (parts.length === 3) {
          dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
      employee.dateOfBirth = isNaN(dob.getTime()) ? null : dob;
    } else {
      employee.dateOfBirth = null;
    }
  }
};

// Resolves and returns employee for active user
const resolveEmployee = async (req) => {
  const userId = req.user._id;
  const companyId = req.companyId;
  let employee = null;

  if (req.user.employeeId) {
    employee = await Employee.findOne({ _id: req.user.employeeId, companyId }).populate(populateOptions);
  }
  if (!employee) {
    employee = await Employee.findOne({ userId, companyId }).populate(populateOptions);
  }
  if (!employee && req.user.email) {
    employee = await Employee.findOne({ email: req.user.email, companyId }).populate(populateOptions);
  }
  return employee;
};

// GET /api/employee/my-profile
const getMyProfile = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(200).json({
        success: true,
        employee: {
          firstName: req.user?.name?.split(" ")[0] || req.user?.name || "User",
          lastName: req.user?.name?.split(" ").slice(1).join(" ") || "",
          email: req.user?.email || "",
          role: req.user?.role || "Employee",
          photo: req.user?.profileImage || "",
          documents: {}
        }
      });
    }

    const employeeObj = employee.toObject();

    // Mask sensitive fields
    if (employeeObj.aadhaarNumber) {
      employeeObj.aadhaarNumber = maskAadhaar(employeeObj.aadhaarNumber);
    }
    if (employeeObj.panNumber) {
      employeeObj.panNumber = maskPan(employeeObj.panNumber);
    }
    if (employeeObj.bankDetails && employeeObj.bankDetails.accountNumber) {
      employeeObj.bankDetails.accountNumber = maskBankAccount(employeeObj.bankDetails.accountNumber);
    }

    res.json({ success: true, employee: employeeObj });
  } catch (error) {
    console.error("[getMyProfile] error:", error.message);
    res.status(200).json({
      success: true,
      employee: {
        firstName: req.user?.name?.split(" ")[0] || "User",
        lastName: req.user?.name?.split(" ").slice(1).join(" ") || "",
        email: req.user?.email || "",
        role: req.user?.role || "Employee",
        photo: req.user?.profileImage || "",
        documents: {}
      }
    });
  }
};

// GET /api/employee/my-profile/edit
const getMyProfileForEdit = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(200).json({
        success: true,
        employee: {
          firstName: req.user.name?.split(" ")[0] || req.user.name || "User",
          lastName: req.user.name?.split(" ").slice(1).join(" ") || "",
          email: req.user.email,
          role: req.user.role,
          photo: req.user.profileImage || ""
        }
      });
    }

    res.json({ success: true, employee });
  } catch (error) {
    next(error);
  }
};

// Common validations
const validateProfileData = (data) => {
  const errors = [];

  if (data.aadhaarNumber) {
    const aadhaarClean = data.aadhaarNumber.toString().replace(/\s/g, "");
    if (!/^\d{12}$/.test(aadhaarClean)) {
      errors.push("Aadhaar Number must be exactly 12 digits");
    }
  }

  if (data.panNumber) {
    const panClean = data.panNumber.toString().trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panClean)) {
      errors.push("PAN Number must match valid Indian PAN format (e.g. ABCDE1234F)");
    }
  }

  if (data.phone) {
    let phoneClean = data.phone.toString().replace(/\D/g, "");
    if (phoneClean.length === 12 && phoneClean.startsWith("91")) {
      phoneClean = phoneClean.slice(2);
    }
    if (phoneClean.length === 11 && phoneClean.startsWith("0")) {
      phoneClean = phoneClean.slice(1);
    }
    data.phone = phoneClean;
    if (!/^\d{10}$/.test(phoneClean)) {
      errors.push("Phone number must be exactly 10 digits");
    }
  }

  if (data.emergencyContact && data.emergencyContact.phone) {
    let phoneClean = data.emergencyContact.phone.toString().replace(/\D/g, "");
    if (phoneClean.length === 12 && phoneClean.startsWith("91")) {
      phoneClean = phoneClean.slice(2);
    }
    if (phoneClean.length === 11 && phoneClean.startsWith("0")) {
      phoneClean = phoneClean.slice(1);
    }
    data.emergencyContact.phone = phoneClean;
    if (!/^\d{10}$/.test(phoneClean)) {
      errors.push("Emergency phone number must be exactly 10 digits");
    }
  }

  if (data.bankDetails && data.bankDetails.ifscCode) {
    const ifscClean = data.bankDetails.ifscCode.toString().trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscClean)) {
      errors.push("IFSC Code must match standard bank format (e.g. SBIN0001234)");
    }
  }

  if (data.currentAddress && data.currentAddress.pincode) {
    const pinClean = data.currentAddress.pincode.toString().trim();
    if (!/^\d{6}$/.test(pinClean)) {
      errors.push("Current address pincode must be exactly 6 digits");
    }
  }

  if (data.permanentAddress && data.permanentAddress.pincode && !data.permanentAddress.sameAsCurrent) {
    const pinClean = data.permanentAddress.pincode.toString().trim();
    if (!/^\d{6}$/.test(pinClean)) {
      errors.push("Permanent address pincode must be exactly 6 digits");
    }
  }

  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.push("Invalid date of birth provided");
    } else if (dob >= new Date()) {
      errors.push("Date of birth cannot be in the future");
    }
  }

  return errors;
};

// PUT /api/employee/profile-draft
const saveProfileDraft = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    assignPermittedFields(employee, req.body);

    // Recompute completion status
    const compResult = calculateProfileCompletion(employee);
    employee.profileCompletionPercentage = compResult.percentage;
    employee.profileCompletionStatus = "draft";
    employee.profileLastUpdatedAt = new Date();

    if (compResult.isCompleted) {
      employee.isProfileCompleted = true;
      employee.profileCompletionStatus = "completed";
    } else {
      employee.isProfileCompleted = false;
    }

    await employee.save();
    res.json({ success: true, message: "Draft details saved successfully", employee });
  } catch (error) {
    next(error);
  }
};

// PUT /api/employee/complete-profile
const completeProfile = async (req, res, next) => {
  try {
    const employee = await resolveEmployee(req);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    assignPermittedFields(employee, req.body);

    // Validations
    const errors = validateProfileData(employee);

    // Required fields check for 100% completion
    const required = [
      { key: employee.photo, label: "Profile Photo" },
      { key: employee.gender, label: "Gender" },
      { key: employee.dateOfBirth, label: "Date of Birth" },
      { key: employee.currentAddress?.addressLine1, label: "Current Address Line 1" },
      { key: employee.currentAddress?.city, label: "Current Address City" },
      { key: employee.currentAddress?.state, label: "Current Address State" },
      { key: employee.currentAddress?.pincode, label: "Current Address Pincode" },
      { key: employee.emergencyContact?.name, label: "Emergency Contact Name" },
      { key: employee.emergencyContact?.phone, label: "Emergency Contact Phone" },
      { key: employee.aadhaarNumber, label: "Aadhaar Number" },
      { key: employee.panNumber, label: "PAN Number" },
      { key: employee.bankDetails?.bankName, label: "Bank Name" },
      { key: employee.bankDetails?.accountHolderName, label: "Account Holder Name" },
      { key: employee.bankDetails?.accountNumber, label: "Bank Account Number" },
      { key: employee.bankDetails?.ifscCode, label: "IFSC Code" }
    ];

    required.forEach((r) => {
      if (!r.key || r.key.toString().trim() === "") {
        errors.push(`${r.label} is required for profile completion`);
      } else if (r.label === "Gender" && (r.key === "prefer_not_say" || r.key === "")) {
        errors.push("Please select a valid Gender (Male, Female, or Other)");
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const compResult = calculateProfileCompletion(employee);
    employee.profileCompletionPercentage = compResult.percentage;

    if (!compResult.isCompleted) {
      return res.status(400).json({
        success: false,
        message: `Profile is only ${compResult.percentage}% complete. All required fields are mandatory.`,
      });
    }

    employee.isProfileCompleted = true;
    employee.profileCompletionStatus = "completed";
    employee.profileLastUpdatedAt = new Date();

    await employee.save();

    // Create audit log
    await AuditLog.create({
      companyId: req.companyId,
      performedBy: req.user._id,
      action: "PROFILE_COMPLETED",
      module: "employee",
      details: `Employee ${employee.employeeCode} successfully completed profile.`,
    });

    res.json({ success: true, message: "Profile successfully completed!", employee });
  } catch (error) {
    next(error);
  }
};

// PUT /api/employee/update-profile
const updateProfile = async (req, res, next) => {
  try {
    let employee = await resolveEmployee(req);
    if (!employee) {
      const nameParts = (req.user.name || "User").split(" ");
      employee = new Employee({
        userId: req.user._id,
        companyId: req.companyId,
        firstName: nameParts[0] || "User",
        lastName: nameParts.slice(1).join(" ") || "",
        email: req.user.email,
        employeeCode: `EMP-${Date.now().toString().slice(-4)}`
      });
      await User.findByIdAndUpdate(req.user._id, { employeeId: employee._id });
    }

    // Validate restricted fields check
    const restricted = [
      "employeeCode", "role", "departmentId", "designationId", "branchId",
      "joiningDate", "employmentType", "salary", "reportingManagerId", "companyId"
    ];

    for (const field of restricted) {
      if (req.body[field] !== undefined) {
        return res.status(400).json({
          success: false,
          message: `Editing ${field} is restricted for employee self-service.`,
        });
      }
    }

    assignPermittedFields(employee, req.body);

    const imgUrl = req.body.photo || req.body.profileImage;
    if (imgUrl) {
      employee.photo = imgUrl;
      await User.findByIdAndUpdate(req.user._id, { profileImage: imgUrl });
    }

    const errors = validateProfileData(employee);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const compResult = calculateProfileCompletion(employee);
    employee.profileCompletionPercentage = compResult.percentage;
    employee.profileLastUpdatedAt = new Date();

    if (compResult.isCompleted) {
      employee.isProfileCompleted = true;
      employee.profileCompletionStatus = "completed";
    } else {
      employee.isProfileCompleted = false;
      employee.profileCompletionStatus = "draft";
    }

    await employee.save();

    await AuditLog.create({
      companyId: req.companyId,
      performedBy: req.user._id,
      action: "PROFILE_UPDATED",
      module: "employee",
      details: `Employee ${employee.employeeCode} updated self-service profile details.`,
    });

    res.json({ success: true, message: "Profile updated successfully!", employee });
  } catch (error) {
    next(error);
  }
};

// PUT /api/employee/change-password
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both old and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// POST /api/employee/documents/upload
const uploadDocument = async (req, res, next) => {
  try {
    let employee = await resolveEmployee(req);
    if (!employee) {
      const nameParts = (req.user.name || "User").split(" ");
      employee = new Employee({
        userId: req.user._id,
        companyId: req.companyId,
        firstName: nameParts[0] || "User",
        lastName: nameParts.slice(1).join(" ") || "",
        email: req.user.email,
        employeeCode: `EMP-${Date.now().toString().slice(-4)}`
      });
      await User.findByIdAndUpdate(req.user._id, { employeeId: employee._id });
    }

    let fileUrl = "";
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    }

    const title = req.body.title || "Document";
    const titleKeyMap = {
      "Offer Letter": "offerLetter",
      "Joining Letter": "joiningLetter",
      "Aadhaar Card (Front)": "aadhaarFront",
      "Aadhaar Card (Back)": "aadhaarBack",
      "PAN Card": "panCard",
      "Previous Salary Slip": "salarySlipPrevious",
      "Resume": "resume",
      "Resume / CV": "resume"
    };

    const docKey = titleKeyMap[title];

    if (!employee.documents) {
      employee.documents = {};
    }

    if (docKey) {
      employee.documents[docKey] = fileUrl;
    } else {
      const customDocs = Array.isArray(employee.documents.customDocuments)
        ? [...employee.documents.customDocuments]
        : [];
      customDocs.push({
        title,
        url: fileUrl,
        uploadedAt: new Date(),
        uploadedBy: req.user.name || "User"
      });
      employee.documents.customDocuments = customDocs;
    }

    employee.markModified("documents");
    await employee.save();

    res.json({
      success: true,
      message: `${title} uploaded successfully!`,
      fileUrl,
      employee
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  getMyProfileForEdit,
  saveProfileDraft,
  completeProfile,
  updateProfile,
  changePassword,
  uploadDocument,
};
