/**
 * relayerService.js
 *
 * Relayer handles:
 * - NFT minting
 * - NFT buy/sell
 * - Creator registration / subscription relays
 * - Blockchain read calls
 */

const { ethers } = require("ethers");
const SparkMintABI = require("../abi/SparkMint.json").abi;
const CreatorSubscriptionABI = require("../abi/CreatorSubscription.json").abi;

// ─────────────────────────────────────────────
// Setup provider and relayer wallet
// ─────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const relayerWallet = new ethers.Wallet(
  process.env.RELAYER_PRIVATE_KEY,
  provider
);

// ─────────────────────────────────────────────
// Contract instances
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
// Verify signature
// ─────────────────────────────────────────────
const verifySignature = (message, signature, expectedAddress) => {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────
// NFT mint via relayer
// ─────────────────────────────────────────────
const mintNFTForUser = async ({ tokenURI, title, description, accessType }) => {
  const tx = await sparkMint.createNFT(
    tokenURI,
    title,
    description,
    accessType
  );

  const receipt = await tx.wait();

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
// Creator registration via relayer
// Uses new contract function: registerCreatorFor(address,uint256)
// ─────────────────────────────────────────────
const registerCreatorForUser = async ({ creatorWallet, monthlyPriceWei }) => {
  const tx = await creatorSubscription.registerCreatorFor(
    creatorWallet,
    monthlyPriceWei
  );

  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

// ─────────────────────────────────────────────
// Subscribe via relayer
// Uses new contract function: subscribeFor(address,address)
// ─────────────────────────────────────────────
const subscribeForUser = async ({ subscriberWallet, creatorWallet, priceWei }) => {
  const tx = await creatorSubscription.subscribeFor(
    subscriberWallet,
    creatorWallet,
    { value: priceWei }
  );

  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try {
        return creatorSubscription.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e && e.name === "Subscribed");

  const expiresAt = event ? event.args.expiry.toString() : null;

  return {
    txHash: receipt.hash,
    expiresAt,
    blockNumber: receipt.blockNumber,
  };
};

// ─────────────────────────────────────────────
// Unsubscribe via relayer
// Uses new contract function: unsubscribeFor(address,address)
// ─────────────────────────────────────────────
const unsubscribeForUser = async ({ subscriberWallet, creatorWallet }) => {
  const tx = await creatorSubscription.unsubscribeFor(
    subscriberWallet,
    creatorWallet
  );

  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

// ─────────────────────────────────────────────
// Read creator price from blockchain
// ─────────────────────────────────────────────
const getCreatorPrice = async (creatorWallet) => {
  try {
    const price = await creatorSubscription.creatorPrice(creatorWallet);
    return price.toString();
  } catch {
    return "0";
  }
};

// ─────────────────────────────────────────────
// Read subscription status from blockchain
// ─────────────────────────────────────────────
const checkSubscription = async ({ subscriberWallet, creatorWallet }) => {
  try {
    return await creatorSubscription.isSubscribed(
      subscriberWallet,
      creatorWallet
    );
  } catch {
    return false;
  }
};

const getSubscriptionTimeLeft = async ({ subscriberWallet, creatorWallet }) => {
  try {
    const timeLeft = await creatorSubscription.subscriptionTimeLeft(
      subscriberWallet,
      creatorWallet
    );
    return timeLeft.toString();
  } catch {
    return "0";
  }
};

// ─────────────────────────────────────────────
// NFT market actions via relayer
// ─────────────────────────────────────────────
const listNFTForSale = async ({ tokenId, priceWei }) => {
  const tx = await sparkMint.sellNFT(tokenId, priceWei);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

const buyNFTForUser = async ({ tokenId, priceWei }) => {
  const tx = await sparkMint.buyNFT(tokenId, { value: priceWei });
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

// ─────────────────────────────────────────────
// Relayer balance
// ─────────────────────────────────────────────
const getRelayerBalance = async () => {
  const balance = await provider.getBalance(relayerWallet.address);
  return ethers.formatEther(balance);
};

module.exports = {
  verifySignature,
  mintNFTForUser,
  registerCreatorForUser,
  subscribeForUser,
  unsubscribeForUser,
  getCreatorPrice,
  checkSubscription,
  getSubscriptionTimeLeft,
  listNFTForSale,
  buyNFTForUser,
  getRelayerBalance,
  relayerWallet,
};