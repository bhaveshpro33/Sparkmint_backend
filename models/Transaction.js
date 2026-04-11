const mongoose = require("mongoose");

/**
 * Transaction Schema
 *
 * Records every buy/sell event for an NFT.
 * Mirrors NFTSold events emitted by the SparkMint contract.
 */
const transactionSchema = new mongoose.Schema(
  {
    // MongoDB NFT _id (off-chain reference)
    nftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NFT",
      required: true,
    },

    // On-chain token ID (uint256 as string)
    tokenId: {
      type: String,
      required: true,
    },

    // Seller wallet address
    sellerWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Buyer wallet address
    buyerWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // Sale price in ETH (number for display)
    priceEth: {
      type: Number,
      required: true,
      min: 0,
    },

    // Sale price in wei (string for precision)
    priceWei: {
      type: String,
      default: "0",
    },

    // Blockchain transaction hash
    txHash: {
      type: String,
      required: true,
    },

    // Block number when sale occurred
    blockNumber: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ tokenId: 1 });
transactionSchema.index({ sellerWallet: 1 });
transactionSchema.index({ buyerWallet: 1 });
transactionSchema.index({ nftId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
