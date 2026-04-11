const mongoose = require("mongoose");

/**
 * Follow Schema
 *
 * Tracks who follows whom.
 * followerWallet  → the user who is following
 * followingWallet → the creator being followed
 */
const followSchema = new mongoose.Schema(
  {
    followerWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    followingWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Composite unique index: one user can only follow a creator once
followSchema.index({ followerWallet: 1, followingWallet: 1 }, { unique: true });

// Indexes for fast lookups
followSchema.index({ followerWallet: 1 });
followSchema.index({ followingWallet: 1 });

module.exports = mongoose.model("Follow", followSchema);
