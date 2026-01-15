/**
 * Express server for Claude Code Club NFT minting app
 */

// Load environment variables BEFORE other imports (side-effect import)
import 'dotenv/config';

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import open from 'open';

import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserProfile,
  getCompleteStats
} from './github.js';

import { generateTraits, calculateRarity } from './traits.js';
import {
  buildMintTransaction,
  verifyTransaction,
  getTransactionDetails,
  getConnection,
  MINT_PRICE,
  MINT_PRICE_SOL,
  TREASURY_ADDRESS,
} from './solana.js';
import {
  computeTraitHash,
  verifyUniqueness,
  buildRegistryMintTransaction,
  getProgramState,
  getMintRegistry,
} from './registry.js';
// artwork-generator not needed - using IPFS for artwork
import {
  previewAssignment,
  assignPool,
  markPoolMinted,
  isPoolMinted,
  getPoolStats,
} from './pool-assignment.js';
import {
  getCandyMachineStatus,
  buildCandyMachineMintTransaction,
  getMintConfig,
  CANDY_MACHINE_ADDRESS,
  COLLECTION_MINT,
  MINT_PRICE_SOL as CANDY_MINT_PRICE_SOL,
} from './candy-machine.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration (dotenv already loaded via 'dotenv/config' import at top)
const PORT = process.env.PORT || 3456;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BASE_URL = `http://localhost:${PORT}`;

// In-memory token storage (in production, use sessions or a database)
const tokenStore = new Map();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from /ui directory
const uiPath = join(__dirname, '..', 'ui');
app.use(express.static(uiPath));

// Artwork served from IPFS

// Serve collection files (the actual 777 NFTs)
const collectionPath = join(__dirname, '..', 'collection');
app.use('/collection', express.static(collectionPath));

// ============================================
// Authentication Routes
// ============================================

/**
 * Initiate GitHub OAuth flow
 */
app.get('/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({
      error: 'GitHub OAuth not configured',
      message: 'Please set GITHUB_CLIENT_ID in your .env file'
    });
  }

  const redirectUri = `${BASE_URL}/auth/callback`;
  const authUrl = getAuthorizationUrl(GITHUB_CLIENT_ID, redirectUri);

  res.redirect(authUrl);
});

/**
 * GitHub OAuth callback
 */
app.get('/auth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?error=No authorization code received');
  }

  try {
    const accessToken = await exchangeCodeForToken(
      GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET,
      code
    );

    // Get user profile to generate a session ID
    const profile = await getUserProfile(accessToken);
    const sessionId = `session_${profile.id}_${Date.now()}`;

    // Store token with session ID
    tokenStore.set(sessionId, {
      accessToken,
      userId: profile.id,
      login: profile.login,
      createdAt: Date.now()
    });

    // Redirect to frontend with session ID
    res.redirect(`/?session=${sessionId}`);

  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }
});

/**
 * Logout endpoint
 */
app.post('/auth/logout', (req, res) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');

  if (sessionId && tokenStore.has(sessionId)) {
    tokenStore.delete(sessionId);
  }

  res.json({ success: true });
});

// ============================================
// API Routes
// ============================================

/**
 * Middleware to verify session
 */
function requireAuth(req, res, next) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionId || !tokenStore.has(sessionId)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please authenticate with GitHub first'
    });
  }

  const session = tokenStore.get(sessionId);
  req.session = session;
  next();
}

/**
 * Get authenticated user's profile
 */
app.get('/api/github/user', requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.session.accessToken);

    res.json({
      id: profile.id,
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      company: profile.company,
      location: profile.location,
      blog: profile.blog,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      createdAt: profile.created_at
    });

  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: err.message
    });
  }
});

/**
 * Get user's GitHub stats for NFT
 */
app.get('/api/github/stats', requireAuth, async (req, res) => {
  try {
    const stats = await getCompleteStats(req.session.accessToken);

    res.json(stats);

  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({
      error: 'Failed to fetch user stats',
      message: err.message
    });
  }
});

