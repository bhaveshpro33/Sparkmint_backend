const express = require("express");
const router = express.Router();
const {
  followCreator,
  unfollowCreator,
  getFollowing,
  getFollowers,
  checkFollow,
} = require("../controllers/followController");

// POST /api/follow          → follow a creator
router.post("/", followCreator);

// DELETE /api/follow        → unfollow a creator
router.delete("/", unfollowCreator);

// GET  /api/follow/check?follower=0x...&following=0x...  → check follow status
router.get("/check", checkFollow);

// GET  /api/follow/following/:walletAddress  → list who this wallet follows
router.get("/following/:walletAddress", getFollowing);

// GET  /api/follow/followers/:walletAddress  → list followers of this wallet
router.get("/followers/:walletAddress", getFollowers);

module.exports = router;
