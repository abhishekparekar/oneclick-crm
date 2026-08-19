const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || "oneclick_secret_key_2026";
  return jwt.sign({ id }, secret, {
    expiresIn: "30d",
  });
};

module.exports = generateToken;
