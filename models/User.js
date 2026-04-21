const mongoose = require("mongoose");

/**
 * User Schema
 *
 * Stores off-chain profile data for SparkMint users.
 * The walletAddress is the primary identifier – no auth token needed
 * at this stage; Flutter will send the wallet address from the connected wallet.
 */
const userSchema = new mongoose.Schema(
  {
    // Display name chosen by the user
    name: {
      type: String,
      trim: true,
      default: "",
    },

    // Optional email – not required for wallet-first apps
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    // Blockchain wallet address – normalized to lowercase for consistency
    walletAddress: {
      type: String,
      required: [true, "Wallet address is required"],
      unique: true,
      trim: true,
      lowercase: true, // always store as lowercase
    },
// Add this field inside userSchema
subscriptionPriceEth: {
  type: Number,
  default: 0,
},
    // Short bio shown on the creator profile page
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },

    // URL to profile avatar image (stored off-chain, e.g. IPFS or CDN)
    avatar: {
      type: String,
      default: "",
    },

    // Whether this user has creator privileges (can mint NFTs)
    isCreator: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
