const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { normalizeWallet, successResponse } = require("../utils/helpers");

/**
 * @desc    Create a new user OR update existing user by wallet address
 * @route   POST /api/users
 * @access  Public
 *
 * Why upsert? In a wallet-first app the user "signs in" by connecting their
 * wallet. If it's their first visit we create a profile; if they're returning
 * we update it. One endpoint handles both cleanly.
 */
const upsertUser = asyncHandler(async (req, res) => {
  const { walletAddress, name, email, bio, avatar, isCreator } = req.body;

  // walletAddress is required
  if (!walletAddress) {
    res.status(400);
    throw new Error("walletAddress is required");
  }

  const wallet = normalizeWallet(walletAddress);

  // Build the fields to set (only include defined values)
  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (email !== undefined) updateFields.email = email;
  if (bio !== undefined) updateFields.bio = bio;
  if (avatar !== undefined) updateFields.avatar = avatar;
  if (isCreator !== undefined) updateFields.isCreator = isCreator;

  // findOneAndUpdate with upsert:true → create if not found, update if found
  const user = await User.findOneAndUpdate(
    { walletAddress: wallet }, // filter
    { $set: updateFields },     // update
    {
      new: true,      // return the updated document
      upsert: true,   // create if not found
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  // Determine if this was a create or an update by checking timestamps
  const isNew =
    user.createdAt.getTime() === user.updatedAt.getTime();

  res.status(isNew ? 201 : 200).json(
    successResponse(
      isNew ? "User created successfully" : "User updated successfully",
      user
    )
  );
});

/**
 * @desc    Get a single user by wallet address OR MongoDB _id
 * @route   GET /api/users/:walletAddress
 * @access  Public
 *
 * The param may be a wallet address (0x...) or a MongoDB ObjectId (24-char hex).
 * This handles both so that callers who only have the DB id (e.g. from a
 * creator card URL) can still resolve the full user profile including walletAddress.
 */
const getUserByWallet = asyncHandler(async (req, res) => {
  const param = req.params.walletAddress;

  // Try wallet address first
  let user = await User.findOne({ walletAddress: normalizeWallet(param) });

  // Fall back to _id lookup if param looks like a MongoDB ObjectId (24 hex chars)
  if (!user && /^[a-f\d]{24}$/i.test(param)) {
    user = await User.findById(param);
  }

  if (!user) {
    res.status(404);
    throw new Error(`No user found with wallet or id: ${param}`);
  }

  res.status(200).json(successResponse("User fetched successfully", user));
});

/**
 * @desc    Get all users (useful for leaderboards, creator discovery)
 * @route   GET /api/users
 * @access  Public
 */
const getAllUsers = asyncHandler(async (req, res) => {
  // Support optional ?isCreator=true filter for creator-only pages
  const filter = {};
  if (req.query.isCreator === "true") filter.isCreator = true;

  const users = await User.find(filter).sort({ createdAt: -1 });

  res.status(200).json(
    successResponse(`${users.length} user(s) fetched successfully`, users)
  );
});

module.exports = { upsertUser, getUserByWallet, getAllUsers };
