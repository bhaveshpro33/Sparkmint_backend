const express = require("express");
const cors = require("cors");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const nftRoutes = require("./routes/nftRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const mintRoutes = require("./routes/mintRoutes");
const followRoutes = require("./routes/followRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const marketRoutes = require("./routes/marketRoutes");
const avatarRoutes = require("./routes/avatarRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ─────────────────────────────────────────────
//  Core Middleware
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));



// ─────────────────────────────────────────────
//  Health Check
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SparkMint API is running 🚀",
    version: "2.0.0",
    endpoints: {
      users: "/api/users",
      nfts: "/api/nfts",
      mint: "/api/mint",
      upload: "/api/upload",
      avatar: "/api/avatar",
      follow: "/api/follow",
      subscriptions: "/api/subscriptions",
      market: "/api/market",
    },
  });
});

// ─────────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/nfts", nftRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mint", mintRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/market", marketRoutes);

// ─────────────────────────────────────────────
//  Error Handling
// ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
