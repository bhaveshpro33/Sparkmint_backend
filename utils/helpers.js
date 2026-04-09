/**
 * helpers.js
 *
 * Shared utility functions used across controllers.
 */

/**
 * normalizeWallet
 * Normalizes a blockchain wallet address to lowercase.
 * This ensures consistent storage and lookup regardless of
 * how the Flutter app sends the address (mixed case, checksum, etc.)
 *
 * @param {string} address - Raw wallet address from request
 * @returns {string} Lowercase wallet address
 */
const normalizeWallet = (address) => {
  if (!address || typeof address !== "string") return "";
  return address.trim().toLowerCase();
};

/**
 * successResponse
 * Helper to build a standardized success JSON response object.
 *
 * @param {string} message - Human-readable success message
 * @param {*} data - The response payload
 * @returns {object} Formatted response object
 */
const successResponse = (message, data = null) => ({
  success: true,
  message,
  data,
});

module.exports = { normalizeWallet, successResponse };
