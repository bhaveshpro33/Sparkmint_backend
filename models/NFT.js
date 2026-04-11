const mongoose = require("mongoose");

/**
 * NFT Schema
 *
 * Stores OFF-CHAIN metadata for NFTs minted on the SparkMint platform.
 * This does NOT handle blockchain ownership – that lives in smart contracts.
 * This model is purely for app display, search, and profile data.
 */
const nftSchema = new mongoose.Schema(
  {
    // Human-readable title of the NFT
    title: {
      type: String,
      required: [true, "NFT title is required"],
      trim: true,
    },

    // Optional description of the NFT artwork or content
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // URL pointing to the NFT image (IPFS hash, CDN URL, etc.)
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },

    // Wallet address of the original creator – normalized to lowercase
    creatorWallet: {
      type: String,
      required: [true, "Creator wallet address is required"],
      lowercase: true,
      trim: true,
    },

    // Wallet address of the current owner – normalized to lowercase
    // Initially same as creatorWallet; updated when NFT is transferred
    ownerWallet: {
      type: String,
      required: [true, "Owner wallet address is required"],
      lowercase: true,
      trim: true,
    },

    // Token ID from the blockchain (string to support large uint256 values)
    tokenId: {
      type: String,
      default: null,
    },

    // Listing price in the platform's currency (e.g. ETH, MATIC)
    price: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },

    // Category tag for filtering (art, music, gaming, photography, etc.)
    category: {
      type: String,
      trim: true,
      lowercase: true,
      default: "art",
    },

    // Transaction hash from the mint transaction on the blockchain
    txHash: {
      type: String,
      default: null,
    },

    // Whether this NFT is currently listed for sale on the marketplace
    isListed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index commonly queried fields for faster lookups
nftSchema.index({ ownerWallet: 1 });
nftSchema.index({ creatorWallet: 1 });
nftSchema.index({ category: 1 });

module.exports = mongoose.model("NFT", nftSchema);
