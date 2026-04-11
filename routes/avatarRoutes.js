const express = require("express");
const router = express.Router();
const { uploadAvatar, deleteAvatar } = require("../controllers/avatarController");
const avatarUpload = require("../middleware/avatarUploadMiddleware");

// POST   /api/avatar/:walletAddress   → upload/replace avatar image
router.post("/:walletAddress", avatarUpload.single("avatar"), uploadAvatar);

// DELETE /api/avatar/:walletAddress   → remove avatar
router.delete("/:walletAddress", deleteAvatar);

module.exports = router;
