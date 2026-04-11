const asyncHandler = require("express-async-handler");
const { ethers } = require("ethers");
const NFT = require("../models/NFT");
const Transaction = require("../models/Transaction");
const { normalizeWallet, successResponse } = require("../utils/helpers");
const {
  verifySignature,
  listNFTForSale,
  buyNFTForUser,
} = require("../services/relayerService");

// ─────────────────────────────────────────────
//  Helpers: message builders (must match Flutter)
// ─────────────────────────────────────────────
const buildSellMessage = ({ walletAddress, tokenId, priceEth }) =>
  `SparkMint List NFT\nWallet: ${walletAddress}\nTokenId: ${tokenId}\nPrice: ${priceEth} ETH`;

const buildBuyMessage = ({ walletAddress, tokenId }) =>
  `SparkMint Buy NFT\nWallet: ${walletAddress}\nTokenId: ${tokenId}`;

/**
 * @desc    List an NFT for sale on-chain
 * @route   POST /api/market/sell
 * @body    { walletAddress, nftId, tokenId, priceEth, signature }
 * @access  Public
 */
const sellNFT = asyncHandler(async (req, res) => {
  const { walletAddress, nftId, tokenId, priceEth, signature } = req.body;

  if (!walletAddress || !nftId || !tokenId || !priceEth || !signature) {
    res.status(400);
    throw new Error("walletAddress, nftId, tokenId, priceEth and signature are required");
  }

  const wallet = normalizeWallet(walletAddress);

  // Verify NFT exists and belongs to the seller
  const nft = await NFT.findById(nftId);
  if (!nft) {
    res.status(404);
    throw new Error(`NFT not found with id: ${nftId}`);
  }
  if (nft.ownerWallet !== wallet) {
    res.status(403);
    throw new Error("You are not the owner of this NFT");
  }

  // Verify signature
  const message = buildSellMessage({ walletAddress: wallet, tokenId, priceEth });
  const isValid = verifySignature(message, signature, wallet);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  const priceWei = ethers.parseEther(String(priceEth)).toString();

  // Relay sellNFT on-chain
  const { txHash, blockNumber } = await listNFTForSale({ tokenId, priceWei });

  // Update off-chain NFT record with new price
  const updatedNFT = await NFT.findByIdAndUpdate(
    nftId,
    { $set: { price: parseFloat(priceEth), isListed: true } },
    { new: true }
  );

  res.status(200).json(
    successResponse("NFT listed for sale on-chain", {
      nft: updatedNFT,
      txHash,
      blockNumber,
      priceEth,
      priceWei,
    })
  );
});

/**
 * @desc    Buy an NFT on-chain via relayer
 * @route   POST /api/market/buy
 * @body    { buyerWallet, nftId, tokenId, signature }
 * @access  Public
 */
const buyNFT = asyncHandler(async (req, res) => {
  const { buyerWallet, nftId, tokenId, signature } = req.body;

  if (!buyerWallet || !nftId || !tokenId || !signature) {
    res.status(400);
    throw new Error("buyerWallet, nftId, tokenId and signature are required");
  }

  const buyer = normalizeWallet(buyerWallet);

  // Verify NFT exists
  const nft = await NFT.findById(nftId);
  if (!nft) {
    res.status(404);
    throw new Error(`NFT not found with id: ${nftId}`);
  }
  if (nft.ownerWallet === buyer) {
    res.status(400);
    throw new Error("You already own this NFT");
  }

  // Verify signature
  const message = buildBuyMessage({ walletAddress: buyer, tokenId });
  const isValid = verifySignature(message, signature, buyer);
  if (!isValid) {
    res.status(401);
    throw new Error("Invalid signature. Request rejected.");
  }

  const priceWei = ethers.parseEther(String(nft.price)).toString();
  const sellerWallet = nft.ownerWallet;

  // Relay buyNFT on-chain (relayer sends ETH to contract, gets NFT transferred to buyer)
  const { txHash, blockNumber } = await buyNFTForUser({ tokenId, priceWei });

  // Record the transaction
  const transaction = await Transaction.create({
    nftId: nft._id,
    tokenId: String(tokenId),
    sellerWallet,
    buyerWallet: buyer,
    priceEth: nft.price,
    priceWei,
    txHash,
    blockNumber,
  });

  // Update NFT ownership off-chain
  const updatedNFT = await NFT.findByIdAndUpdate(
    nftId,
    { $set: { ownerWallet: buyer, isListed: false } },
    { new: true }
  );

  res.status(200).json(
    successResponse("NFT purchased successfully", {
      nft: updatedNFT,
      transaction,
      txHash,
      blockNumber,
    })
  );
});

/**
 * @desc    Get transaction history for an NFT token
 * @route   GET /api/market/history/:tokenId
 * @access  Public
 */
const getNFTHistory = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;

  const transactions = await Transaction.find({ tokenId })
    .sort({ createdAt: -1 })
    .populate("nftId", "title imageUrl category");

  res.status(200).json(
    successResponse(`${transactions.length} transaction(s) found`, transactions)
  );
});

/**
 * @desc    Get all buy/sell history for a wallet
 * @route   GET /api/market/wallet/:walletAddress
 * @access  Public
 */
const getWalletHistory = asyncHandler(async (req, res) => {
  const wallet = normalizeWallet(req.params.walletAddress);

  const transactions = await Transaction.find({
    $or: [{ sellerWallet: wallet }, { buyerWallet: wallet }],
  })
    .sort({ createdAt: -1 })
    .populate("nftId", "title imageUrl category");

  res.status(200).json(
    successResponse(`${transactions.length} transaction(s) found`, transactions)
  );
});

/**
 * @desc    Get all listed (for-sale) NFTs
 * @route   GET /api/market/listings
 * @access  Public
 */
const getListings = asyncHandler(async (req, res) => {
  const filter = { isListed: true, price: { $gt: 0 } };
  if (req.query.category) filter.category = req.query.category.toLowerCase();

  const nfts = await NFT.find(filter).sort({ createdAt: -1 });

  res.status(200).json(
    successResponse(`${nfts.length} listing(s) found`, nfts)
  );
});

module.exports = { sellNFT, buyNFT, getNFTHistory, getWalletHistory, getListings };
