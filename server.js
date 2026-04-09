// Load environment variables from .env FIRST – before anything else
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

/**
 * Startup sequence:
 *   1. Connect to MongoDB Atlas
 *   2. Start the Express HTTP server
 *
 * We connect to the database BEFORE starting the server so that
 * the API never accepts requests without a working DB connection.
 */
const startServer = async () => {
  await connectDB(); // throws & exits on failure

  app.listen(PORT,"0.0.0.0", () => {
    console.log(`🚀  SparkMint API running on port ${PORT}`);
    console.log(`📡  Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗  Health check: http://localhost:${PORT}/`);
  });
};

startServer();