/**
 * Generate traits for user's Clawd NFT
 * Uses pool-based assignment from pre-generated 777 NFTs
 * Shows preview of what tier user qualifies for based on achievements
 */
app.get('/api/traits', requireAuth, async (req, res) => {
  try {
    const stats = await getCompleteStats(req.session.accessToken);

    // Get pool preview based on achievements
    const preview = previewAssignment(stats.achievements);

    // Preview HTML served from IPFS
    let previewHtml = null;

    res.json({
      // Pool-based assignment info
      tier: preview.tier,
      tierMessage: preview.message,
      availableCount: preview.availableCount,
      totalInTier: preview.totalInTier,
      sampleTokenId: preview.sampleTokenId,

      // Traits from the sample pool NFT
      traits: preview.sampleTraits,
      previewHtml,

      // User stats for display
      stats: {
        profile: stats.profile,
        contributions: stats.contributions,
        languages: stats.languages,
        achievements: stats.achievements
      }
    });

  } catch (err) {
    console.error('Error generating traits:', err);
    res.status(500).json({
      error: 'Failed to generate traits',
      message: err.message
    });
  }
});

/**
 * Generate artwork preview HTML
 * Returns the actual xterm.js-based NFT artwork for iframe embedding
 */
app.get('/api/preview', requireAuth, async (req, res) => {
  try {
    const stats = await getCompleteStats(req.session.accessToken);

    // Transform stats into format expected by generateTraits
    const githubData = {
      login: stats.profile.login,
      created_at: stats.profile.createdAt,
      top_language: stats.languages?.[0]?.language || null,
      total_contributions: stats.contributions?.totalContributions || 0,
      stars_received: 0,
      public_repos: stats.profile.publicRepos || 0,
      followers: stats.contributions?.followers || 0,
      current_streak: stats.contributions?.currentStreak || 0,
      longest_streak: stats.contributions?.longestStreak || 0,
      achievements: stats.achievements
    };

    // Generate traits
    const traits = generateTraits(githubData);

    // Artwork is on IPFS - return traits as JSON instead
    res.json({ traits });

  } catch (err) {
    console.error('Error generating preview:', err);
    res.status(500).send(`<html><body style="background:#000;color:#f00;padding:20px;font-family:monospace;">Error: ${err.message}</body></html>`);
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      githubConfigured: !!GITHUB_CLIENT_ID,
      solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    }
  });
});

/**
 * Get Solana configuration
 */
app.get('/api/config', (req, res) => {
  res.json({
    solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    network: 'mainnet-beta',
    candyMachine: CANDY_MACHINE_ADDRESS,
    collection: COLLECTION_MINT,
    treasury: TREASURY_ADDRESS.toBase58(),
    mintPrice: MINT_PRICE,
    mintPriceSol: CANDY_MINT_PRICE_SOL,
  });
});

// ============================================
// Candy Machine Routes
// ============================================

/**
 * Get candy machine status (items available, minted, price)
 */
app.get('/api/candy-machine/status', async (req, res) => {
  try {
    const status = await getCandyMachineStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (err) {
    console.error('Error fetching candy machine status:', err);
    res.status(500).json({
      error: 'Failed to fetch candy machine status',
      message: err.message
    });
  }
});

/**
 * Get mint configuration for client-side use
 */
app.get('/api/candy-machine/config', (req, res) => {
  res.json(getMintConfig());
});

/**
 * Build a candy machine mint transaction (NO AUTH REQUIRED)
 * Simple mint from candy machine - anyone can mint
 */
app.post('/api/candy-machine/mint', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Missing wallet address',
        message: 'Please provide a walletAddress in the request body'
      });
    }

    // Build the candy machine mint transaction
    const txData = await buildCandyMachineMintTransaction(walletAddress);

    res.json({
      success: true,
      transaction: txData.transaction,
      nftMint: txData.nftMint,
      // secretKey is NOT sent - signing happens server-side
      candyMachine: txData.candyMachine,
      collection: txData.collection,
      price: txData.price,
      itemsRemaining: txData.itemsRemaining,
    });

  } catch (err) {
    console.error('Error building candy machine mint transaction:', err);
    res.status(500).json({
      error: 'Failed to build transaction',
      message: err.message
    });
  }
});

