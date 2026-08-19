const User = require("../models/User");

// @desc    Update profile image
// @route   PUT /api/users/:userId/profile-image
// @access  Private (Currently we just check user exists, auth middleware can be added)
const updateProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { profileImage } = req.body;

    if (!profileImage) {
      return res.status(400).json({
        success: false,
        message: "Profile image URL is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Optional: add authorization check here to ensure req.user.id === userId if authMiddleware is used.
    
    if (user.profileImage === profileImage) {
      console.log("NO CHANGES DETECTED: updateProfileImage");
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
        },
      });
    }

    user.profileImage = profileImage;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("[User] Update profile image error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error: Could not update profile image",
    });
  }
};

module.exports = {
  updateProfileImage,
};
