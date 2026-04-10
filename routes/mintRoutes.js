/**
 * mintRoutes.js
 *
 * Routes for the relayer minting endpoint.
 * Base path: /api/mint (mounted in app.js)
 */

const express = require("express");
const router = express.Router();
const { relayMint, relayerStatus } = require("../controllers/mintController");

// GET  /api/mint/status  → relayer wallet balance and health
router.get("/status", relayerStatus);

// POST /api/mint         → mint NFT via relayer
router.post("/", relayMint);

module.exports = router;
