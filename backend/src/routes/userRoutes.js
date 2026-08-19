const express = require("express");
const { updateProfileImage } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Update user's profile image
router.put("/:userId/profile-image", protect, updateProfileImage);

module.exports = router;
