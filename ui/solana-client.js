/**
 * Solana Client Module for Claude Code Club
 *
 * Browser-side functionality for handling Solana transactions.
 * Handles transaction deserialization, display, and submission to RPC.
 *
 * This module is designed to work with browser wallet adapters (e.g., Phantom, Solflare)
 * and the server-side transaction building module.
 */

import {
  Connection,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from '@solana/web3.js';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS (must match server/solana.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mint price in lamports (0.1 SOL = 100,000,000 lamports)
 */
export const MINT_PRICE = 100_000_000;

/**
 * Mint price in SOL for display
 */
export const MINT_PRICE_SOL = MINT_PRICE / LAMPORTS_PER_SOL;

/**
 * Treasury address (must match server)
 */
export const TREASURY_ADDRESS = 'FaMscSugcz4m7ctQg4TQhb6nsD255ehZXFVCU4pGm4Yp';

/**
 * Candy Machine address
 */
export const CANDY_MACHINE_ADDRESS = 'bBRSLLFmvyYhquSpAgSS1dbePvyZniHtMT5Ki1ba8Xr';

/**
 * Collection mint address
 */
export const COLLECTION_MINT = 'AkcKbQ5gXkg6Kz7ESWKAJb2i8J7ZKHxDRBZ7JqQ9vTGE';

/**
 * Memo program ID
 */
export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

/**
 * RPC endpoint - mainnet by default
 */
export const RPC_ENDPOINT =
  (typeof window !== 'undefined' && window.SOLANA_RPC_ENDPOINT) ||
  'https://api.mainnet-beta.solana.com';

/**
 * Network name
 */
export const NETWORK =
  (typeof window !== 'undefined' && window.SOLANA_NETWORK) || 'mainnet-beta';

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cached connection instance
 */
let connectionInstance = null;

/**
 * Get or create a Solana connection for browser use
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

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION DESERIALIZATION & DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deserialize a base64-encoded transaction from the server
 *
 * @param {string} serializedTransaction - Base64-encoded serialized transaction
 * @returns {Transaction} Deserialized transaction object
 */
export function deserializeTransaction(serializedTransaction) {
  if (!serializedTransaction || typeof serializedTransaction !== 'string') {
    throw new Error('Invalid serialized transaction');
  }

  try {
    const buffer = Buffer.from(serializedTransaction, 'base64');
    return Transaction.from(buffer);
  } catch (error) {
    throw new Error(`Failed to deserialize transaction: ${error.message}`);
  }
}

/**
 * Extract and format transaction details for display to user
 *
 * @param {string} serializedTransaction - Base64-encoded serialized transaction
 * @returns {Object} Formatted transaction details for UI display
 */
export function getTransactionDetails(serializedTransaction) {
  const transaction = deserializeTransaction(serializedTransaction);

  const details = {
    feePayer: transaction.feePayer?.toBase58() || 'Unknown',
    recentBlockhash: transaction.recentBlockhash || 'Unknown',
    instructions: [],
    totalAmount: 0,
    estimatedFee: 5000, // Standard fee estimate in lamports
  };

  // Parse each instruction
  for (const instruction of transaction.instructions) {
    const programId = instruction.programId.toBase58();

    if (programId === SystemProgram.programId.toBase58()) {
      // System program instruction (likely transfer)
      const parsed = parseTransferInstruction(instruction);
      if (parsed) {
        details.instructions.push({
          type: 'transfer',
          program: 'System Program',
          from: parsed.from,
          to: parsed.to,
          amount: parsed.lamports,
          amountSol: parsed.lamports / LAMPORTS_PER_SOL,
        });
        details.totalAmount += parsed.lamports;
      }
    } else if (programId === MEMO_PROGRAM_ID) {
      // Memo instruction
      const memoData = parseMemoInstruction(instruction);
      details.instructions.push({
        type: 'memo',
        program: 'Memo Program',
        data: memoData,
      });
    } else {
      // Unknown program
      details.instructions.push({
        type: 'unknown',
        program: programId,
        dataLength: instruction.data?.length || 0,
      });
    }
  }

  details.totalAmountSol = details.totalAmount / LAMPORTS_PER_SOL;
  details.totalWithFee = details.totalAmount + details.estimatedFee;
  details.totalWithFeeSol = details.totalWithFee / LAMPORTS_PER_SOL;

  return details;
}

/**
 * Parse a System Program transfer instruction
 *
 * @param {TransactionInstruction} instruction - The instruction to parse
 * @returns {Object|null} Parsed transfer data or null if not a transfer
 */
function parseTransferInstruction(instruction) {
  try {
    // Transfer instruction layout:
    // - 4 bytes: instruction type (2 = transfer)
    // - 8 bytes: lamports (little-endian u64)
    if (instruction.data.length < 12) {
      return null;
    }

    const instructionType = instruction.data.readUInt32LE(0);
    if (instructionType !== 2) {
      return null; // Not a transfer instruction
    }

    // Read lamports as BigInt then convert to number
    const lamportsLow = instruction.data.readUInt32LE(4);
    const lamportsHigh = instruction.data.readUInt32LE(8);
    const lamports = lamportsHigh * 0x100000000 + lamportsLow;

    return {
      from: instruction.keys[0]?.pubkey?.toBase58() || 'Unknown',
      to: instruction.keys[1]?.pubkey?.toBase58() || 'Unknown',
      lamports,
    };
  } catch (error) {
    console.error('Error parsing transfer instruction:', error);
    return null;
  }
}

/**
 * Parse a Memo program instruction
 *
 * @param {TransactionInstruction} instruction - The instruction to parse
 * @returns {Object|string} Parsed memo data
 */
function parseMemoInstruction(instruction) {
  try {
    const memoString = instruction.data.toString('utf-8');
    // Try to parse as JSON
    try {
      return JSON.parse(memoString);
    } catch {
      return memoString;
    }
  } catch (error) {
    return 'Unable to parse memo';
  }
}

/**
 * Format transaction details as human-readable HTML for display
 *
 * @param {Object} details - Transaction details from getTransactionDetails()
 * @returns {string} HTML string for display
 */
export function formatTransactionDetailsHTML(details) {
  let html = '<div class="transaction-details">';

  html += '<h4>Transaction Summary</h4>';
  html += `<p><strong>Network:</strong> ${NETWORK}</p>`;
  html += `<p><strong>Fee Payer:</strong> <code>${truncateAddress(details.feePayer)}</code></p>`;

  html += '<h4>Instructions</h4>';
  html += '<ul>';

  for (const instr of details.instructions) {
    if (instr.type === 'transfer') {
      html += `<li>
        <strong>Transfer:</strong> ${instr.amountSol.toFixed(4)} SOL<br>
        <small>To: <code>${truncateAddress(instr.to)}</code></small>
      </li>`;
    } else if (instr.type === 'memo') {
      const memoDisplay =
        typeof instr.data === 'object'
          ? `GitHub: ${instr.data.github || 'Unknown'}`
          : instr.data;
      html += `<li><strong>Memo:</strong> ${memoDisplay}</li>`;
    } else {
      html += `<li><strong>Program:</strong> <code>${truncateAddress(instr.program)}</code></li>`;
    }
  }

  html += '</ul>';

  html += '<div class="total-section">';
  html += `<p><strong>Total Amount:</strong> ${details.totalAmountSol.toFixed(4)} SOL</p>`;
  html += `<p><strong>Estimated Fee:</strong> ~${(details.estimatedFee / LAMPORTS_PER_SOL).toFixed(6)} SOL</p>`;
  html += `<p class="grand-total"><strong>Total + Fee:</strong> ~${details.totalWithFeeSol.toFixed(4)} SOL</p>`;
  html += '</div>';

  html += '</div>';

  return html;
}

/**
 * Truncate a Solana address for display
 *
 * @param {string} address - Full address
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string} Truncated address
 */
export function truncateAddress(address, startChars = 4, endChars = 4) {
  if (!address || address.length <= startChars + endChars + 3) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION SUBMISSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a signed transaction to the RPC
 *
 * @param {Transaction} signedTransaction - Signed transaction object
 * @param {Object} options - Options for sending
 * @param {boolean} options.skipPreflight - Skip preflight checks (default: false)
 * @param {string} options.preflightCommitment - Preflight commitment level
 * @returns {Promise<string>} Transaction signature
 */
export async function sendSignedTransaction(signedTransaction, options = {}) {
  const connection = getConnection();

  try {
    // Serialize the signed transaction
    const rawTransaction = signedTransaction.serialize();

    // Send to network
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: options.skipPreflight || false,
      preflightCommitment: options.preflightCommitment || 'confirmed',
    });

    return signature;
  } catch (error) {
    // Extract detailed error message if available
    let errorMessage = error.message || 'Unknown error';

    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }

    throw new Error(`Failed to send transaction: ${errorMessage}`);
  }
}

