const Department = require("../models/Department");

const findCompanyResource = async (Model, id, companyId) => {
  return Model.findOne({ _id: id, companyId });
};

const validateDepartmentBelongsToCompany = async (departmentId, companyId) => {
  const department = await Department.findOne({ _id: departmentId, companyId });
  if (!department) {
    return null;
  }
  return department;
};

module.exports = {
  findCompanyResource,
  validateDepartmentBelongsToCompany,
};
