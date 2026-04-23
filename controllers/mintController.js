/**
 * mintController.js
 *
 * Handles gasless NFT minting via backend relayer.
 * User signs a message → backend verifies → backend mints on-chain.
 */

const asyncHandler = require("express-async-handler");
const NFT = require("../models/NFT");
const { normalizeWallet, successResponse } = require("../utils/helpers");
const {
  verifySignature,
  mintNFTForUser,
  getRelayerBalance,
} = require("../services/relayerService");

// Platform fee (if used elsewhere)
const PLATFORM_FEE_ETH = process.env.PLATFORM_FEE_ETH || "0.001";

/**
 * @desc    Mint NFT via relayer (gasless for user)
 * @route   POST /api/mint
 * @access  Public
 *
 * Body:
 * {
 *   walletAddress: "0x...",
 *   signature: "0x...",
 *   title: "My NFT",
 *   description: "...",
 *   imageUrl: "https://...",
 *   accessType: 0,      // 0=FREE, 1=SUBSCRIBER_ONLY
 *   category: "art",
 *   price: 0.05         // marketplace/listing price only
 * }
 */
const relayMint = asyncHandler(async (req, res) => {
  const {
  walletAddress,
  signature,
  title,
  description,
  imageUrl,
  accessType,
  category,
  price,
  isListed,
} = req.body;

  if (!walletAddress || !signature || !title || !imageUrl) {
    res.status(400);
    throw new Error("walletAddress, signature, title and imageUrl are required");
  }

  const wallet = normalizeWallet(walletAddress);

  // Normalize accessType strictly
  const normalizedAccessType =
    accessType === 1 || accessType === "1" ? 1 : 0;

  // Marketplace/listing price only
  const normalizedPrice =
    price === null || price === undefined || price === ""
      ? 0
      : Number(price);

  if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
    res.status(400);
    throw new Error("price must be a valid non-negative number");
  }

  // Must match Flutter signed message exactly
  const mintMessage = buildMintMessage({
    walletAddress: wallet,
    title,
    imageUrl,
    accessType: normalizedAccessType,
  });

  const isValid = verifySignature(mintMessage, signature, wallet);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  const balance = await getRelayerBalance();
  if (parseFloat(balance) < 0.005) {
    res.status(503);
    throw new Error("Relayer wallet low on funds. Please try again later.");
  }

  const { txHash, tokenId, blockNumber } = await mintNFTForUser({
    tokenURI: imageUrl,
    title,
    description: description || "",
    accessType: normalizedAccessType,
  });

 const nft = await NFT.create({
  title,
  description: description || "",
  imageUrl,
  creatorWallet: wallet,
  ownerWallet: wallet,
  tokenId: tokenId || null,
  accessType: normalizedAccessType,
  price: normalizedPrice,
  category: category || "art",
  txHash,
  isListed: isListed === true,
});

  res.status(201).json(
    successResponse("NFT minted successfully", {
      nft,
      txHash,
      tokenId,
      blockNumber,
      mintMessage,
    })
  );
});

/**
 * @desc    Get relayer status
 * @route   GET /api/mint/status
 * @access  Public
 */
const relayerStatus = asyncHandler(async (req, res) => {
  const balance = await getRelayerBalance();
  const { relayerWallet } = require("../services/relayerService");

  res.status(200).json(
    successResponse("Relayer status", {
      address: relayerWallet.address,
      balance: `${balance} ETH`,
      platformFee: `${PLATFORM_FEE_ETH} ETH`,
      healthy: parseFloat(balance) > 0.005,
    })
  );
});

const buildMintMessage = ({ walletAddress, title, imageUrl, accessType }) => {
  return `SparkMint Mint Request\nWallet: ${walletAddress}\nTitle: ${title}\nImage: ${imageUrl}\nAccessType: ${accessType}`;
};

module.exports = { relayMint, relayerStatus, buildMintMessage };