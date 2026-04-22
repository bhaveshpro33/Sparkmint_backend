const asyncHandler = require("express-async-handler");
const { ethers } = require("ethers");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { normalizeWallet, successResponse } = require("../utils/helpers");
const {
  verifySignature,
  registerCreatorForUser,
  subscribeForUser,
  unsubscribeForUser,
  getCreatorPrice,
  checkSubscription,
  getSubscriptionTimeLeft,
} = require("../services/relayerService");

// ─────────────────────────────────────────────
// Helpers: messages must match Flutter exactly
// ─────────────────────────────────────────────
const buildSubscribeMessage = ({ subscriberWallet, creatorWallet, action }) =>
  `SparkMint Subscription ${action}\nSubscriber: ${subscriberWallet}\nCreator: ${creatorWallet}`;

const buildRegisterCreatorMessage = ({ walletAddress, monthlyPriceEth }) =>
  `SparkMint Register Creator\nWallet: ${walletAddress}\nMonthlyPrice: ${monthlyPriceEth} ETH`;

/**
 * @desc    Register as creator via backend relayer
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
  const priceEth = Number(monthlyPriceEth);

  if (!Number.isFinite(priceEth) || priceEth <= 0) {
    res.status(400);
    throw new Error("monthlyPriceEth must be a valid number greater than 0");
  }

  const message = buildRegisterCreatorMessage({
    walletAddress: wallet,
    monthlyPriceEth,
  });

  const isValid = verifySignature(message, signature, wallet);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  const monthlyPriceWei = ethers.parseEther(String(monthlyPriceEth)).toString();

  const { txHash, blockNumber } = await registerCreatorForUser({
    creatorWallet: wallet,
    monthlyPriceWei,
  });

  const user = await User.findOneAndUpdate(
    { walletAddress: wallet },
    {
      $set: {
        isCreator: true,
        subscriptionPriceEth: parseFloat(monthlyPriceEth),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(200).json(
    successResponse("Creator registered successfully", {
      user,
      txHash,
      blockNumber,
      monthlyPriceEth,
      monthlyPriceWei,
    })
  );
});

/**
 * @desc    Subscribe to a creator via backend relayer
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

  if (subscriber === creator) {
    res.status(400);
    throw new Error("A user cannot subscribe to themselves");
  }

  const message = buildSubscribeMessage({
    subscriberWallet: subscriber,
    creatorWallet: creator,
    action: "Subscribe",
  });

  const isValid = verifySignature(message, signature, subscriber);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  const priceWei = await getCreatorPrice(creator);
  if (!priceWei || priceWei === "0") {
    res.status(404);
    throw new Error("Creator not registered or subscription price unavailable");
  }

  const { txHash, expiresAt, blockNumber } = await subscribeForUser({
    subscriberWallet: subscriber,
    creatorWallet: creator,
    priceWei,
  });

  const sub = await Subscription.findOneAndUpdate(
    { subscriberWallet: subscriber, creatorWallet: creator },
    {
      $set: {
        isActive: true,
        expiresAt: expiresAt ? new Date(Number(expiresAt) * 1000) : null,
        txHash,
        priceWei,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await User.findOneAndUpdate(
    { walletAddress: creator },
    { $set: { isCreator: true } },
    { upsert: false }
  );

  res.status(200).json(
    successResponse("Subscribed successfully", {
      subscription: sub,
      txHash,
      blockNumber,
      expiresAt: expiresAt ? new Date(Number(expiresAt) * 1000) : null,
      priceWei,
    })
  );
});

/**
 * @desc    Unsubscribe from a creator via backend relayer
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

  const message = buildSubscribeMessage({
    subscriberWallet: subscriber,
    creatorWallet: creator,
    action: "Unsubscribe",
  });

  const isValid = verifySignature(message, signature, subscriber);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  const { txHash, blockNumber } = await unsubscribeForUser({
    subscriberWallet: subscriber,
    creatorWallet: creator,
  });

  await Subscription.findOneAndUpdate(
    { subscriberWallet: subscriber, creatorWallet: creator },
    { $set: { isActive: false, txHash } },
    { new: true }
  );

  res.status(200).json(
    successResponse("Unsubscribed successfully", {
      txHash,
      blockNumber,
    })
  );
});

/**
 * @desc    Check if a wallet is subscribed to a creator (reads live from chain)
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

  const isSubscribed = await checkSubscription({
    subscriberWallet: sub,
    creatorWallet: cre,
  });

  const timeLeftSeconds = isSubscribed
    ? await getSubscriptionTimeLeft({
        subscriberWallet: sub,
        creatorWallet: cre,
      })
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

  const creatorWallets = subs.map((s) => s.creatorWallet);
  const creators = await User.find({ walletAddress: { $in: creatorWallets } });

  res.status(200).json(
    successResponse(`${subs.length} active subscription(s)`, {
      subscriptions: subs,
      creators,
    })
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
    successResponse(`${subs.length} subscriber(s)`, {
      subscriptions: subs,
      subscribers: users,
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