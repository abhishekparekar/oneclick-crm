const tempPasswordFromPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  let base = digits.slice(-10);
  if (base.length >= 6) {
    return base;
  }
  const padded = (base + "0000000000").slice(0, 6);
  return padded.length >= 6 ? padded : "Emp000000";
};

module.exports = tempPasswordFromPhone;
