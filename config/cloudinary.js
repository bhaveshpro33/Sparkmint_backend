const cloudinary = require("cloudinary").v2;

// ─────────────────────────────────────────────
//  Cloudinary configuration
//  Set these three vars in your Railway environment:
//    CLOUDINARY_CLOUD_NAME
//    CLOUDINARY_API_KEY
//    CLOUDINARY_API_SECRET
// ─────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true, // always use https URLs
});

module.exports = cloudinary;
