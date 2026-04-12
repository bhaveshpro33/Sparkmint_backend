const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");

/**
 * @desc    Upload an NFT image to Cloudinary
 * @route   POST /api/upload
 * @access  Public
 *
 * Accepts multipart/form-data with field name "image".
 * multer-storage-cloudinary streams the file directly to Cloudinary —
 * nothing is written to disk, so images survive redeploys.
 *
 * Example response:
 * {
 *   "success": true,
 *   "message": "Image uploaded successfully",
 *   "data": {
 *     "imageUrl": "https://res.cloudinary.com/.../sparkmint/nfts/abc123.jpg",
 *     "publicId": "sparkmint/nfts/abc123"
 *   }
 * }
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file provided. Send a multipart/form-data request with field name 'image'.");
  }

  // multer-storage-cloudinary sets req.file.path = secure Cloudinary URL
  // and req.file.filename = Cloudinary public_id
  res.status(201).json({
    success: true,
    message: "Image uploaded successfully",
    data: {
      imageUrl: req.file.path,
      publicId: req.file.filename,
    },
  });
});

/**
 * @desc    Delete an uploaded NFT image from Cloudinary
 * @route   DELETE /api/upload/:publicId
 * @access  Public
 *
 * :publicId is the Cloudinary public_id (URL-encoded if it contains slashes).
 * Useful when a mint fails after upload — cleans up orphaned images.
 */
const deleteImage = asyncHandler(async (req, res) => {
  // publicId may contain slashes (e.g. "sparkmint/nfts/abc123")
  // Express wildcard or encoded param — decode it
  const publicId = decodeURIComponent(req.params.publicId);

  if (!publicId || publicId.includes("..")) {
    res.status(400);
    throw new Error("Invalid publicId.");
  }

  const result = await cloudinary.uploader.destroy(publicId);

  if (result.result !== "ok" && result.result !== "not found") {
    res.status(500);
    throw new Error(`Cloudinary deletion failed: ${result.result}`);
  }

  res.status(200).json({
    success: true,
    message: "Image deleted successfully",
    data: { publicId },
  });
});

module.exports = { uploadImage, deleteImage };
