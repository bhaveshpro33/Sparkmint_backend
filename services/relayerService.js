/**
 * relayerService.js
 *
 * Handles all blockchain interactions for the relayer.
 * The backend wallet signs and sends transactions on behalf of users.
 */

const { ethers } = require("ethers");
const SparkMintABI = require("../abi/SparkMint.json");
const CreatorSubscriptionABI = require("../abi/CreatorSubscription.json");

// ─────────────────────────────────────────────
//  Setup provider and relayer wallet
// ─────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const relayerWallet = new ethers.Wallet(
  process.env.RELAYER_PRIVATE_KEY,
  provider
);

// ─────────────────────────────────────────────
//  Contract instances (connected to relayer wallet)
// ─────────────────────────────────────────────
const sparkMint = new ethers.Contract(
  process.env.SPARKMINT_ADDRESS,
  SparkMintABI,
  relayerWallet
);

const creatorSubscription = new ethers.Contract(
  process.env.CREATOR_SUBSCRIPTION_ADDRESS,
  CreatorSubscriptionABI,
  relayerWallet
);

// ─────────────────────────────────────────────
//  Verify signature
//  Confirms the message was signed by the claimed wallet
// ─────────────────────────────────────────────
const verifySignature = (message, signature, expectedAddress) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (e) {
    return false;
  }
};

// ─────────────────────────────────────────────
//  Mint NFT on behalf of user
// ─────────────────────────────────────────────
const mintNFTForUser = async ({ tokenURI, title, description, accessType }) => {
  const tx = await sparkMint.createNFT(
    tokenURI,
    title,
    description,
    accessType // 0 = FREE, 1 = SUBSCRIBER_ONLY
  );

  const receipt = await tx.wait();

  // Extract tokenId from NFTCreated event
  const event = receipt.logs
    .map((log) => {
      try {
        return sparkMint.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "NFTCreated");

  const tokenId = event ? event.args.tokenId.toString() : null;

  return {
    txHash: receipt.hash,
    tokenId,
    blockNumber: receipt.blockNumber,
  };
};

// ─────────────────────────────────────────────
//  Register creator on behalf of user
// ─────────────────────────────────────────────
const registerCreatorForUser = async ({ monthlyPriceWei }) => {
  const tx = await creatorSubscription.registerCreator(monthlyPriceWei);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
};

// ─────────────────────────────────────────────
//  Get relayer wallet balance (for monitoring)
// ─────────────────────────────────────────────
const getRelayerBalance = async () => {
  const balance = await provider.getBalance(relayerWallet.address);
  return ethers.formatEther(balance);
};

module.exports = {
  verifySignature,
  mintNFTForUser,
  registerCreatorForUser,
  getRelayerBalance,
  relayerWallet,
};
