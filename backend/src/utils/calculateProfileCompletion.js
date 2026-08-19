function calculateProfileCompletion(employee) {
  if (!employee) return { isCompleted: false, percentage: 0 };

  const requiredFields = [
    { value: employee.photo, label: "photo" },
    { value: employee.gender, label: "gender" },
    { value: employee.dateOfBirth, label: "dateOfBirth" },
    { value: employee.currentAddress?.addressLine1, label: "currentAddress.addressLine1" },
    { value: employee.currentAddress?.city, label: "currentAddress.city" },
    { value: employee.currentAddress?.state, label: "currentAddress.state" },
    { value: employee.currentAddress?.pincode, label: "currentAddress.pincode" },
    { value: employee.emergencyContact?.name, label: "emergencyContact.name" },
    { value: employee.emergencyContact?.phone, label: "emergencyContact.phone" },
    { value: employee.aadhaarNumber, label: "aadhaarNumber" },
    { value: employee.panNumber, label: "panNumber" },
    { value: employee.bankDetails?.bankName, label: "bankDetails.bankName" },
    { value: employee.bankDetails?.accountHolderName, label: "bankDetails.accountHolderName" },
    { value: employee.bankDetails?.accountNumber, label: "bankDetails.accountNumber" },
    { value: employee.bankDetails?.ifscCode, label: "bankDetails.ifscCode" },
  ];

  let filledCount = 0;
  requiredFields.forEach((field) => {
    if (field.value !== undefined && field.value !== null && field.value.toString().trim() !== "") {
      // additional validation checks
      if (field.label === "gender" && (field.value === "prefer_not_say" || field.value === "")) {
        return; // not filled valid choice
      }
      filledCount++;
    }
  });

  const percentage = Math.round((filledCount / requiredFields.length) * 100);
  const isCompleted = filledCount === requiredFields.length;

  return {
    isCompleted,
    percentage,
  };
}

module.exports = calculateProfileCompletion;