/**
 * Send a signed transaction to the network (proxied through server to avoid CORS)
 */
app.post('/api/send-transaction', async (req, res) => {
  try {
    const { transaction } = req.body;
    if (!transaction) {
      return res.status(400).json({ error: 'Missing transaction' });
    }

    // Decode base64 transaction
    const txBytes = Buffer.from(transaction, 'base64');

    // Get connection and send
    const connection = getConnection();
    const signature = await connection.sendRawTransaction(txBytes, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('[send-transaction] Sent:', signature);
    res.json({ success: true, signature });

  } catch (err) {
    console.error('[send-transaction] Error:', err);
    res.status(500).json({
      error: 'Failed to send transaction',
      message: err.message
    });
  }
});

/**
 * Confirm a transaction
 */
app.get('/api/confirm-transaction/:signature', async (req, res) => {
  try {
    const { signature } = req.params;
    const connection = getConnection();

    const result = await connection.confirmTransaction(signature, 'confirmed');
    console.log('[confirm-transaction] Confirmed:', signature);

    res.json({ success: true, confirmed: !result.value.err });
  } catch (err) {
    console.error('[confirm-transaction] Error:', err);
    res.status(500).json({
      error: 'Confirmation failed',
      message: err.message
    });
  }
});

// ============================================
// Minting Routes (GitHub Auth Required)
// ============================================

/**
 * Build a mint transaction for the user to sign
 *
 * This endpoint:
 * 1. Verifies the user hasn't already minted
 * 2. Generates/validates traits
 * 3. Builds a transaction that includes SOL payment + memo
 * 4. Returns the serialized transaction for wallet signing
 */
app.post('/api/mint/transaction', requireAuth, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Missing wallet address',
        message: 'Please provide a walletAddress in the request body'
      });
    }

    // Get GitHub user data
    const profile = await getUserProfile(req.session.accessToken);
    const githubUserId = profile.id;
    const githubUsername = profile.login;

    // Get connection and check if user already minted
    const connection = getConnection();

    // Check if user has already minted (on-chain)
    const existingMint = await getMintRegistry(connection, githubUserId);
    if (existingMint) {
      return res.status(400).json({
        error: 'Already minted',
        message: `User @${githubUsername} has already minted a Claude Code Club NFT`,
        existingMint: {
          nftMint: existingMint.nftMint,
          mintedAt: existingMint.mintedAtDate,
          traits: existingMint.traits
        }
      });
    }

    // Get user's GitHub stats for pool assignment
    const stats = await getCompleteStats(req.session.accessToken);

    // Assign a pool NFT based on achievements
    const assignment = assignPool(stats.achievements);

    // Build the mint transaction (SOL payment + memo with pool ID)
    const txData = await buildMintTransaction(walletAddress, githubUsername, {
      poolId: assignment.poolId,
      tokenId: assignment.tokenId
    });

    res.json({
      success: true,
      transaction: txData.transaction,
      blockhash: txData.blockhash,
      lastValidBlockHeight: txData.lastValidBlockHeight,
      mintDetails: {
        githubUserId,
        githubUsername,
        walletAddress,
        price: txData.priceSol,
        priceDisplay: `${txData.priceSol} SOL`,
        treasury: txData.treasury,
        // Pool assignment info
        poolId: assignment.poolId,
        tokenId: assignment.tokenId,
        tier: assignment.tier,
        tierMessage: assignment.message,
        traits: assignment.traits
      }
    });

  } catch (err) {
    console.error('Error building mint transaction:', err);
    res.status(500).json({
      error: 'Failed to build transaction',
      message: err.message
    });
  }
});

