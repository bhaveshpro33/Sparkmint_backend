const asyncHandler = require("express-async-handler");
const NFT = require("../models/NFT");
const { normalizeWallet, successResponse } = require("../utils/helpers");

/**
 * @desc    Create a new NFT metadata record
 * @route   POST /api/nfts
 * @access  Public
 */
const createNFT = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    imageUrl,
    creatorWallet,
    ownerWallet,
    tokenId,
    accessType,
    price,
    category,
    txHash,
    isListed,
  } = req.body;

  if (!title || !imageUrl || !creatorWallet) {
    res.status(400);
    throw new Error("title, imageUrl, and creatorWallet are required");
  }

  const normalizedAccessType =
    accessType === 1 || accessType === "1" ? 1 : 0;

  const normalizedPrice =
    price === null || price === undefined || price === ""
      ? 0
      : Number(price);

  if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
    res.status(400);
    throw new Error("price must be a valid non-negative number");
  }

  const nft = await NFT.create({
    title,
    description: description || "",
    imageUrl,
    creatorWallet: normalizeWallet(creatorWallet),
    ownerWallet: normalizeWallet(ownerWallet || creatorWallet),
    tokenId: tokenId || null,
    accessType: normalizedAccessType,
    price: normalizedPrice,
    category: category || "art",
    txHash: txHash || null,
    isListed: isListed === true,
  });

  res.status(201).json(successResponse("NFT created successfully", nft));
});

const getAllNFTs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category.toLowerCase();

  const nfts = await NFT.find(filter).sort({ createdAt: -1 });

  res.status(200).json(
    successResponse(`${nfts.length} NFT(s) fetched successfully`, nfts)
  );
});

const getNFTById = asyncHandler(async (req, res) => {
  const nft = await NFT.findById(req.params.id);

  if (!nft) {
    res.status(404);
    throw new Error(`NFT not found with id: ${req.params.id}`);
  }

  res.status(200).json(successResponse("NFT fetched successfully", nft));
});

const getNFTsByOwner = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);
  const nfts = await NFT.find({ ownerWallet: wallet }).sort({ createdAt: -1 });

  res.status(200).json(
    successResponse(`${nfts.length} NFT(s) found for owner ${wallet}`, nfts)
  );
});

const getNFTsByCreator = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);
  const nfts = await NFT.find({ creatorWallet: wallet }).sort({ createdAt: -1 });

  res.status(200).json(
    successResponse(`${nfts.length} NFT(s) found for creator ${wallet}`, nfts)
  );
});

const updateNFT = asyncHandler(async (req, res) => {
  const nft = await NFT.findById(req.params.id);

  if (!nft) {
    res.status(404);
    throw new Error(`NFT not found with id: ${req.params.id}`);
  }

  if (req.body.ownerWallet) {
    req.body.ownerWallet = normalizeWallet(req.body.ownerWallet);
  }

  if (req.body.creatorWallet) {
    req.body.creatorWallet = normalizeWallet(req.body.creatorWallet);
  }

  if (req.body.accessType !== undefined) {
    req.body.accessType =
      req.body.accessType === 1 || req.body.accessType === "1" ? 1 : 0;
  }

  if (req.body.price !== undefined) {
    const normalizedPrice = Number(req.body.price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      res.status(400);
      throw new Error("price must be a valid non-negative number");
    }
    req.body.price = normalizedPrice;
  }

  const updatedNFT = await NFT.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  res.status(200).json(successResponse("NFT updated successfully", updatedNFT));
});

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