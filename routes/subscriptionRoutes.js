const express = require("express");
const router = express.Router();
const {
  subscribe,
  unsubscribe,
  getSubscriberSubscriptions,
  getCreatorSubscribers,
  checkSubscriptionStatus,
  registerCreator,
} = require("../controllers/subscriptionController");

// POST /api/subscriptions/register          → register as creator with monthly price
router.post("/register", registerCreator);

// POST /api/subscriptions/subscribe         → subscribe to a creator (on-chain relay)
router.post("/subscribe", subscribe);

// POST /api/subscriptions/unsubscribe       → unsubscribe from a creator (on-chain relay)
router.post("/unsubscribe", unsubscribe);

// GET  /api/subscriptions/check?subscriber=...&creator=...  → live on-chain status check
router.get("/check", checkSubscriptionStatus);

// GET  /api/subscriptions/subscriber/:walletAddress → all active subs for a user
router.get("/subscriber/:walletAddress", getSubscriberSubscriptions);

// GET  /api/subscriptions/creator/:walletAddress    → all subscribers of a creator
router.get("/creator/:walletAddress", getCreatorSubscribers);

module.exports = router;