/**
 * Verify a mint transaction was successful
 *
 * This endpoint:
 * 1. Confirms the transaction on-chain
 * 2. Returns the transaction details and mint info
 */
app.post('/api/mint/verify', async (req, res) => {
  try {
    const { signature, poolId } = req.body;

    if (!signature) {
      return res.status(400).json({
        error: 'Missing signature',
        message: 'Please provide the transaction signature'
      });
    }

    // Verify the transaction was confirmed
    const verification = await verifyTransaction(signature, {
      timeout: 60000,
      commitment: 'confirmed'
    });

    if (!verification.confirmed) {
      return res.status(400).json({
        error: 'Transaction not confirmed',
        message: verification.err || 'Transaction failed or not found',
        signature
      });
    }

    // Get transaction details
    const details = await getTransactionDetails(signature);

    // Mark the pool as minted if poolId was provided
    if (poolId) {
      markPoolMinted(poolId);
    }

    res.json({
      success: true,
      confirmed: true,
      signature,
      slot: verification.slot,
      confirmationStatus: verification.confirmationStatus,
      poolId: poolId || null,
      details: details ? {
        blockTime: details.blockTime,
        fee: details.fee,
        transferAmount: details.transferAmountSol,
        memo: details.memo
      } : null,
      explorerUrl: `https://explorer.solana.com/tx/${signature}`
    });

  } catch (err) {
    console.error('Error verifying transaction:', err);
    res.status(500).json({
      error: 'Verification failed',
      message: err.message
    });
  }
});

/**
 * Get pool statistics
 */
app.get('/api/pools/stats', (req, res) => {
  try {
    const stats = getPoolStats();
    res.json({
      success: true,
      ...stats
    });
  } catch (err) {
    console.error('Error getting pool stats:', err);
    res.status(500).json({
      error: 'Failed to get pool stats',
      message: err.message
    });
  }
});

/**
 * Get IPFS upload progress
 */
app.get('/api/upload/progress', (req, res) => {
  try {
    const manifestPath = join(__dirname, '..', 'collection', 'pools', 'storacha-manifest.json');

    if (!existsSync(manifestPath)) {
      return res.json({
        html: { count: 0, total: 777 },
        png: { count: 0, total: 777 },
        metadata: { count: 0, total: 777 },
        complete: false
      });
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    const htmlCount = Object.keys(manifest.html || {}).length;
    const pngCount = Object.keys(manifest.png || {}).length;
    const metadataCount = Object.keys(manifest.metadata || {}).length;

    res.json({
      html: { count: htmlCount, total: 777 },
      png: { count: pngCount, total: 777 },
      metadata: { count: metadataCount, total: 777 },
      complete: htmlCount === 777 && pngCount === 777 && metadataCount === 777,
      updatedAt: manifest.generatedAt
    });
  } catch (err) {
    console.error('Error getting upload progress:', err);
    res.status(500).json({
      error: 'Failed to get upload progress',
      message: err.message
    });
  }
});

/**
 * Get mint status for a GitHub user
 */
app.get('/api/mint/status/:githubUserId', async (req, res) => {
  try {
    const githubUserId = parseInt(req.params.githubUserId, 10);

    if (isNaN(githubUserId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'GitHub user ID must be a number'
      });
    }

    const connection = getConnection();
    const mintRegistry = await getMintRegistry(connection, githubUserId);

    if (!mintRegistry) {
      return res.json({
        hasMinted: false,
        githubUserId
      });
    }

    res.json({
      hasMinted: true,
      githubUserId,
      mint: {
        nftMint: mintRegistry.nftMint,
        mintedAt: mintRegistry.mintedAtDate,
        traits: mintRegistry.traits,
        totalContributions: mintRegistry.totalContributions,
        starsReceived: mintRegistry.starsReceived
      }
    });

  } catch (err) {
    console.error('Error checking mint status:', err);
    res.status(500).json({
      error: 'Failed to check status',
      message: err.message
    });
  }
});

