const generateTempPassword = (length = 10) => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

module.exports = generateTempPassword;
