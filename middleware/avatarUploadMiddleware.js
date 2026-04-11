const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────
//  Ensure avatars subdirectory exists at startup
// ─────────────────────────────────────────────
const AVATAR_DIR = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
//  Storage: save avatar to /uploads/avatars/
//  Format: <walletAddress>-<timestamp>.<ext>
//  Using wallet address in the filename makes it
//  easy to identify whose avatar this is on disk.
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const wallet = (req.params.walletAddress || "unknown").toLowerCase();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${wallet}-${timestamp}${ext}`);
  },
});

// ─────────────────────────────────────────────
//  File filter: images only
// ─────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, png, gif, webp)"), false);
  }
};

// ─────────────────────────────────────────────
//  Multer instance — 5 MB limit for avatars
// ─────────────────────────────────────────────
const avatarUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = avatarUpload;
