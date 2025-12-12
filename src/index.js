
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";

import {
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
  createBurnInstruction,
  getAccount,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// DOM elements
const connectBtn = document.getElementById("connectBtn");
const walletInfo = document.getElementById("walletInfo");
const createMintBtn = document.getElementById("createMintBtn");
const decimalsInput = document.getElementById("decimals");
const mintResult = document.getElementById("mintResult");
const mintResult2 = document.getElementById("mintResult2");
const createAccountBtn = document.getElementById("createAccountBtn");
const accountResult = document.getElementById("accountResult");
const mintAmount = document.getElementById("mintAmount");
const mintBtn = document.getElementById("mintBtn");
const transferBtn = document.getElementById("transferBtn");
const destWalletInput = document.getElementById("destWallet");
const transferAmount = document.getElementById("transferAmount");
const transferResult = document.getElementById("transferResult");
const burnBtn = document.getElementById("burnBtn");
const burnAmount = document.getElementById("burnAmount");
const burnResult = document.getElementById("burnResult");
const refreshMintBtn = document.getElementById("refreshMintBtn");
const mintInfoEl = document.getElementById("mintInfo");

// Connection (local validator)
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// State
let provider = null; // Phantom provider
let walletPubkey = null; // PublicKey object
let currentMint = null; // PublicKey
let currentMyATA = null; // PublicKey
let currentDecimals = 6;

// Detect Phantom
function getProvider() {
  if ("solana" in window && window.solana.isPhantom) return window.solana;
  return null;
}
async function airdropSolIfNeeded(pubkey, amountSOL = 2) {
  const balance = await connection.getBalance(pubkey);
  if (balance < amountSOL * 1e9) { // convert SOL to lamports
    console.log(`Airdropping ${amountSOL} SOL to ${pubkey.toString()}...`);
    const sig = await connection.requestAirdrop(pubkey, amountSOL * 1e9);
    await connection.confirmTransaction(sig, "confirmed");
    console.log("Airdrop complete!");
  } else {
    console.log("Wallet has enough SOL, no airdrop needed.");
  }
}

// Connect Phantom wallet
async function connectWallet() {
  provider = getProvider();
  if (!provider) {
    walletInfo.innerText = "Phantom not found. Install Phantom extension.";
    return;
  }
  try {
    const resp = await provider.connect();
    // provider.publicKey is a PublicKey-like object; ensure we keep real PublicKey
    walletPubkey = resp.publicKey;
    walletInfo.innerHTML = `Wallet: <code>${walletPubkey.toString()}</code>`;
    console.log("Connected:", walletPubkey.toString());
    // ✅ Airdrop SOL automatically on localnet
    await airdropSolIfNeeded(walletPubkey, 2);
    console.log("Wallet ready with SOL!");
  } catch (err) {
    console.error("Wallet connect error:", err);
    walletInfo.innerText = `Wallet connect error: ${err.message || err}`;
  }
}
connectBtn.addEventListener("click", connectWallet);

// Refresh mint info
async function refreshMintInfo() {
  if (!currentMint) {
    mintInfoEl.innerText = "No mint created yet.";
    return;
  }
  try {
    const mintData = await getMint(connection, currentMint);
    const lines = [
      `Mint: ${currentMint.toString()}`,
      `Decimals: ${mintData.decimals}`,
      `Supply (raw): ${mintData.supply.toString()}`,
      `Mint Authority: ${mintData.mintAuthority?.toString() || "null"}`,
      `Freeze Authority: ${mintData.freezeAuthority?.toString() || "null"}`,
    ];
    mintInfoEl.innerText = lines.join("\n");
  } catch (err) {
    console.error(err);
    mintInfoEl.innerText = "Failed to fetch mint info: " + (err.message || err);
  }
}

// CREATE MINT
createMintBtn.addEventListener("click", async () => {
  if (!walletPubkey) {
    mintResult.innerText = "Connect Phantom first.";
    return;
  }
  const decimals = Number(decimalsInput.value || 6);
  mintResult.innerText = "Creating mint...";

  try {
    const mintKeypair = Keypair.generate();
    const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: walletPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        walletPubkey,
        null
      )
    );

    tx.feePayer = walletPubkey;

    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;

    // partial sign with the mint keypair first (local signer)
    tx.partialSign(mintKeypair);

    // Now ask Phantom to sign (payer/mint authority)
    const signedTx = await provider.signTransaction(tx);

    // send
    const sig = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    currentMint = mintKeypair.publicKey;
    currentDecimals = decimals;
    mintResult.innerHTML = `Created mint: <code>${currentMint.toString()}</code>`;
    await refreshMintInfo();
  } catch (err) {
    console.error(err);
    mintResult.innerText = "Failed to create mint: " + (err.message || err);
  }
});

