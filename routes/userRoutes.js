const express = require("express");
const router = express.Router();
const {
  upsertUser,
  getUserByWallet,
  getAllUsers,
} = require("../controllers/userController");

// ─────────────────────────────────────────────
//  User Routes
//  Base path: /api/users  (mounted in app.js)
// ─────────────────────────────────────────────

// GET  /api/users                  → get all users
// POST /api/users                  → create or update a user
router.route("/").get(getAllUsers).post(upsertUser);

// GET  /api/users/:walletAddress   → get a single user by wallet
router.route("/:walletAddress").get(getUserByWallet);

module.exports = router;
