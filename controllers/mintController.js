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
const { ethers } = require("ethers");

// ─────────────────────────────────────────────
//  Platform fee (in ETH)
//  Users pay this fee to mint — you keep it
// ─────────────────────────────────────────────
const PLATFORM_FEE_ETH = process.env.PLATFORM_FEE_ETH || "0.001";

/**
 * @desc    Mint NFT via relayer (gasless for user)
 * @route   POST /api/mint
 * @access  Public
 *
 * Body:
 * {
 *   walletAddress: "0x...",      ← user's wallet
 *   signature: "0x...",          ← user signed the mint message
 *   title: "My NFT",
 *   description: "...",
 *   imageUrl: "https://...",
 *   accessType: 0,               ← 0=FREE, 1=SUBSCRIBER_ONLY
 *   category: "art",
 *   price: 0.05,
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
  } = req.body;

  // ── Validate required fields ───────────────────────────────────────────
  if (!walletAddress || !signature || !title || !imageUrl) {
    res.status(400);
    throw new Error("walletAddress, signature, title and imageUrl are required");
  }

  const wallet = normalizeWallet(walletAddress);

  // ── Build the exact message the user should have signed ───────────────
  // This MUST match exactly what Flutter sends to the wallet for signing
  const mintMessage = buildMintMessage({
    walletAddress: wallet,
    title,
    imageUrl,
    accessType: accessType ?? 0,
  });

  // ── Verify signature ──────────────────────────────────────────────────
  const isValid = verifySignature(mintMessage, signature, wallet);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  // ── Check relayer balance ─────────────────────────────────────────────
  const balance = await getRelayerBalance();
  if (parseFloat(balance) < 0.005) {
    res.status(503);
    throw new Error("Relayer wallet low on funds. Please try again later.");
  }

  // ── Mint NFT on-chain via relayer ─────────────────────────────────────
  const { txHash, tokenId, blockNumber } = await mintNFTForUser({
    tokenURI: imageUrl,
    title,
    description: description || "",
    accessType: accessType ?? 0,
  });

  // ── Save metadata to MongoDB ──────────────────────────────────────────
  const nft = await NFT.create({
    title,
    description: description || "",
    imageUrl,
    creatorWallet: wallet,
    ownerWallet: wallet,
    tokenId: tokenId || null,
    price: price || 0,
    category: category || "art",
    txHash,
  });

  res.status(201).json(
    successResponse("NFT minted successfully", {
      nft,
      txHash,
      tokenId,
      blockNumber,
      mintMessage, // return for debugging
    })
  );
});

/**
 * @desc    Get relayer status (balance, address)
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

// ─────────────────────────────────────────────
//  Build mint message
//  Must match exactly what Flutter signs
// ─────────────────────────────────────────────
const buildMintMessage = ({ walletAddress, title, imageUrl, accessType }) => {
  return `SparkMint Mint Request\nWallet: ${walletAddress}\nTitle: ${title}\nImage: ${imageUrl}\nAccessType: ${accessType}`;
};

module.exports = { relayMint, relayerStatus, buildMintMessage };