// CREATE / GET ATA for connected wallet
createAccountBtn.addEventListener("click", async () => {
  if (!walletPubkey || !currentMint) {
    accountResult.innerText = "Connect wallet and create a mint first.";
    return;
  }

  try {
    const ataAddress = await getAssociatedTokenAddress(currentMint, walletPubkey, false);

    const ataInfo = await connection.getAccountInfo(ataAddress);
    if (ataInfo !== null) {
      currentMyATA = ataAddress;
      accountResult.innerText = `ATA already exists: ${ataAddress.toString()}`;
      return;
    }

    const ix = createAssociatedTokenAccountInstruction(
      walletPubkey, // payer
      ataAddress,   // ATA
      walletPubkey, // owner
      currentMint
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = walletPubkey;
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    

    // Phantom signs (payer)
    const signedTx = await provider.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    currentMyATA = ataAddress;
    accountResult.innerText = `ATA created: ${ataAddress.toString()}`;
  } catch (err) {
    console.error(err);
    accountResult.innerText = "Failed to create ATA: " + (err.message || err);
  }
});


// MINT TOKENS into our ATA
mintBtn.addEventListener("click", async () => {
  if (!currentMint || !currentMyATA) {
    mintResult2.innerText = "Create mint and ATA first.";
    return;
  }

  const amount = Number(mintAmount.value || 0);
  if (amount <= 0) {
    mintResult2.innerText = "Enter a valid amount.";
    return;
  }

  mintResult2.innerText = "Minting...";

  try {
    const rawAmount = BigInt(amount) * (BigInt(10) ** BigInt(currentDecimals));

    const ix = createMintToInstruction(
      currentMint,
      currentMyATA,
      walletPubkey,
      rawAmount
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = walletPubkey;
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;

    const signedTx = await provider.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    // Fetch updated account info for live balance
    const ataAccount = await getAccount(connection, currentMyATA);
    const balance = Number(ataAccount.amount) / (10 ** currentDecimals);

    mintResult2.innerHTML = `Minted <strong>${amount}</strong> tokens.<br>New balance: <strong>${balance}</strong> (tx: <code>${sig}</code>)`;
  } catch (err) {
    console.error(err);
    mintResult2.innerText = "Mint failed: " + (err.message || err);
  }
});

// TRANSFER TOKENS to another wallet's ATA (creates destination ATA if missing)
// TRANSFER TOKENS to another wallet's ATA (creates destination ATA if missing)
document.getElementById("transferBtn").onclick = async () => {
  try {
    if (!currentMint || !walletPubkey) {
      transferResult.innerText = "Create mint and connect wallet first.";
      return;
    }

    // ⭐ FIXED: validate destination wallet
    const destWalletStr = destWalletInput.value.trim();
    if (!destWalletStr) throw new Error("Destination wallet cannot be empty");

    let destWallet;
    try {
      destWallet = new PublicKey(destWalletStr);
    } catch (e) {
      throw new Error("Invalid destination wallet address");
    }

    const amount = Number(transferAmount.value);
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const mintPubkey = currentMint;

    // FIXED: must include false
    const senderATA = await getAssociatedTokenAddress(
      mintPubkey,
      walletPubkey,
      false
    );

    const receiverATA = await getAssociatedTokenAddress(
      mintPubkey,
      destWallet,
      false
    );

    const ixList = [];

    // Auto-create receiver ATA if missing
    const receiverInfo = await connection.getAccountInfo(receiverATA);
    if (!receiverInfo) {
      ixList.push(
        createAssociatedTokenAccountInstruction(
          walletPubkey,
          receiverATA,
          destWallet,
          mintPubkey
        )
      );
    }

    const rawAmount = BigInt(amount) * (10n ** BigInt(currentDecimals));

    ixList.push(
      createTransferInstruction(
        senderATA,
        receiverATA,
        walletPubkey,
        rawAmount
      )
    );

    const tx = new Transaction().add(...ixList);
    tx.feePayer = walletPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signedTx = await provider.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signedTx.serialize());

    transferResult.innerHTML = `Transfer successful<br>Tx: <code>${sig}</code>`;

  } catch (err) {
    console.error(err);
    transferResult.innerText = "Transfer failed: " + err.message;
  }
};



// BURN TOKENS from our ATA
burnBtn.addEventListener("click", async () => {
  if (!currentMint || !currentMyATA) {
    burnResult.innerText = "Create mint and ATA first.";
    return;
  }

  const amount = Number(burnAmount.value || 0);
  if (amount <= 0) {
    burnResult.innerText = "Enter a valid amount.";
    return;
  }

  burnResult.innerText = "Burning...";

  try {
    const rawAmount = BigInt(amount) * (BigInt(10) ** BigInt(currentDecimals));

    const burnIx = createBurnInstruction(
      currentMyATA,
      currentMint,
      walletPubkey,
      rawAmount
    );

    const tx = new Transaction().add(burnIx);
    tx.feePayer = walletPubkey;
    tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;

    const signedTx = await provider.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    const ataAccount = await getAccount(connection, currentMyATA);
    burnResult.innerHTML = `Burned ${amount} tokens. New balance: ${ataAccount.amount.toString()} (tx: <code>${sig}</code>)`;
  } catch (err) {
    console.error(err);
    burnResult.innerText = "Burn failed: " + (err.message || err);
  }
});

// Refresh mint info button
refreshMintBtn.addEventListener("click", refreshMintInfo);


