const asyncHandler = require("express-async-handler");
const { ethers } = require("ethers");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { normalizeWallet, successResponse } = require("../utils/helpers");
const {
  verifySignature,
  subscribeForUser,
  unsubscribeForUser,
  getCreatorPrice,
  checkSubscription,
  getSubscriptionTimeLeft,
} = require("../services/relayerService");

// ─────────────────────────────────────────────
//  Helper: build the exact message Flutter signs
// ─────────────────────────────────────────────
const buildSubscribeMessage = ({ subscriberWallet, creatorWallet, action }) =>
  `SparkMint Subscription ${action}\nSubscriber: ${subscriberWallet}\nCreator: ${creatorWallet}`;

/**
 * @desc    Subscribe to a creator (monthly) — relayed on-chain
 * @route   POST /api/subscriptions/subscribe
 * @body    { subscriberWallet, creatorWallet, signature }
 * @access  Public
 */
const subscribe = asyncHandler(async (req, res) => {
  const { subscriberWallet, creatorWallet, signature } = req.body;

  if (!subscriberWallet || !creatorWallet || !signature) {
    res.status(400);
    throw new Error("subscriberWallet, creatorWallet and signature are required");
  }

  const subscriber = normalizeWallet(subscriberWallet);
  const creator = normalizeWallet(creatorWallet);

  // Verify the user actually signed this request
  const message = buildSubscribeMessage({ subscriberWallet: subscriber, creatorWallet: creator, action: "Subscribe" });
  const isValid = verifySignature(message, signature, subscriber);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  // Check the creator is registered on-chain
  const priceWei = await getCreatorPrice(creator);
  if (priceWei === "0") {
    res.status(404);
    throw new Error("Creator not registered for subscriptions on-chain");
  }

  // Relay subscribe tx on-chain (relayer pays gas; sends ETH for subscription)
  const { txHash, expiresAt } = await subscribeForUser({ creatorWallet: creator, priceWei });

  // Update or create the subscription record in MongoDB
  const sub = await Subscription.findOneAndUpdate(
    { subscriberWallet: subscriber, creatorWallet: creator },
    {
      $set: {
        isActive: true,
        expiresAt: new Date(expiresAt * 1000), // convert Unix timestamp → Date
        txHash,
        priceWei,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Mark user as creator in our DB if not already
  await User.findOneAndUpdate(
    { walletAddress: creator },
    { $set: { isCreator: true } },
    { upsert: false }
  );

  res.status(200).json(
    successResponse("Subscribed successfully", {
      subscription: sub,
      txHash,
      expiresAt: new Date(expiresAt * 1000),
    })
  );
});

/**
 * @desc    Unsubscribe from a creator — relayed on-chain
 * @route   POST /api/subscriptions/unsubscribe
 * @body    { subscriberWallet, creatorWallet, signature }
 * @access  Public
 */
const unsubscribe = asyncHandler(async (req, res) => {
  const { subscriberWallet, creatorWallet, signature } = req.body;

  if (!subscriberWallet || !creatorWallet || !signature) {
    res.status(400);
    throw new Error("subscriberWallet, creatorWallet and signature are required");
  }

  const subscriber = normalizeWallet(subscriberWallet);
  const creator = normalizeWallet(creatorWallet);

  const message = buildSubscribeMessage({ subscriberWallet: subscriber, creatorWallet: creator, action: "Unsubscribe" });
  const isValid = verifySignature(message, signature, subscriber);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  // Relay unsubscribe tx on-chain
  const { txHash } = await unsubscribeForUser({ creatorWallet: creator });

  // Update MongoDB record
  await Subscription.findOneAndUpdate(
    { subscriberWallet: subscriber, creatorWallet: creator },
    { $set: { isActive: false, txHash } }
  );

  res.status(200).json(
    successResponse("Unsubscribed successfully", { txHash })
  );
});

/**
 * @desc    Get all active subscriptions for a subscriber wallet
 * @route   GET /api/subscriptions/subscriber/:walletAddress
 * @access  Public
 */
const getSubscriberSubscriptions = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);

  const subs = await Subscription.find({
    subscriberWallet: wallet,
    isActive: true,
  }).sort({ createdAt: -1 });

  // Hydrate creator profiles
  const creatorWallets = subs.map((s) => s.creatorWallet);
  const creators = await User.find({ walletAddress: { $in: creatorWallets } });

  res.status(200).json(
    successResponse(`${subs.length} active subscription(s)`, { subscriptions: subs, creators })
  );
});

/**
 * @desc    Get all subscribers for a creator wallet
 * @route   GET /api/subscriptions/creator/:walletAddress
 * @access  Public
 */
const getCreatorSubscribers = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);

  const subs = await Subscription.find({
    creatorWallet: wallet,
    isActive: true,
  }).sort({ createdAt: -1 });

  const subscriberWallets = subs.map((s) => s.subscriberWallet);
  const users = await User.find({ walletAddress: { $in: subscriberWallets } });

  res.status(200).json(
    successResponse(`${subs.length} subscriber(s)`, { subscriptions: subs, subscribers: users })
  );
});

/**
 * @desc    Check if a wallet is subscribed to a creator (reads on-chain)
 * @route   GET /api/subscriptions/check?subscriber=0x...&creator=0x...
 * @access  Public
 */
const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const { subscriber, creator } = req.query;

  if (!subscriber || !creator) {
    res.status(400);
    throw new Error("subscriber and creator query params are required");
  }

  const sub = normalizeWallet(subscriber);
  const cre = normalizeWallet(creator);

  // Read live from blockchain
  const isSubscribed = await checkSubscription({ subscriberWallet: sub, creatorWallet: cre });
  const timeLeftSeconds = isSubscribed
    ? await getSubscriptionTimeLeft({ subscriberWallet: sub, creatorWallet: cre })
    : 0;

  res.status(200).json(
    successResponse("Subscription status checked", {
      isSubscribed,
      timeLeftSeconds: Number(timeLeftSeconds),
      timeLeftDays: Math.floor(Number(timeLeftSeconds) / 86400),
    })
  );
});

/**
 * @desc    Register as a creator with monthly subscription price
 * @route   POST /api/subscriptions/register
 * @body    { walletAddress, monthlyPriceEth, signature }
 * @access  Public
 */
const registerCreator = asyncHandler(async (req, res) => {
  const { walletAddress, monthlyPriceEth, signature } = req.body;

  if (!walletAddress || !monthlyPriceEth || !signature) {
    res.status(400);
    throw new Error("walletAddress, monthlyPriceEth and signature are required");
  }

  const wallet = normalizeWallet(walletAddress);
  const priceWei = ethers.parseEther(String(monthlyPriceEth)).toString();

  const message = `SparkMint Register Creator\nWallet: ${wallet}\nMonthlyPrice: ${monthlyPriceEth} ETH`;
  const isValid = verifySignature(message, signature, wallet);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  const { registerCreatorForUser } = require("../services/relayerService");
  const { txHash } = await registerCreatorForUser({ monthlyPriceWei: priceWei });

  // Mark as creator in MongoDB
  await User.findOneAndUpdate(
    { walletAddress: wallet },
    { $set: { isCreator: true } },
    { upsert: false }
  );

  res.status(200).json(
    successResponse("Creator registered on-chain", {
      walletAddress: wallet,
      monthlyPriceEth,
      priceWei,
      txHash,
    })
  );
});

module.exports = {
  subscribe,
  unsubscribe,
  getSubscriberSubscriptions,
  getCreatorSubscribers,
  checkSubscriptionStatus,
  registerCreator,
};
