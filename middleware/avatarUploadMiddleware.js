const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ─────────────────────────────────────────────
//  Storage: stream avatar directly to Cloudinary
//  Folder: sparkmint/avatars
//  public_id: wallet address so each user has one
//  canonical avatar that overwrites on re-upload
// ─────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, _file) => ({
    folder: "sparkmint/avatars",
    public_id: (req.params.walletAddress || "unknown").toLowerCase(),
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    overwrite: true,
    transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  }),
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
