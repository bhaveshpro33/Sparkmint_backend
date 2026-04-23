const mongoose = require("mongoose");

/**
 * NFT Schema
 *
 * OFF-CHAIN metadata for SparkMint NFTs.
 * Blockchain ownership/access lives in smart contracts.
 * This model is used for app display, search, profile data, and marketplace listing info.
 */
const nftSchema = new mongoose.Schema(
  {
    // Human-readable title
    title: {
      type: String,
      required: [true, "NFT title is required"],
      trim: true,
    },

    // Optional description
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // NFT image URL
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },

    // Original creator wallet
    creatorWallet: {
      type: String,
      required: [true, "Creator wallet address is required"],
      lowercase: true,
      trim: true,
    },

    // Current owner wallet
    ownerWallet: {
      type: String,
      required: [true, "Owner wallet address is required"],
      lowercase: true,
      trim: true,
    },

    // On-chain token ID
    tokenId: {
      type: String,
      default: null,
    },

    // 0 = FREE, 1 = SUBSCRIBER_ONLY
    accessType: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },

    // Marketplace/listing price only
    // This is NOT used for FREE/VIP access logic
    price: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },

    // Category tag
    category: {
      type: String,
      trim: true,
      lowercase: true,
      default: "art",
    },

    // Mint tx hash
    txHash: {
      type: String,
      default: null,
    },

    // Listed on marketplace?
    isListed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Common query indexes
nftSchema.index({ ownerWallet: 1 });
nftSchema.index({ creatorWallet: 1 });
nftSchema.index({ category: 1 });
nftSchema.index({ accessType: 1 });
nftSchema.index({ isListed: 1 });

module.exports = mongoose.model("NFT", nftSchema);