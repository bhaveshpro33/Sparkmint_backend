/**
 * relayerService.js
 *
 * Handles all blockchain interactions for the relayer.
 * The backend wallet signs and sends transactions on behalf of users.
 */

const { ethers } = require("ethers");
const SparkMintABI = require("../abi/SparkMint.json").abi;
const CreatorSubscriptionABI = require("../abi/CreatorSubscription.json").abi;

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
//  Register creator on-chain (sets monthly price)
// ─────────────────────────────────────────────
const registerCreatorForUser = async ({ monthlyPriceWei }) => {
  const tx = await creatorSubscription.registerCreator(monthlyPriceWei);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
};

// ─────────────────────────────────────────────
//  Subscribe to a creator (monthly subscription)
//  Relayer sends the subscription ETH value along
// ─────────────────────────────────────────────
const subscribeForUser = async ({ creatorWallet, priceWei }) => {
  const tx = await creatorSubscription.subscribe(creatorWallet, {
    value: priceWei,
  });

  const receipt = await tx.wait();

  // Extract expiry from Subscribed event
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
//  Unsubscribe from a creator
// ─────────────────────────────────────────────
const unsubscribeForUser = async ({ creatorWallet }) => {
  const tx = await creatorSubscription.unsubscribe(creatorWallet);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
};

// ─────────────────────────────────────────────
//  Get a creator's monthly subscription price (in wei)
//  Returns "0" if the creator is not registered
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
//  Check if a user is currently subscribed to a creator
// ─────────────────────────────────────────────
const checkSubscription = async ({ subscriberWallet, creatorWallet }) => {
  try {
    return await creatorSubscription.isSubscribed(subscriberWallet, creatorWallet);
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────
//  Get time left on a subscription (in seconds)
// ─────────────────────────────────────────────
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
//  List an NFT for sale on-chain (sets price in contract)
// ─────────────────────────────────────────────
const listNFTForSale = async ({ tokenId, priceWei }) => {
  const tx = await sparkMint.sellNFT(tokenId, priceWei);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
};

// ─────────────────────────────────────────────
//  Buy an NFT on-chain — relayer sends ETH to contract
// ─────────────────────────────────────────────
const buyNFTForUser = async ({ tokenId, priceWei }) => {
  const tx = await sparkMint.buyNFT(tokenId, { value: priceWei });
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
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
