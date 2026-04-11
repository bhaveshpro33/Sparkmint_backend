const express = require("express");
const router = express.Router();
const {
  sellNFT,
  buyNFT,
  getNFTHistory,
  getWalletHistory,
  getListings,
} = require("../controllers/marketController");

// GET  /api/market/listings             → all NFTs currently listed for sale
router.get("/listings", getListings);

// POST /api/market/sell                 → list an NFT for sale on-chain
router.post("/sell", sellNFT);

// POST /api/market/buy                  → buy an NFT on-chain via relayer
router.post("/buy", buyNFT);

// GET  /api/market/history/:tokenId     → transaction history for a specific token
router.get("/history/:tokenId", getNFTHistory);

// GET  /api/market/wallet/:walletAddress → buy/sell history for a wallet
router.get("/wallet/:walletAddress", getWalletHistory);

module.exports = router;
