const asyncHandler = require("express-async-handler");
const path = require("path");
const fs = require("fs");

/**
 * @desc    Upload an NFT image to the server
 * @route   POST /api/upload
 * @access  Public
 *
 * Accepts a multipart/form-data request with a single file field named "image".
 * Returns the public URL that should be saved as imageUrl when creating the NFT.
 *
 * Example response:
 * {
 *   "success": true,
 *   "message": "Image uploaded successfully",
 *   "data": {
 *     "imageUrl": "https://your-server.com/uploads/1712345678-123456.jpg",
 *     "filename": "1712345678-123456.jpg"
 *   }
 * }
 */
const uploadImage = asyncHandler(async (req, res) => {
  // multer puts file info on req.file after the uploadMiddleware runs
  if (!req.file) {
    res.status(400);
    throw new Error("No image file provided. Send a multipart/form-data request with field name 'image'.");
  }

  // Build the public URL for this uploaded file.
  // BASE_URL must be set in .env (e.g. https://your-render-app.onrender.com)
  // Falls back to localhost for local development.
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: "Image uploaded successfully",
    data: {
      imageUrl,
      filename: req.file.filename,
    },
  });
});

/**
 * @desc    Delete an uploaded image file from the server
 * @route   DELETE /api/upload/:filename
 * @access  Public
 *
 * Useful when a mint fails after upload — lets the app clean up orphaned files.
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // Basic security: reject any path traversal attempts
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    res.status(400);
    throw new Error("Invalid filename.");
  }

  const filePath = path.join(__dirname, "..", "uploads", filename);

  if (!fs.existsSync(filePath)) {
    res.status(404);
    throw new Error(`File not found: ${filename}`);
  }

  fs.unlinkSync(filePath);

  res.status(200).json({
    success: true,
    message: "Image deleted successfully",
    data: { filename },
  });
});

module.exports = { uploadImage, deleteImage };
