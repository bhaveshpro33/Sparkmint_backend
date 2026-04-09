const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─────────────────────────────────────────────
//  Ensure uploads directory exists at startup
// ─────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
//  Storage: save file to /uploads with a unique name
//  Format: <timestamp>-<original-filename>
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

// ─────────────────────────────────────────────
//  File filter: only allow image types
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
//  Multer instance — 10 MB size limit
// ─────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;
