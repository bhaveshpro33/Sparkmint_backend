const asyncHandler = require("express-async-handler");
const NFT = require("../models/NFT");
const { normalizeWallet, successResponse } = require("../utils/helpers");

/**
 * @desc    Create a new NFT metadata record
 * @route   POST /api/nfts
 * @access  Public
 *
 * Called after a mint transaction is confirmed on-chain.
 * The Flutter app sends the metadata + txHash to persist it here.
 */
const createNFT = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    imageUrl,
    creatorWallet,
    ownerWallet,
    tokenId,
    price,
    category,
    txHash,
  } = req.body;

  // Validate required fields
  if (!title || !imageUrl || !creatorWallet) {
    res.status(400);
    throw new Error("title, imageUrl, and creatorWallet are required");
  }

  const nft = await NFT.create({
    title,
    description,
    imageUrl,
    creatorWallet: normalizeWallet(creatorWallet),
    // If ownerWallet not provided, default to creator (just minted)
    ownerWallet: normalizeWallet(ownerWallet || creatorWallet),
    tokenId: tokenId || null,
    price: price || 0,
    category: category || "art",
    txHash: txHash || null,
  });

  res.status(201).json(successResponse("NFT created successfully", nft));
});

/**
 * @desc    Get all NFTs (with optional category filter)
 * @route   GET /api/nfts
 * @route   GET /api/nfts?category=art
 * @access  Public
 */
const getAllNFTs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category.toLowerCase();

  const nfts = await NFT.find(filter).sort({ createdAt: -1 });

  res.status(200).json(
    successResponse(`${nfts.length} NFT(s) fetched successfully`, nfts)
  );
});

/**
 * @desc    Get a single NFT by its MongoDB _id
 * @route   GET /api/nfts/:id
 * @access  Public
 */
const getNFTById = asyncHandler(async (req, res) => {
  const nft = await NFT.findById(req.params.id);

  if (!nft) {
    res.status(404);
    throw new Error(`NFT not found with id: ${req.params.id}`);
  }

  res.status(200).json(successResponse("NFT fetched successfully", nft));
});

/**
 * @desc    Get all NFTs owned by a specific wallet address
 * @route   GET /api/nfts/owner/:walletAddress
 * @access  Public
 */
const getNFTsByOwner = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);
  const nfts = await NFT.find({ ownerWallet: wallet }).sort({ createdAt: -1 });

  res.status(200).json(
    successResponse(
      `${nfts.length} NFT(s) found for owner ${wallet}`,
      nfts
    )
  );
});

/**
 * @desc    Get all NFTs originally created by a specific wallet address
 * @route   GET /api/nfts/creator/:walletAddress
 * @access  Public
 */
const getNFTsByCreator = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);
  const nfts = await NFT.find({ creatorWallet: wallet }).sort({
    createdAt: -1,
  });

  res.status(200).json(
    successResponse(
      `${nfts.length} NFT(s) found for creator ${wallet}`,
      nfts
    )
  );
});

/**
 * @desc    Update an NFT record (e.g. price change, ownership transfer)
 * @route   PUT /api/nfts/:id
 * @access  Public
 *
 * NOTE: Ownership transfer on-chain is handled by the smart contract.
 * This endpoint only updates the off-chain metadata record to stay in sync.
 */
const updateNFT = asyncHandler(async (req, res) => {
  const nft = await NFT.findById(req.params.id);

  if (!nft) {
    res.status(404);
    throw new Error(`NFT not found with id: ${req.params.id}`);
  }

  // Normalize wallet fields if they're being updated
  if (req.body.ownerWallet)
    req.body.ownerWallet = normalizeWallet(req.body.ownerWallet);
  if (req.body.creatorWallet)
    req.body.creatorWallet = normalizeWallet(req.body.creatorWallet);

  // Apply updates – only fields present in req.body will be changed
  const updatedNFT = await NFT.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  res.status(200).json(successResponse("NFT updated successfully", updatedNFT));
});

/**
 * @desc    Delete an NFT metadata record
 * @route   DELETE /api/nfts/:id
 * @access  Public
 *
 * Removes the off-chain record only. Does NOT burn the token on-chain.
 */
const deleteNFT = asyncHandler(async (req, res) => {
  const nft = await NFT.findById(req.params.id);

  if (!nft) {
    res.status(404);
    throw new Error(`NFT not found with id: ${req.params.id}`);
  }

  await nft.deleteOne();

  res.status(200).json(
    successResponse("NFT deleted successfully", { id: req.params.id })
  );
});

module.exports = {
  createNFT,
  getAllNFTs,
  getNFTById,
  getNFTsByOwner,
  getNFTsByCreator,
  updateNFT,
  deleteNFT,
};
