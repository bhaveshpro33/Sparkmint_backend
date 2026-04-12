const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ─────────────────────────────────────────────
//  Storage: stream file directly to Cloudinary
//  Folder: sparkmint/nfts
//  Files persist across redeploys (stored in Cloudinary, not on disk)
// ─────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sparkmint/nfts",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
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
