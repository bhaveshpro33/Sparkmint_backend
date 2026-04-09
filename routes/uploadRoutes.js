const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const { uploadImage, deleteImage } = require("../controllers/uploadController");

// ─────────────────────────────────────────────
//  Upload Routes
//  Base path: /api/upload  (mounted in app.js)
// ─────────────────────────────────────────────

// POST /api/upload
// Body: multipart/form-data with field "image"
// Returns: { success, message, data: { imageUrl, filename } }
router.post("/", upload.single("image"), uploadImage);

// DELETE /api/upload/:filename
// Deletes a previously uploaded file — call this if mint fails after upload
router.delete("/:filename", deleteImage);

module.exports = router;
