/**
 * Solana Transaction Building Module for Claude Code Club
 *
 * Provides server-side functionality for building and verifying Solana transactions.
 * This is an MVP implementation using simple SOL transfers + memos as proof of mint.
 * Production version would use Metaplex for actual NFT minting.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mint price in lamports (0.1 SOL = 100,000,000 lamports)
 */
export const MINT_PRICE = 100_000_000; // 0.1 SOL

/**
 * Mint price in SOL for display purposes
 */
export const MINT_PRICE_SOL = MINT_PRICE / LAMPORTS_PER_SOL;

/**
 * Treasury address to receive mint payments
 * Mainnet treasury for Claude Code Club
 */
export const TREASURY_ADDRESS = new PublicKey(
  'FaMscSugcz4m7ctQg4TQhb6nsD255ehZXFVCU4pGm4Yp'
);

/**
 * CCC Registry Program ID on devnet
 */
export const PROGRAM_ID = new PublicKey(
  '3NMfJUekQcMQnt5H4q5JccSi1YDgzdMaiu68AFjKLwPs'
);

/**
 * Memo program ID for adding on-chain proof
 */
export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

/**
 * Default RPC endpoint - uses mainnet, configurable via environment
 */
export const RPC_ENDPOINT =
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

/**
 * Network name for display purposes
 */
export const NETWORK = process.env.SOLANA_NETWORK || 'devnet';

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cached connection instance
 */
let connectionInstance = null;

/**
 * Get or create a Solana connection
 * @returns {Connection} Solana connection instance
 */
export function getConnection() {
  if (!connectionInstance) {
    connectionInstance = new Connection(RPC_ENDPOINT, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return connectionInstance;
}

/**
 * Reset the connection (useful for testing or switching networks)
 */
export function resetConnection() {
  connectionInstance = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION BUILDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a mint transaction for Claude Code Club NFT
 *
 * Creates a transaction that:
 * 1. Transfers MINT_PRICE SOL to the treasury
 * 2. Includes a memo with the GitHub username for on-chain proof
 *
 * @param {string} payerPublicKey - The public key of the wallet paying for the mint
 * @param {string} githubUsername - GitHub username to include in memo as proof
 * @param {Object} options - Optional configuration
 * @param {number} options.customPrice - Override the default mint price (in lamports)
 * @param {string} options.treasuryAddress - Override the default treasury address
 * @returns {Promise<{transaction: string, blockhash: string, lastValidBlockHeight: number}>}
 *          Serialized transaction data for client signing
 */
export async function buildMintTransaction(
  payerPublicKey,
  githubUsername,
  options = {}
) {
  const connection = getConnection();

  // Validate inputs
  if (!payerPublicKey) {
    throw new Error('Payer public key is required');
  }

  if (!githubUsername || typeof githubUsername !== 'string') {
    throw new Error('GitHub username is required');
  }

  // Sanitize GitHub username (alphanumeric, hyphens, max 39 chars per GitHub rules)
  const sanitizedUsername = githubUsername
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 39);

  if (sanitizedUsername.length === 0) {
    throw new Error('Invalid GitHub username');
  }

  // Parse addresses
  let payer;
  try {
    payer = new PublicKey(payerPublicKey);
  } catch (e) {
    throw new Error('Invalid payer public key');
  }

  const treasury = options.treasuryAddress
    ? new PublicKey(options.treasuryAddress)
    : TREASURY_ADDRESS;

  const price = options.customPrice || MINT_PRICE;

  // Get latest blockhash for transaction
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  // Create the transaction
  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  });

  // 1. SOL Transfer instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: treasury,
    lamports: price,
  });
  transaction.add(transferInstruction);

  // 2. Memo instruction with GitHub username and pool ID for on-chain proof
  const memoData = JSON.stringify({
    type: 'claude-code-club-mint',
    version: '1.1',
    github: sanitizedUsername,
    poolId: options.poolId || null,
    tokenId: options.tokenId || null,
    timestamp: Date.now(),
  });

  const memoInstruction = new TransactionInstruction({
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoData, 'utf-8'),
  });
  transaction.add(memoInstruction);

  // Serialize the transaction for client-side signing
  // Using requireAllSignatures: false since client will sign
  const serializedTransaction = transaction
    .serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
    .toString('base64');

  return {
    transaction: serializedTransaction,
    blockhash,
    lastValidBlockHeight,
    price,
    priceSol: price / LAMPORTS_PER_SOL,
    treasury: treasury.toBase58(),
    memo: memoData,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify that a transaction was confirmed on-chain
 *
 * @param {string} signature - The transaction signature to verify
 * @param {Object} options - Optional configuration
 * @param {number} options.timeout - Maximum time to wait for confirmation (ms)
 * @param {string} options.commitment - Commitment level ('confirmed' | 'finalized')
 * @returns {Promise<{confirmed: boolean, slot?: number, err?: any, confirmationStatus?: string}>}
 */
export async function verifyTransaction(signature, options = {}) {
  const connection = getConnection();
  const timeout = options.timeout || 60000;
  const commitment = options.commitment || 'confirmed';

  try {
    // First, try to get the transaction status directly
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    if (status?.value) {
      const { confirmationStatus, err } = status.value;

      // Check if it meets our commitment level
      const isConfirmed =
        commitment === 'confirmed'
          ? confirmationStatus === 'confirmed' ||
            confirmationStatus === 'finalized'
          : confirmationStatus === 'finalized';

      if (isConfirmed && !err) {
        return {
          confirmed: true,
          slot: status.value.slot,
          confirmationStatus,
        };
      }

      if (err) {
        return {
          confirmed: false,
          err,
          confirmationStatus,
        };
      }
    }

    // If not found or not confirmed yet, wait for confirmation
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const result = await connection.confirmTransaction(
        {
          signature,
          blockhash: (await connection.getLatestBlockhash()).blockhash,
          lastValidBlockHeight: (await connection.getLatestBlockhash())
            .lastValidBlockHeight,
        },
        commitment
      );

      if (result.value.err) {
        return {
          confirmed: false,
          err: result.value.err,
        };
      }

      // Double-check with getSignatureStatus
      const finalStatus = await connection.getSignatureStatus(signature);
      if (finalStatus?.value?.confirmationStatus) {
        return {
          confirmed: true,
          slot: finalStatus.value.slot,
          confirmationStatus: finalStatus.value.confirmationStatus,
        };
      }
    }

    return {
      confirmed: false,
      err: 'Timeout waiting for confirmation',
    };
  } catch (error) {
    return {
      confirmed: false,
      err: error.message || 'Unknown error during verification',
    };
  }
}

