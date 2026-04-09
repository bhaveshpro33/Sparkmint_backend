const express = require("express");
const cors = require("cors");
const path = require("path"); 

const userRoutes = require("./routes/userRoutes");
const nftRoutes = require("./routes/nftRoutes");

const uploadRoutes = require("./routes/uploadRoutes"); 
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// ─────────────────────────────────────────────
//  Create Express application instance
// ─────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────
//  Core Middleware
// ─────────────────────────────────────────────

// Enable CORS so Flutter (or any client) can reach this API.
// In production, replace the wildcard with your actual domain.
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded bodies (useful for form data, optional here)
app.use(express.urlencoded({ extended: false }));
// ─────────────────────────────────────────────
//  Serve uploaded images as static files
//  GET /uploads/<filename>  → returns the image
// ─────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); 

// ─────────────────────────────────────────────
//  Health Check Route
//  Useful for uptime monitors or Flutter to ping
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

// ─────────────────────────────────────────────
//  Error Handling Middleware
//  Must be registered AFTER all routes
// ─────────────────────────────────────────────
app.use(notFound);     // 404 handler for unknown routes
app.use(errorHandler); // central error handler

module.exports = app;