/**
 * Get program state and stats
 */
app.get('/api/program/state', async (req, res) => {
  try {
    const connection = getConnection();
    const state = await getProgramState(connection);

    if (!state) {
      return res.status(404).json({
        error: 'Program not initialized',
        message: 'The CCC Registry program has not been initialized yet'
      });
    }

    res.json({
      success: true,
      state: {
        totalMinted: state.totalMinted,
        isPaused: state.isPaused,
        minPrice: state.minPrice,
        minPriceSol: state.minPrice / 1e9,
        rarityStats: state.rarityStats,
        admin: state.admin,
        treasury: state.treasury
      }
    });

  } catch (err) {
    console.error('Error fetching program state:', err);
    res.status(500).json({
      error: 'Failed to fetch state',
      message: err.message
    });
  }
});

// ============================================
// Catch-all route for SPA
// ============================================

app.get('*', (req, res) => {
  res.sendFile(join(uiPath, 'index.html'));
});

// ============================================
// Error handling
// ============================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================
// Start server
// ============================================

app.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;

  // ASCII Art Banner
  console.log('');
  console.log('\x1b[36m   ██████╗ ██████╗ ██████╗\x1b[0m');
  console.log('\x1b[36m  ██╔════╝██╔════╝██╔════╝\x1b[0m');
  console.log('\x1b[36m  ██║     ██║     ██║     \x1b[0m');
  console.log('\x1b[36m  ██║     ██║     ██║     \x1b[0m');
  console.log('\x1b[36m  ╚██████╗╚██████╗╚██████╗\x1b[0m');
  console.log('\x1b[36m   ╚═════╝ ╚═════╝ ╚═════╝\x1b[0m');
  console.log('\x1b[90m   CLAUDE   CODE   CLUB\x1b[0m');
  console.log('');
  console.log('\x1b[37m      * \x1b[36m▐▛███▜▌\x1b[37m *\x1b[0m');
  console.log('\x1b[37m     * \x1b[36m▝▜█████▛▘\x1b[37m *\x1b[0m');
  console.log('\x1b[37m      *  \x1b[36m▘▘ ▝▝\x1b[37m  *\x1b[0m');
  console.log('\x1b[90m Proof you ship with Claude\x1b[0m');
  console.log('\x1b[90m ═══════════════════════════\x1b[0m');
  console.log('');
  console.log(`  Server: \x1b[36m${url}\x1b[0m`);
  console.log('');

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.log('  \x1b[33m[!] GitHub OAuth not configured\x1b[0m');
    console.log('      Create a .env file with your GitHub OAuth credentials');
    console.log('');
  } else {
    console.log('  \x1b[32m[OK]\x1b[0m GitHub OAuth configured');
  }

  console.log(`  \x1b[32m[OK]\x1b[0m Solana RPC: ${process.env.SOLANA_RPC_URL || 'mainnet-beta'}`);
  console.log('');
  console.log('\x1b[90m  ───────────────────────────\x1b[0m');
  console.log('\x1b[32m  ✓\x1b[0m Safe to mint - no private keys stored');
  console.log('\x1b[32m  ✓\x1b[0m Your wallet signs transactions locally');
  console.log('\x1b[32m  ✓\x1b[0m 777 unique Clawds on Solana mainnet');
  console.log('\x1b[32m  ✓\x1b[0m 0.1 SOL per mint');
  console.log('\x1b[90m  ───────────────────────────\x1b[0m');
  console.log('');
  console.log('\x1b[90m  Waiting for connections...\x1b[0m');
  console.log('');

  // Open browser automatically
  try {
    await open(url);
    console.log('  Browser opened automatically');
  } catch (err) {
    console.log(`  Open ${url} in your browser`);
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});