/**
 * Get transaction details including memo data
 *
 * @param {string} signature - The transaction signature
 * @returns {Promise<Object|null>} Transaction details or null if not found
 */
export async function getTransactionDetails(signature) {
  const connection = getConnection();

  try {
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return null;
    }

    // Extract memo data if present
    let memoData = null;
    const memoInstruction = transaction.transaction.message.instructions.find(
      (ix) => ix.programId?.toBase58() === MEMO_PROGRAM_ID.toBase58()
    );

    if (memoInstruction && 'data' in memoInstruction) {
      try {
        memoData = JSON.parse(memoInstruction.data);
      } catch (e) {
        memoData = memoInstruction.data;
      }
    }

    // Extract transfer amount
    let transferAmount = null;
    const transferInstruction =
      transaction.transaction.message.instructions.find(
        (ix) =>
          ix.programId?.toBase58() === SystemProgram.programId.toBase58() &&
          ix.parsed?.type === 'transfer'
      );

    if (transferInstruction?.parsed?.info) {
      transferAmount = transferInstruction.parsed.info.lamports;
    }

    return {
      signature,
      slot: transaction.slot,
      blockTime: transaction.blockTime,
      fee: transaction.meta?.fee,
      success: transaction.meta?.err === null,
      memo: memoData,
      transferAmount,
      transferAmountSol: transferAmount ? transferAmount / LAMPORTS_PER_SOL : null,
    };
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current balance of an account
 *
 * @param {string} publicKey - The public key to check
 * @returns {Promise<{lamports: number, sol: number}>} Balance in lamports and SOL
 */
export async function getBalance(publicKey) {
  const connection = getConnection();

  try {
    const pubkey = new PublicKey(publicKey);
    const lamports = await connection.getBalance(pubkey);
    return {
      lamports,
      sol: lamports / LAMPORTS_PER_SOL,
    };
  } catch (error) {
    throw new Error(`Failed to get balance: ${error.message}`);
  }
}

/**
 * Check if an account has sufficient balance for minting
 *
 * @param {string} publicKey - The public key to check
 * @param {number} estimatedFee - Estimated transaction fee in lamports (default: 5000)
 * @returns {Promise<{sufficient: boolean, balance: number, required: number, deficit: number}>}
 */
export async function hasSufficientBalance(publicKey, estimatedFee = 5000) {
  const { lamports } = await getBalance(publicKey);
  const required = MINT_PRICE + estimatedFee;

  return {
    sufficient: lamports >= required,
    balance: lamports,
    balanceSol: lamports / LAMPORTS_PER_SOL,
    required,
    requiredSol: required / LAMPORTS_PER_SOL,
    deficit: Math.max(0, required - lamports),
    deficitSol: Math.max(0, required - lamports) / LAMPORTS_PER_SOL,
  };
}

/**
 * Get network configuration info
 *
 * @returns {Object} Network configuration details
 */
export function getNetworkConfig() {
  return {
    network: NETWORK,
    rpcEndpoint: RPC_ENDPOINT,
    treasuryAddress: TREASURY_ADDRESS.toBase58(),
    mintPrice: MINT_PRICE,
    mintPriceSol: MINT_PRICE_SOL,
    memoProgram: MEMO_PROGRAM_ID.toBase58(),
  };
}

// Default export for convenience
export default {
  // Constants
  MINT_PRICE,
  MINT_PRICE_SOL,
  TREASURY_ADDRESS,
  MEMO_PROGRAM_ID,
  RPC_ENDPOINT,
  NETWORK,
  // Connection
  getConnection,
  resetConnection,
  // Transaction building
  buildMintTransaction,
  // Verification
  verifyTransaction,
  getTransactionDetails,
  // Utilities
  getBalance,
  hasSufficientBalance,
  getNetworkConfig,
};
