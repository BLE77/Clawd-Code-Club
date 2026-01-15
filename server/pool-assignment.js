/**
 * Pool Assignment Module for Claude Code Club
 *
 * Maps user achievements to NFT pools and handles assignment.
 * Uses the pre-generated pool manifest to determine which NFTs
 * belong to which achievement tier.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// POOL MANIFEST
// ============================================================================

const MANIFEST_PATH = path.join(__dirname, '..', 'collection', 'pools', 'manifest.json');
const STORACHA_MANIFEST_PATH = path.join(__dirname, '..', 'collection', 'pools', 'storacha-manifest.json');

let poolManifest = null;
let storachaManifest = null;

/**
 * Load the pool manifest (lazy loaded, cached)
 */
function getManifest() {
  if (!poolManifest) {
    const data = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    poolManifest = JSON.parse(data);
  }
  return poolManifest;
}

/**
 * Load the Storacha IPFS manifest (lazy loaded, cached)
 */
function getStorachaManifest() {
  if (!storachaManifest) {
    try {
      const data = fs.readFileSync(STORACHA_MANIFEST_PATH, 'utf-8');
      storachaManifest = JSON.parse(data);
    } catch (e) {
      console.warn('Storacha manifest not found, IPFS URIs will be unavailable');
      storachaManifest = { html: {}, png: {}, metadata: {} };
    }
  }
  return storachaManifest;
}

/**
 * Get IPFS URIs for a token ID
 */
function getIPFSUris(tokenId) {
  const storacha = getStorachaManifest();
  const id = String(tokenId).padStart(4, '0');

  const metadata = storacha.metadata?.[id];
  const html = storacha.html?.[id];
  const png = storacha.png?.[id];

  return {
    metadataUri: metadata ? `ipfs://${metadata.cid}` : null,
    metadataGateway: metadata?.gateway || null,
    animationUri: html ? `ipfs://${html.cid}` : null,
    imageUri: png ? `ipfs://${png.cid}` : null,
  };
}

// ============================================================================
// TIER DEFINITIONS
// ============================================================================

/**
 * Achievement-based tier mapping
 * Maps GitHub achievements to pool tiers
 */
const TIER_REQUIREMENTS = {
  legendary: {
    // Created a 100k+ star repo
    check: (achievements) => achievements?.hasCreated100kRepo === true,
    pools: ['legendary_full_diamond'],
    message: 'Your 100k+ star repository earned you a Legendary Clawd!'
  },
  epic: {
    // Created 10k+ star repo OR PR to 100k+ repo
    check: (achievements) =>
      achievements?.hasCreated10kRepo === true ||
      achievements?.hasPRto100kRepo === true,
    pools: ['epic_gold_crown', 'epic_diamond_wizard'],
    message: 'Your achievements earned you an Epic Clawd!'
  },
  rare: {
    // Created 1k+ star repo OR PR to 10k+ repo OR PR to 1k+ repo
    check: (achievements) =>
      achievements?.hasCreated1kRepo === true ||
      achievements?.hasPRto10kRepo === true ||
      achievements?.hasPRto1kRepo === true,
    pools: ['rare_silver_crown', 'rare_purple_wizard', 'rare_tophat'],
    message: 'Your contributions earned you a Rare Clawd!'
  },
  uncommon: {
    // Created 100+ star repo
    check: (achievements) => achievements?.hasCreated100Repo === true,
    pools: ['uncommon_cap'],
    message: 'Your repositories earned you an Uncommon Clawd!'
  },
  common: {
    // Everyone else
    check: () => true,
    pools: ['common_random'],
    message: 'Welcome to the Claude Code Club!'
  }
};

// ============================================================================
// MINTED TRACKING
// ============================================================================

// In-memory tracking of minted pool IDs (for MVP)
// In production, this would be on-chain
const mintedPoolIds = new Set();

/**
 * Mark a pool ID as minted
 */
export function markPoolMinted(poolId) {
  mintedPoolIds.add(poolId);
}

/**
 * Check if a pool ID is minted
 */
export function isPoolMinted(poolId) {
  return mintedPoolIds.has(poolId);
}

/**
 * Get all minted pool IDs
 */
export function getMintedPools() {
  return Array.from(mintedPoolIds);
}

// ============================================================================
// TIER DETERMINATION
// ============================================================================

/**
 * Determine user's tier based on their achievements
 *
 * @param {Object} achievements - Achievement flags from GitHub stats
 * @returns {Object} Tier info with name, pools, and message
 */
export function determineTier(achievements) {
  for (const [tierName, tierDef] of Object.entries(TIER_REQUIREMENTS)) {
    if (tierDef.check(achievements)) {
      return {
        tier: tierName,
        pools: tierDef.pools,
        message: tierDef.message
      };
    }
  }

  // Default to common
  return {
    tier: 'common',
    pools: ['common_random'],
    message: 'Welcome to the Claude Code Club!'
  };
}

