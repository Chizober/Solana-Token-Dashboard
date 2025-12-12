# Solana Token Dashboard (Phantom Wallet)

A web-based dashboard to interact with Solana SPL Tokens using the **Phantom Wallet**. Create mints, ATAs, mint, transfer, and burn tokens with live balances.

---

## **Features**

- Connect your Phantom wallet.
- Create a custom SPL Token (mint) with a selected number of decimals.
- Create or fetch your **Associated Token Account (ATA)**.
- Mint tokens into your ATA.
- Transfer tokens to any Solana wallet (auto-creates ATA if missing).
- Burn tokens from your ATA.
- Live token balance display.
- Solana-style clean UI with colored buttons and responsive 2-column layout.

---

## **Tech Stack**

- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- [SPL Token JS](https://github.com/solana-labs/solana-program-library/tree/master/token/js)
- HTML, CSS, JavaScript
- Phantom Wallet (browser extension)

---

## **Installation / Running Locally**

1. Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/solana-token-dashboard.git
cd solana-token-dashboard

```
Install dependencies:
```bash
npm install
```

## **Start a local server (e.g., with Parcel):**
```bash
npx parcel index.html
```

Open your browser at http://localhost:1234 (Parcel default).

Make sure Phantom wallet is installed and connected to Localnet or your target network.

## **Usage**

Connect Phantom wallet using the Connect Wallet button.

Create a mint with the desired decimals.

Create or get your ATA.

Mint tokens to your ATA.

Transfer tokens to another wallet.

Burn tokens from your ATA.

Refresh mint info to view updated balances and supply.

## **Folder Structure**

solana-token-dashboard/
├─ src/
│  └─ index.js      # Main JS logic
├─ index.html       # Dashboard UI
├─ package.json
└─ .gitignore

Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements.

License

MIT License
