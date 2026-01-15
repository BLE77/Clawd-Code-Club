/**
 * Candy Machine Minting Module for Claude Code Club
 *
 * Handles minting NFTs from the deployed Candy Machine on mainnet.
 * Uses Metaplex Umi SDK for candy machine interactions.
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  mplCandyMachine,
  fetchCandyMachine,
  mintV2,
  fetchCandyGuard,
} from '@metaplex-foundation/mpl-candy-machine';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  publicKey,
  generateSigner,
  transactionBuilder,
  some,
  createNoopSigner,
  signerIdentity,
} from '@metaplex-foundation/umi';
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import { base58 } from '@metaplex-foundation/umi/serializers';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Candy Machine address on mainnet
 */
export const CANDY_MACHINE_ADDRESS = 'bBRSLLFmvyYhquSpAgSS1dbePvyZniHtMT5Ki1ba8Xr';

/**
 * Collection mint address
 */
export const COLLECTION_MINT = 'AkcKbQ5gXkg6Kz7ESWKAJb2i8J7ZKHxDRBZ7JqQ9vTGE';

/**
 * Treasury address (receives mint payments)
 */
export const TREASURY_ADDRESS = 'FaMscSugcz4m7ctQg4TQhb6nsD255ehZXFVCU4pGm4Yp';

/**
 * Mint price in SOL
 */
export const MINT_PRICE_SOL = 0.1;

/**
 * Get RPC endpoint at runtime (after dotenv loads)
 */
export function getRpcEndpoint() {
  const rpc = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  console.log('[candy-machine] Using RPC:', rpc);
  return rpc;
}

// For backwards compatibility
export const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// ═══════════════════════════════════════════════════════════════════════════
// UMI INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let umiInstance = null;
let currentRpc = null;

/**
 * Get or create Umi instance
 */
export function getUmi() {
  const rpc = getRpcEndpoint();
  // Reset instance if RPC changed
  if (!umiInstance || currentRpc !== rpc) {
    console.log('[candy-machine] Creating new Umi instance with RPC:', rpc);
    currentRpc = rpc;
    umiInstance = createUmi(rpc)
      .use(mplCandyMachine())
      .use(mplTokenMetadata());
  }
  return umiInstance;
}

// ═══════════════════════════════════════════════════════════════════════════
// CANDY MACHINE STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get candy machine status
 */
export async function getCandyMachineStatus() {
  const umi = getUmi();
  const cmPubkey = publicKey(CANDY_MACHINE_ADDRESS);

  try {
    const cm = await fetchCandyMachine(umi, cmPubkey);
    const guard = await fetchCandyGuard(umi, cm.mintAuthority);

    const itemsAvailable = Number(cm.data.itemsAvailable);
    const itemsRedeemed = Number(cm.itemsRedeemed);
    const itemsRemaining = itemsAvailable - itemsRedeemed;

    // Get price from guard
    let price = MINT_PRICE_SOL;
    if (guard.guards.solPayment.__option === 'Some') {
      price = Number(guard.guards.solPayment.value.lamports.basisPoints) / 1e9;
    }

    return {
      address: CANDY_MACHINE_ADDRESS,
      collection: COLLECTION_MINT,
      treasury: TREASURY_ADDRESS,
      itemsAvailable,
      itemsRedeemed,
      itemsRemaining,
      price,
      isSoldOut: itemsRemaining === 0,
      isLive: true,
    };
  } catch (error) {
    console.error('Error fetching candy machine:', error);
    throw new Error('Failed to fetch candy machine status');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MINT TRANSACTION BUILDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a mint transaction for the candy machine
 *
 * Returns transaction data that can be signed by the user's wallet
 *
 * @param {string} minterPublicKey - The public key of the minter
 * @returns {Promise<Object>} Transaction data for client signing
 */
export async function buildCandyMachineMintTransaction(minterPublicKey) {
  const cmPubkey = publicKey(CANDY_MACHINE_ADDRESS);

  // Create a noop signer for the minter (will be signed client-side)
  const minterPubkey = publicKey(minterPublicKey);
  const minterSigner = createNoopSigner(minterPubkey);

  // Get Umi instance and set the minter as the signer identity
  const umi = getUmi().use(signerIdentity(minterSigner));

  // Fetch candy machine and guard
  const cm = await fetchCandyMachine(umi, cmPubkey);
  const guard = await fetchCandyGuard(umi, cm.mintAuthority);

  // Check if sold out
  const itemsRemaining = Number(cm.data.itemsAvailable) - Number(cm.itemsRedeemed);
  if (itemsRemaining === 0) {
    throw new Error('Candy machine is sold out!');
  }

  // Generate a new mint keypair for the NFT
  const nftMint = generateSigner(umi);

  // Build the mint transaction with the minter as payer
  const mintBuilder = transactionBuilder()
    .add(setComputeUnitLimit(umi, { units: 800_000 }))
    .add(
      mintV2(umi, {
        candyMachine: cmPubkey,
        nftMint,
        collectionMint: publicKey(COLLECTION_MINT),
        collectionUpdateAuthority: cm.authority,
        candyGuard: cm.mintAuthority,
        payer: minterSigner,
        minter: minterSigner,
        mintArgs: {
          solPayment: some({
            destination: publicKey(TREASURY_ADDRESS),
          }),
        },
      })
    );

  // Build the transaction
  const transaction = await mintBuilder.buildWithLatestBlockhash(umi);

  // Sign with the NFT mint keypair (server-side)
  // The client will add their signature (minter) later
  const signedTx = await nftMint.signTransaction(transaction);

  // Serialize for the client
  const serializedTx = umi.transactions.serialize(signedTx);
  const base64Tx = Buffer.from(serializedTx).toString('base64');

  return {
    transaction: base64Tx,
    nftMint: nftMint.publicKey.toString(),
    // Note: secretKey is NOT sent to client - signing happens server-side
    candyMachine: CANDY_MACHINE_ADDRESS,
    collection: COLLECTION_MINT,
    price: MINT_PRICE_SOL,
    itemsRemaining: itemsRemaining - 1,
  };
}

/**
 * Alternative: Get mint instructions for client-side building
 *
 * This returns the necessary info for the client to build
 * the transaction entirely client-side using @metaplex-foundation/mpl-candy-machine
 */
export function getMintConfig() {
  return {
    candyMachine: CANDY_MACHINE_ADDRESS,
    collection: COLLECTION_MINT,
    treasury: TREASURY_ADDRESS,
    price: MINT_PRICE_SOL,
    rpc: RPC_ENDPOINT,
  };
}

export default {
  CANDY_MACHINE_ADDRESS,
  COLLECTION_MINT,
  TREASURY_ADDRESS,
  MINT_PRICE_SOL,
  RPC_ENDPOINT,
  getUmi,
  getCandyMachineStatus,
  buildCandyMachineMintTransaction,
  getMintConfig,
};