// ============================================================================
// POOL ASSIGNMENT
// ============================================================================

/**
 * Get all pool IDs for a tier
 *
 * @param {string} tier - Tier name (legendary, epic, rare, uncommon, common)
 * @returns {number[]} Array of pool IDs for this tier
 */
export function getPoolIdsForTier(tier) {
  const manifest = getManifest();
  const tierDef = TIER_REQUIREMENTS[tier];

  if (!tierDef) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  const poolIds = [];
  for (const poolKey of tierDef.pools) {
    const pool = manifest.pools[poolKey];
    if (pool) {
      poolIds.push(...pool.ids);
    }
  }

  return poolIds;
}

/**
 * Get available (unminted) pool IDs for a tier
 *
 * @param {string} tier - Tier name
 * @returns {number[]} Array of available pool IDs
 */
export function getAvailablePoolIds(tier) {
  const allIds = getPoolIdsForTier(tier);
  return allIds.filter(id => !isPoolMinted(id));
}

/**
 * Assign a pool to a user based on their achievements
 *
 * @param {Object} achievements - Achievement flags from GitHub stats
 * @returns {Object} Assignment result with poolId, tier, metadata
 */
export function assignPool(achievements) {
  // Determine user's tier
  const tierInfo = determineTier(achievements);

  // Get available pools in this tier
  let availableIds = getAvailablePoolIds(tierInfo.tier);

  // If tier is exhausted, fall back to next available tier
  if (availableIds.length === 0) {
    const tierOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
    const currentIndex = tierOrder.indexOf(tierInfo.tier);

    for (let i = currentIndex + 1; i < tierOrder.length; i++) {
      availableIds = getAvailablePoolIds(tierOrder[i]);
      if (availableIds.length > 0) {
        tierInfo.tier = tierOrder[i];
        tierInfo.message = `Your tier was full, but you got a ${tierOrder[i]} Clawd!`;
        break;
      }
    }
  }

  if (availableIds.length === 0) {
    throw new Error('No NFTs available to mint');
  }

  // Pick a random available pool ID from the tier
  const poolId = availableIds[Math.floor(Math.random() * availableIds.length)];

  // Get the NFT data from manifest
  const manifest = getManifest();
  const nftData = manifest.nfts.find(n => n.id === poolId);
  const tokenId = String(poolId).padStart(4, '0');

  // Get IPFS URIs for this token
  const ipfsUris = getIPFSUris(poolId);

  return {
    poolId,
    tokenId,
    tier: tierInfo.tier,
    message: tierInfo.message,
    traits: nftData?.traits || null,
    poolName: nftData?.pool || null,
    availableInTier: availableIds.length,
    // IPFS URIs for the NFT
    metadataUri: ipfsUris.metadataUri,
    metadataGateway: ipfsUris.metadataGateway,
    animationUri: ipfsUris.animationUri,
    imageUri: ipfsUris.imageUri
  };
}

/**
 * Preview assignment without actually assigning
 * Shows user what tier they qualify for
 *
 * @param {Object} achievements - Achievement flags from GitHub stats
 * @returns {Object} Preview info
 */
export function previewAssignment(achievements) {
  const tierInfo = determineTier(achievements);
  const availableIds = getAvailablePoolIds(tierInfo.tier);

  // Get a sample NFT from the tier for preview
  let sampleNft = null;
  if (availableIds.length > 0) {
    const manifest = getManifest();
    const sampleId = availableIds[0];
    sampleNft = manifest.nfts.find(n => n.id === sampleId);
  }

  return {
    tier: tierInfo.tier,
    message: tierInfo.message,
    availableCount: availableIds.length,
    totalInTier: getPoolIdsForTier(tierInfo.tier).length,
    sampleTraits: sampleNft?.traits || null,
    sampleTokenId: sampleNft ? String(sampleNft.id).padStart(4, '0') : null
  };
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  const manifest = getManifest();
  const stats = {};

  for (const tierName of Object.keys(TIER_REQUIREMENTS)) {
    const total = getPoolIdsForTier(tierName).length;
    const available = getAvailablePoolIds(tierName).length;
    stats[tierName] = {
      total,
      available,
      minted: total - available
    };
  }

  return {
    totalSupply: manifest.total,
    totalMinted: mintedPoolIds.size,
    totalAvailable: manifest.total - mintedPoolIds.size,
    byTier: stats
  };
}

export default {
  determineTier,
  assignPool,
  previewAssignment,
  getPoolStats,
  markPoolMinted,
  isPoolMinted,
  getMintedPools,
  getAvailablePoolIds,
  getPoolIdsForTier
};
