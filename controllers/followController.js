const asyncHandler = require("express-async-handler");
const Follow = require("../models/Follow");
const User = require("../models/User");
const { normalizeWallet, successResponse } = require("../utils/helpers");

/**
 * @desc    Follow a creator
 * @route   POST /api/follow
 * @body    { followerWallet, followingWallet }
 * @access  Public
 */
const followCreator = asyncHandler(async (req, res) => {
  const { followerWallet, followingWallet } = req.body;

  if (!followerWallet || !followingWallet) {
    res.status(400);
    throw new Error("followerWallet and followingWallet are required");
  }

  const follower = normalizeWallet(followerWallet);
  const following = normalizeWallet(followingWallet);

  if (follower === following) {
    res.status(400);
    throw new Error("A user cannot follow themselves");
  }

  // Check that the target user exists
  const targetUser = await User.findOne({ walletAddress: following });
  if (!targetUser) {
    res.status(404);
    throw new Error(`No user found with wallet address: ${following}`);
  }

  // upsert=false: throw duplicate key error if already followed
  try {
    const follow = await Follow.create({
      followerWallet: follower,
      followingWallet: following,
    });

    res.status(201).json(successResponse("Followed successfully", follow));
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("You are already following this creator");
    }
    throw err;
  }
});

/**
 * @desc    Unfollow a creator
 * @route   DELETE /api/follow
 * @body    { followerWallet, followingWallet }
 * @access  Public
 */
const unfollowCreator = asyncHandler(async (req, res) => {
  const { followerWallet, followingWallet } = req.body;

  if (!followerWallet || !followingWallet) {
    res.status(400);
    throw new Error("followerWallet and followingWallet are required");
  }

  const follower = normalizeWallet(followerWallet);
  const following = normalizeWallet(followingWallet);

  const deleted = await Follow.findOneAndDelete({
    followerWallet: follower,
    followingWallet: following,
  });

  if (!deleted) {
    res.status(404);
    throw new Error("Follow relationship not found");
  }

  res.status(200).json(successResponse("Unfollowed successfully", { follower, following }));
});

/**
 * @desc    Get all users that a wallet is following
 * @route   GET /api/follow/following/:walletAddress
 * @access  Public
 */
const getFollowing = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);

  const follows = await Follow.find({ followerWallet: wallet }).sort({ createdAt: -1 });
  const wallets = follows.map((f) => f.followingWallet);

  // Optionally hydrate user profiles
  const users = await User.find({ walletAddress: { $in: wallets } });

  res.status(200).json(
    successResponse(`${follows.length} following`, {
      count: follows.length,
      wallets,
      users,
    })
  );
});

/**
 * @desc    Get all followers of a wallet
 * @route   GET /api/follow/followers/:walletAddress
 * @access  Public
 */
const getFollowers = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);

  const follows = await Follow.find({ followingWallet: wallet }).sort({ createdAt: -1 });
  const wallets = follows.map((f) => f.followerWallet);

  const users = await User.find({ walletAddress: { $in: wallets } });

  res.status(200).json(
    successResponse(`${follows.length} followers`, {
      count: follows.length,
      wallets,
      users,
    })
  );
});

/**
 * @desc    Check if walletA follows walletB
 * @route   GET /api/follow/check?follower=0x...&following=0x...
 * @access  Public
 */
const checkFollow = asyncHandler(async (req, res) => {
  const { follower, following } = req.query;

  if (!follower || !following) {
    res.status(400);
    throw new Error("follower and following query params are required");
  }

  const exists = await Follow.findOne({
    followerWallet: normalizeWallet(follower),
    followingWallet: normalizeWallet(following),
  });

  res.status(200).json(
    successResponse("Follow status checked", { isFollowing: !!exists })
  );
});

module.exports = {
  followCreator,
  unfollowCreator,
  getFollowing,
  getFollowers,
  checkFollow,
};