/**
 * Send a signed transaction and wait for confirmation
 *
 * @param {Transaction} signedTransaction - Signed transaction object
 * @param {Object} options - Options for sending and confirming
 * @param {string} options.commitment - Commitment level for confirmation
 * @param {number} options.timeout - Timeout in milliseconds
 * @returns {Promise<{signature: string, confirmed: boolean, slot?: number}>}
 */
export async function sendAndConfirmTransaction(
  signedTransaction,
  options = {}
) {
  const connection = getConnection();
  const commitment = options.commitment || 'confirmed';
  const timeout = options.timeout || 60000;

  // Send the transaction
  const signature = await sendSignedTransaction(signedTransaction, options);

  // Wait for confirmation
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await connection.getSignatureStatus(signature);

    if (status?.value) {
      const { confirmationStatus, err } = status.value;

      if (err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(err)}`
        );
      }

      const isConfirmed =
        commitment === 'confirmed'
          ? confirmationStatus === 'confirmed' ||
            confirmationStatus === 'finalized'
          : confirmationStatus === 'finalized';

      if (isConfirmed) {
        return {
          signature,
          confirmed: true,
          slot: status.value.slot,
          confirmationStatus,
        };
      }
    }

    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    signature,
    confirmed: false,
    error: 'Timeout waiting for confirmation',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WALLET INTEGRATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a wallet is connected (generic check for common wallet adapters)
 *
 * @returns {boolean} Whether a wallet appears to be connected
 */
export function isWalletConnected() {
  if (typeof window === 'undefined') return false;

  // Check for Phantom
  if (window.solana?.isConnected) return true;

  // Check for Solflare
  if (window.solflare?.isConnected) return true;

  // Check for generic wallet adapter
  if (window.solanaWallet?.connected) return true;

  return false;
}

/**
 * Get the connected wallet's public key
 *
 * @returns {string|null} Public key as base58 string or null if not connected
 */
export function getConnectedWallet() {
  if (typeof window === 'undefined') return null;

  // Check Phantom
  if (window.solana?.publicKey) {
    return window.solana.publicKey.toBase58();
  }

  // Check Solflare
  if (window.solflare?.publicKey) {
    return window.solflare.publicKey.toBase58();
  }

  // Check generic wallet adapter
  if (window.solanaWallet?.publicKey) {
    return window.solanaWallet.publicKey.toBase58();
  }

  return null;
}

/**
 * Request wallet connection (attempts common wallet providers)
 *
 * @returns {Promise<string>} Connected wallet public key
 */
export async function connectWallet() {
  if (typeof window === 'undefined') {
    throw new Error('Wallet connection requires browser environment');
  }

  // Try Phantom first
  if (window.solana) {
    try {
      const response = await window.solana.connect();
      return response.publicKey.toBase58();
    } catch (error) {
      if (error.code !== 4001) {
        // 4001 = user rejected
        console.error('Phantom connection error:', error);
      }
    }
  }

  // Try Solflare
  if (window.solflare) {
    try {
      await window.solflare.connect();
      return window.solflare.publicKey.toBase58();
    } catch (error) {
      console.error('Solflare connection error:', error);
    }
  }

  throw new Error(
    'No compatible wallet found. Please install Phantom or Solflare.'
  );
}

/**
 * Sign a transaction using the connected wallet
 *
 * @param {Transaction} transaction - Transaction to sign
 * @returns {Promise<Transaction>} Signed transaction
 */
export async function signTransaction(transaction) {
  if (typeof window === 'undefined') {
    throw new Error('Transaction signing requires browser environment');
  }

  // Try Phantom
  if (window.solana?.signTransaction) {
    return await window.solana.signTransaction(transaction);
  }

  // Try Solflare
  if (window.solflare?.signTransaction) {
    return await window.solflare.signTransaction(transaction);
  }

  throw new Error('No wallet available for signing');
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get wallet balance
 *
 * @param {string} publicKey - Wallet public key
 * @returns {Promise<{lamports: number, sol: number}>}
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
 * Check if wallet has sufficient balance for minting
 *
 * @param {string} publicKey - Wallet public key
 * @returns {Promise<{sufficient: boolean, balance: number, required: number}>}
 */
export async function checkMintBalance(publicKey) {
  const { lamports, sol } = await getBalance(publicKey);
  const estimatedFee = 5000; // Standard transaction fee
  const required = MINT_PRICE + estimatedFee;

  return {
    sufficient: lamports >= required,
    balance: lamports,
    balanceSol: sol,
    required,
    requiredSol: required / LAMPORTS_PER_SOL,
    deficit: Math.max(0, required - lamports),
    deficitSol: Math.max(0, (required - lamports) / LAMPORTS_PER_SOL),
  };
}

/**
 * Get Solana Explorer URL for a transaction or address
 *
 * @param {string} identifier - Transaction signature or address
 * @param {string} type - 'tx' for transaction, 'address' for account
 * @returns {string} Explorer URL
 */
export function getExplorerUrl(identifier, type = 'tx') {
  const baseUrl = 'https://explorer.solana.com';
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;

  if (type === 'tx') {
    return `${baseUrl}/tx/${identifier}${cluster}`;
  }
  return `${baseUrl}/address/${identifier}${cluster}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE MINT FLOW HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete mint flow: deserialize, sign, send, and confirm
 *
 * @param {string} serializedTransaction - Base64-encoded transaction from server
 * @param {Object} options - Options for the mint process
 * @param {Function} options.onStatus - Callback for status updates
 * @returns {Promise<{success: boolean, signature?: string, error?: string, explorerUrl?: string}>}
 */
export async function executeMint(serializedTransaction, options = {}) {
  const onStatus = options.onStatus || (() => {});

  try {
    // 1. Deserialize
    onStatus('Preparing transaction...');
    const transaction = deserializeTransaction(serializedTransaction);

    // 2. Sign with wallet
    onStatus('Waiting for wallet signature...');
    const signedTransaction = await signTransaction(transaction);

    // 3. Send and confirm
    onStatus('Sending transaction...');
    const result = await sendAndConfirmTransaction(signedTransaction, {
      commitment: 'confirmed',
    });

    if (result.confirmed) {
      onStatus('Transaction confirmed!');
      return {
        success: true,
        signature: result.signature,
        explorerUrl: getExplorerUrl(result.signature, 'tx'),
        slot: result.slot,
      };
    } else {
      return {
        success: false,
        signature: result.signature,
        error: result.error || 'Transaction not confirmed',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unknown error during mint',
    };
  }
}

// Default export for convenience
export default {
  // Constants
  MINT_PRICE,
  MINT_PRICE_SOL,
  TREASURY_ADDRESS,
  CANDY_MACHINE_ADDRESS,
  COLLECTION_MINT,
  MEMO_PROGRAM_ID,
  RPC_ENDPOINT,
  NETWORK,
  // Connection
  getConnection,
  // Transaction handling
  deserializeTransaction,
  getTransactionDetails,
  formatTransactionDetailsHTML,
  truncateAddress,
  // Sending
  sendSignedTransaction,
  sendAndConfirmTransaction,
  // Wallet integration
  isWalletConnected,
  getConnectedWallet,
  connectWallet,
  signTransaction,
  // Utilities
  getBalance,
  checkMintBalance,
  getExplorerUrl,
  // Complete flow
  executeMint,
};
