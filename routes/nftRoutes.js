const express = require("express");
const router = express.Router();
const {
  createNFT,
  getAllNFTs,
  getNFTById,
  getNFTsByOwner,
  getNFTsByCreator,
  updateNFT,
  deleteNFT,
} = require("../controllers/nftController");

// ─────────────────────────────────────────────
//  NFT Routes
//  Base path: /api/nfts  (mounted in app.js)
//
//  ⚠️  ROUTE ORDER MATTERS in Express!
//  Static segments (/owner/:wallet, /creator/:wallet)
//  MUST be declared BEFORE the dynamic /:id route,
//  otherwise Express would try to treat "owner" or
//  "creator" as a MongoDB id and fail.
// ─────────────────────────────────────────────

// GET  /api/nfts               → get all NFTs (supports ?category=art)
// POST /api/nfts               → create new NFT record
router.route("/").get(getAllNFTs).post(createNFT);

// GET  /api/nfts/owner/:walletAddress  → NFTs by owner wallet
router.route("/owner/:walletAddress").get(getNFTsByOwner);

// GET  /api/nfts/creator/:walletAddress → NFTs by creator wallet
router.route("/creator/:walletAddress").get(getNFTsByCreator);

// GET    /api/nfts/:id  → get single NFT by MongoDB _id
// PUT    /api/nfts/:id  → update NFT
// DELETE /api/nfts/:id  → delete NFT
router.route("/:id").get(getNFTById).put(updateNFT).delete(deleteNFT);

module.exports = router;
