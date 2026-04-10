const express = require("express");
const cors = require("cors");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const nftRoutes = require("./routes/nftRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const mintRoutes = require("./routes/mintRoutes"); // ← NEW
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ─────────────────────────────────────────────
//  Core Middleware
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─────────────────────────────────────────────
//  Health Check
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SparkMint API is running 🚀",
    version: "1.0.0",
  });
});

// ─────────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/nfts", nftRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mint", mintRoutes); // ← NEW relayer endpoint

// ─────────────────────────────────────────────
//  Error Handling
// ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
