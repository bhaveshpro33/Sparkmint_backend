const mongoose = require("mongoose");

/**
 * Subscription Schema
 *
 * Mirrors on-chain subscription state (CreatorSubscription contract) in MongoDB.
 * This cache lets the app query subscription status without an RPC call every time.
 * It is updated when subscribe/unsubscribe actions are relayed by the backend.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    // The wallet that subscribed
    subscriberWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // The creator wallet being subscribed to
    creatorWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // On-chain subscription expiry timestamp (ms)
    expiresAt: {
      type: Date,
      default: null,
    },

    // Whether subscription is currently active (cached flag)
    isActive: {
      type: Boolean,
      default: true,
    },

    // Blockchain transaction hash of the subscribe tx
    txHash: {
      type: String,
      default: null,
    },

    // Monthly price in wei (string for large uint256)
    priceWei: {
      type: String,
      default: "0",
    },
  },
  { timestamps: true }
);

// One subscription record per (subscriber, creator) pair
subscriptionSchema.index(
  { subscriberWallet: 1, creatorWallet: 1 },
  { unique: true }
);
subscriptionSchema.index({ subscriberWallet: 1 });
subscriptionSchema.index({ creatorWallet: 1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
