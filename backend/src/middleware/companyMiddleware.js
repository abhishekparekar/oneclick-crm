const requireCompany = (req, res, next) => {
  // Support current schema (companyId), legacy schema (company_id)
  let companyId = req.user?.companyId || req.user?.company_id;

  // For system admins (SuperAdmin/SubSuperAdmin), allow contextual companyId from header/query/body
  const role = (req.user?.role || "").toLowerCase();
  if (!companyId && (role === "superadmin" || role === "subsuperadmin" || role === "sub-superadmin")) {
    companyId = req.query?.companyId || req.headers?.["x-company-id"] || req.body?.companyId || null;
  }

  if (!companyId) {
    return res.status(403).json({
      success: false,
      message: "No company associated with this account or request",
    });
  }

  // Always set req.companyId and req.company._id for full compatibility
  req.companyId = companyId;
  if (!req.company) {
    req.company = { _id: companyId };
  }
  next();
};

module.exports = { requireCompany };
