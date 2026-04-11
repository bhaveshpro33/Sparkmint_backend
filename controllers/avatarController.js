const asyncHandler = require("express-async-handler");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { normalizeWallet, successResponse } = require("../utils/helpers");

/**
 * @desc    Upload a user avatar image
 * @route   POST /api/avatar/:walletAddress
 * @access  Public
 *
 * Accepts multipart/form-data with field name "avatar".
 * Saves the file to /uploads/avatars/ and updates the user's avatar field.
 *
 * Example response:
 * {
 *   "success": true,
 *   "message": "Avatar uploaded successfully",
 *   "data": {
 *     "avatarUrl": "https://your-server.com/uploads/avatars/0xabc...-1712345678.jpg",
 *     "user": { ...updatedUser }
 *   }
 * }
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file provided. Send a multipart/form-data request with field name 'avatar'.");
  }

  const wallet = normalizeWallet(req.params.walletAddress);

  const user = await User.findOne({ walletAddress: wallet });
  if (!user) {
    res.status(404);
    throw new Error(`No user found with wallet address: ${wallet}`);
  }

  // Delete old avatar file if it's a local file (not an external URL)
  if (user.avatar && user.avatar.includes("/uploads/avatars/")) {
    const oldFilename = path.basename(user.avatar);
    const oldPath = path.join(__dirname, "..", "uploads", "avatars", oldFilename);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  // Build the public URL
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;

  // Update user record
  const updatedUser = await User.findOneAndUpdate(
    { walletAddress: wallet },
    { $set: { avatar: avatarUrl } },
    { new: true }
  );

  res.status(200).json(
    successResponse("Avatar uploaded successfully", {
      avatarUrl,
      filename: req.file.filename,
      user: updatedUser,
    })
  );
});

/**
 * @desc    Delete a user's avatar
 * @route   DELETE /api/avatar/:walletAddress
 * @access  Public
 */
const deleteAvatar = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);

  const user = await User.findOne({ walletAddress: wallet });
  if (!user) {
    res.status(404);
    throw new Error(`No user found with wallet address: ${wallet}`);
  }

  if (!user.avatar) {
    res.status(400);
    throw new Error("User has no avatar to delete");
  }

  // Delete local file if stored locally
  if (user.avatar.includes("/uploads/avatars/")) {
    const filename = path.basename(user.avatar);
    const filePath = path.join(__dirname, "..", "uploads", "avatars", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  const updatedUser = await User.findOneAndUpdate(
    { walletAddress: wallet },
    { $set: { avatar: "" } },
    { new: true }
  );

  res.status(200).json(
    successResponse("Avatar deleted successfully", { user: updatedUser })
  );
});

module.exports = { uploadAvatar, deleteAvatar };
