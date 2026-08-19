const requireCompany = (req, res, next) => {
  // Support both current schema (companyId) and legacy schema (company_id)
  const companyId = req.user?.companyId || req.user?.company_id;

  if (!companyId) {
    return res.status(403).json({
      message: "No company associated with this account",
    });
  }

  // Always set req.companyId from whichever field exists
  req.companyId = companyId;
  next();
};

module.exports = { requireCompany };
