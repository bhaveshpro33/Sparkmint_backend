const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const { normalizeWallet, successResponse } = require("../utils/helpers");

/**
 * @desc    Upload a user avatar image to Cloudinary
 * @route   POST /api/avatar/:walletAddress
 * @access  Public
 *
 * Accepts multipart/form-data with field name "avatar".
 * The avatar middleware uses the wallet address as the Cloudinary public_id,
 * so re-uploading overwrites the previous avatar automatically (no orphaned files).
 * Images survive redeploys because they are stored in Cloudinary, not on disk.
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

  // req.file.path = Cloudinary secure URL (set by multer-storage-cloudinary)
  const avatarUrl = req.file.path;

  const updatedUser = await User.findOneAndUpdate(
    { walletAddress: wallet },
    { $set: { avatar: avatarUrl } },
    { new: true }
  );

  res.status(200).json(
    successResponse("Avatar uploaded successfully", {
      avatarUrl,
      publicId: req.file.filename,
      user: updatedUser,
    })
  );
});

/**
 * @desc    Delete a user's avatar from Cloudinary
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

  // Delete from Cloudinary using the deterministic public_id (wallet address)
  const publicId = `sparkmint/avatars/${wallet}`;
  await cloudinary.uploader.destroy(publicId);

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
