# SparkMint Backend API

Off-chain REST API for the SparkMint NFT & creator platform.  
Built with **Node.js**, **Express.js**, **MongoDB Atlas**, and **Mongoose**.

---

## 📁 Project Structure

```
sparkmint-backend/
├── server.js                  # Entry point – starts DB + HTTP server
├── app.js                     # Express app config, middleware, routes
├── package.json
├── .env.example               # Template for environment variables
├── .gitignore
│
├── config/
│   └── db.js                  # MongoDB Atlas connection
│
├── models/
│   ├── User.js                # User / profile schema
│   └── NFT.js                 # NFT metadata schema
│
├── controllers/
│   ├── userController.js      # User route logic
│   └── nftController.js       # NFT route logic
│
├── routes/
│   ├── userRoutes.js          # /api/users endpoints
│   └── nftRoutes.js           # /api/nfts endpoints
│
├── middleware/
│   └── errorMiddleware.js     # notFound + errorHandler
│
└── utils/
    └── helpers.js             # normalizeWallet, successResponse
```

---

## ⚙️ Setup & Installation

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd sparkmint-backend
npm install
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=5000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/sparkmint?retryWrites=true&w=majority
NODE_ENV=development
```

> Get your `MONGO_URI` from **MongoDB Atlas → Connect → Drivers**.

### 3. Run locally

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

You should see:
```
✅  MongoDB connected: cluster0.xxxxx.mongodb.net
🚀  SparkMint API running on port 5000
```

---

## 🔌 API Endpoints

### Health Check

| Method | Endpoint | Description          |
|--------|----------|----------------------|
| GET    | `/`      | API status check     |

---

### Users  `/api/users`

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| POST   | `/api/users`                    | Create or update user by wallet    |
| GET    | `/api/users`                    | Get all users                      |
| GET    | `/api/users?isCreator=true`     | Get creators only                  |
| GET    | `/api/users/:walletAddress`     | Get single user by wallet address  |

---

### NFTs  `/api/nfts`

| Method | Endpoint                             | Description                       |
|--------|--------------------------------------|-----------------------------------|
| POST   | `/api/nfts`                          | Create NFT metadata record        |
| GET    | `/api/nfts`                          | Get all NFTs                      |
| GET    | `/api/nfts?category=art`             | Filter NFTs by category           |
| GET    | `/api/nfts/:id`                      | Get NFT by MongoDB ID             |
| GET    | `/api/nfts/owner/:walletAddress`     | Get NFTs by owner wallet          |
| GET    | `/api/nfts/creator/:walletAddress`   | Get NFTs by creator wallet        |
| PUT    | `/api/nfts/:id`                      | Update NFT record                 |
| DELETE | `/api/nfts/:id`                      | Delete NFT record                 |

---

## 📬 Sample Request Bodies (Postman)

### POST `/api/users` – Create / update user

```json
{
  "walletAddress": "0xAbC123DEF456abc123def456abc123def456ABC1",
  "name": "Aria Nova",
  "email": "aria@sparkmint.io",
  "bio": "Digital artist creating generative art on SparkMint.",
  "avatar": "https://ipfs.io/ipfs/QmAvatarHash",
  "isCreator": true
}
```

---

### POST `/api/nfts` – Create NFT record

```json
{
  "title": "Neon Genesis #001",
  "description": "A generative artwork born from chaos and light.",
  "imageUrl": "https://ipfs.io/ipfs/QmImageHash",
  "creatorWallet": "0xAbC123DEF456abc123def456abc123def456ABC1",
  "ownerWallet": "0xAbC123DEF456abc123def456abc123def456ABC1",
  "tokenId": "1",
  "price": 0.5,
  "category": "art",
  "txHash": "0xTransactionHash123..."
}
```

---

### PUT `/api/nfts/:id` – Transfer ownership (sync after on-chain transfer)

```json
{
  "ownerWallet": "0xNewOwnerWallet123...",
  "price": 0
}
```

---

## 📦 Response Format

All responses follow this consistent structure:

```json
{
  "success": true,
  "message": "NFT created successfully",
  "data": { ... }
}
```

Errors:

```json
{
  "success": false,
  "message": "NFT not found with id: 64abc...",
  "stack": "Error: ... (development only)"
}
```

---

## 🗒️ Notes for Flutter Integration

- Always send `walletAddress` in lowercase or let the backend normalize it.
- Use `POST /api/users` on every wallet connect — it's safe to call repeatedly (upsert).
- After a mint transaction is confirmed on-chain, call `POST /api/nfts` to store the metadata.
- After an on-chain transfer, call `PUT /api/nfts/:id` with the new `ownerWallet` to sync.

---

## 🚀 Deployment

Recommended platforms:
- **Railway** – connect your GitHub repo, add env vars, deploy.
- **Render** – free tier available, set `npm start` as start command.
- **Heroku** – classic PaaS, easy MongoDB Atlas integration.

Make sure to set `NODE_ENV=production` in your deployment environment.
