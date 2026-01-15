/**
 * @fileoverview Frontend integration module for Claude Code Club Solana program
 *
 * Provides functions to interact with the CCC Registry on-chain program:
 * - Compute trait hashes matching on-chain computation
 * - Verify uniqueness of GitHub users and trait combinations
 * - Build transactions for registry operations
 * - Fetch program state and mint registries
 *
 * @module registry
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { createHash } from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * CCC Registry Program ID - deployed on devnet
 */
export const PROGRAM_ID = new PublicKey(
  '3NMfJUekQcMQnt5H4q5JccSi1YDgzdMaiu68AFjKLwPs'
);

/**
 * PDA Seeds used by the program
 */
export const PDA_SEEDS = {
  PROGRAM_STATE: Buffer.from('program_state'),
  MINT_REGISTRY: Buffer.from('mint_registry'),
  TRAIT_REGISTRY: Buffer.from('trait_registry'),
};

/**
 * Accessory enum mapping (matches on-chain values)
 */
export const ACCESSORY_ENUM = {
  none: 0,
  coffee: 1,
  headphones: 2,
  keyboard: 3,
  wand: 4,
  crown: 5,
};

/**
 * Hat enum mapping (matches on-chain values)
 */
export const HAT_ENUM = {
  none: 0,
  cap: 1,
  tophat: 2,
  wizardhat: 3,
  devil: 4,
  halo: 5,
  hoodie: 6,
  crown: 7,
  'devil-full': 8,
  ble77: 9,
  antenna: 10,
  headphones: 11,
  cowboy: 12,
};

/**
 * Shoes enum mapping (matches on-chain values)
 */
export const SHOES_ENUM = {
  none: 0,
  slides: 1,
  crocs: 2,
  heels: 3,
  jordans: 4,
};

/**
 * Rolex tier enum mapping (matches on-chain values)
 */
export const ROLEX_TIER_ENUM = {
  none: 0,
  normal: 1,
  gold: 2,
  diamond: 3,
};

/**
 * Star style enum mapping (matches on-chain values)
 */
export const STAR_STYLE_ENUM = {
  bright: 0,
  swords: 1,
  music: 2,
  none: 3,
  unholy: 4,
  goth: 5,
  bitcoin: 6,
  diamonds: 7,
};

/**
 * Star color enum mapping (matches on-chain values)
 * Same rarity tiers as body color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
export const STAR_COLOR_ENUM = {
  purple: 0,
  pink: 1,
  green: 2,
  white: 3,
  orange: 4,
  blue: 5,
  red: 6,
  silver: 7,
  gold: 8,
  diamond: 9,
};

/**
 * Hat color enum mapping (matches on-chain values)
 * Same rarity tiers as body color and star color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
export const HAT_COLOR_ENUM = {
  purple: 0,
  pink: 1,
  green: 2,
  white: 3,
  orange: 4,
  blue: 5,
  red: 6,
  silver: 7,
  gold: 8,
  diamond: 9,
};

/**
 * Shoe color enum mapping (matches on-chain values)
 * Same rarity tiers as body color, star color, and hat color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
export const SHOE_COLOR_ENUM = {
  purple: 0,
  pink: 1,
  green: 2,
  white: 3,
  orange: 4,
  blue: 5,
  red: 6,
  silver: 7,
  gold: 8,
  diamond: 9,
};

/**
 * Hand color enum mapping (matches on-chain values)
 * Same rarity tiers as body color, star color, hat color, and shoe color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
export const HAND_COLOR_ENUM = {
  purple: 0,
  pink: 1,
  green: 2,
  white: 3,
  orange: 4,
  blue: 5,
  red: 6,
  silver: 7,
  gold: 8,
  diamond: 9,
};

/**
 * Hand accessory enum mapping (matches on-chain values)
 */
export const HAND_ENUM = {
  none: 0,
  peace: 1,
  pen: 2,
  microphone: 3,
  coffee: 4,
  phone: 5,
  rolex: 6,
  adult: 7,
};

/**
 * Instruction discriminators (8-byte Anchor instruction selectors)
 * These are SHA256("global:instruction_name")[0..8]
 */
export const INSTRUCTION_DISCRIMINATORS = {
  initialize: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
  registerMint: Buffer.from([229, 93, 113, 116, 233, 60, 69, 62]),
  registerTrait: Buffer.from([193, 244, 140, 220, 247, 133, 183, 170]),
  verifyUniqueness: Buffer.from([26, 242, 46, 50, 147, 177, 97, 233]),
  updateState: Buffer.from([135, 85, 170, 71, 32, 148, 144, 224]),
};

// =============================================================================
// TRAIT HASH COMPUTATION
// =============================================================================

/**
 * Converts a hex color string to RGB bytes
 *
 * @param {string} hexColor - Hex color string (e.g., "#3178c6" or "3178c6")
 * @returns {Uint8Array} RGB bytes [r, g, b]
 */
function hexColorToRgb(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return new Uint8Array([r, g, b]);
}

/**
 * Star color hex to index mapping
 * Maps star color hex values to their enum index (0-9)
 * Same rarity tiers as body color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
const STAR_COLOR_HEX_MAP = {
  '#a855f7': 0,  // purple
  '#ec4899': 1,  // pink
  '#22c55e': 2,  // green
  '#ffffff': 3,  // white
  '#f97316': 4,  // orange
  '#3b82f6': 5,  // blue
  '#ef4444': 6,  // red
  '#c0c0c0': 7,  // silver
  '#ffd700': 8,  // gold
  '#b9f2ff': 9,  // diamond
};

/**
 * Converts a star color hex value to its enum index (0-9)
 *
 * @param {string} hexColor - Hex color string (e.g., "#a855f7" or "a855f7")
 * @returns {number} Star color index (0-9), defaults to 0 if not found
 */
export function starColorHexToIndex(hexColor) {
  const normalizedHex = hexColor.startsWith('#') ? hexColor.toLowerCase() : `#${hexColor.toLowerCase()}`;
  return STAR_COLOR_HEX_MAP[normalizedHex] ?? 0;
}

/**
 * Hat color hex to index mapping
 * Maps hat color hex values to their enum index (0-9)
 * Same rarity tiers as body color and star color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
const HAT_COLOR_HEX_MAP = {
  '#a855f7': 0,  // purple
  '#ec4899': 1,  // pink
  '#22c55e': 2,  // green
  '#ffffff': 3,  // white
  '#f97316': 4,  // orange
  '#3b82f6': 5,  // blue
  '#ef4444': 6,  // red
  '#c0c0c0': 7,  // silver
  '#ffd700': 8,  // gold
  '#b9f2ff': 9,  // diamond
};

/**
 * Converts a hat color hex value to its enum index (0-9)
 *
 * @param {string} hexColor - Hex color string (e.g., "#a855f7" or "a855f7")
 * @returns {number} Hat color index (0-9), defaults to 0 if not found
 */
export function hatColorHexToIndex(hexColor) {
  const normalizedHex = hexColor.startsWith('#') ? hexColor.toLowerCase() : `#${hexColor.toLowerCase()}`;
  return HAT_COLOR_HEX_MAP[normalizedHex] ?? 0;
}

/**
 * Shoe color hex to index mapping
 * Maps shoe color hex values to their enum index (0-9)
 * Same rarity tiers as body color, star color, and hat color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
const SHOE_COLOR_HEX_MAP = {
  '#a855f7': 0,  // purple
  '#ec4899': 1,  // pink
  '#22c55e': 2,  // green
  '#ffffff': 3,  // white
  '#f97316': 4,  // orange
  '#3b82f6': 5,  // blue
  '#ef4444': 6,  // red
  '#c0c0c0': 7,  // silver
  '#ffd700': 8,  // gold
  '#b9f2ff': 9,  // diamond
};

/**
 * Converts a shoe color hex value to its enum index (0-9)
 *
 * @param {string} hexColor - Hex color string (e.g., "#a855f7" or "a855f7")
 * @returns {number} Shoe color index (0-9), defaults to 0 if not found
 */
export function shoeColorHexToIndex(hexColor) {
  const normalizedHex = hexColor.startsWith('#') ? hexColor.toLowerCase() : `#${hexColor.toLowerCase()}`;
  return SHOE_COLOR_HEX_MAP[normalizedHex] ?? 0;
}

/**
 * Hand color hex to index mapping
 * Maps hand color hex values to their enum index (0-9)
 * Same rarity tiers as body color, star color, hat color, and shoe color:
 * - Common: Purple, Pink, Green, White
 * - Uncommon: Orange, Blue, Red, Silver
 * - Rare: Gold, Diamond
 */
const HAND_COLOR_HEX_MAP = {
  '#a855f7': 0,  // purple
  '#ec4899': 1,  // pink
  '#22c55e': 2,  // green
  '#ffffff': 3,  // white
  '#f97316': 4,  // orange
  '#3b82f6': 5,  // blue
  '#ef4444': 6,  // red
  '#c0c0c0': 7,  // silver
  '#ffd700': 8,  // gold
  '#b9f2ff': 9,  // diamond
};

/**
 * Converts a hand color hex value to its enum index (0-9)
 *
 * @param {string} hexColor - Hex color string (e.g., "#a855f7" or "a855f7")
 * @returns {number} Hand color index (0-9), defaults to 0 if not found
 */
export function handColorHexToIndex(hexColor) {
  const normalizedHex = hexColor.startsWith('#') ? hexColor.toLowerCase() : `#${hexColor.toLowerCase()}`;
  return HAND_COLOR_HEX_MAP[normalizedHex] ?? 0;
}

/**
 * Computes a SHA256 hash of trait values to ensure uniqueness.
 * This must match the on-chain computation exactly.
 *
 * The hash is computed from the concatenation of:
 * - bodyColor: 3 bytes (RGB)
 * - starCount: 1 byte (u8)
 * - starStyle: 1 byte (enum index)
 * - starColor: 1 byte (enum index, 0-9)
 * - accessory: 1 byte (enum index)
 * - hat: 1 byte (enum index)
 * - hatColor: 1 byte (enum index, 0-9)
 * - shoes: 1 byte (enum index)
 * - shoeColor: 1 byte (enum index, 0-9)
 * - hand: 1 byte (enum index)
 * - rolexTier: 1 byte (enum index)
 * - isOneOfOne: 1 byte (bool)
 *
 * @param {Object} traits - Traits object from generateTraits()
 * @param {string} traits.bodyColor - Hex color string
 * @param {number} traits.starCount - Star count (4-21)
 * @param {string} traits.starStyle - Star style type (bright, swords, music, etc.)
 * @param {string} [traits.starColor] - Star color hex or name (uses starColorHexToIndex or STAR_COLOR_ENUM)
 * @param {string} traits.accessory - Accessory type
 * @param {string} traits.hat - Hat type
 * @param {string} [traits.hatColor] - Hat color hex or name (uses hatColorHexToIndex or HAT_COLOR_ENUM)
 * @param {string} traits.shoes - Shoes type
 * @param {string} [traits.shoeColor] - Shoe color hex or name (uses shoeColorHexToIndex or SHOE_COLOR_ENUM)
 * @param {string} traits.hand - Hand accessory type (peace, pen, rolex, etc.)
 * @param {Object} traits.rolex - Rolex object with tier property
 * @param {boolean} traits.isOneOfOne - Whether this is a 1/1 special edition
 * @returns {Uint8Array} 32-byte SHA256 hash
 */
export function computeTraitHash(traits) {
  const { bodyColor, starCount, starStyle, starColor, accessory, hat, hatColor, shoes, shoeColor, handColor, hand, rolex, isOneOfOne } = traits;

  // Convert bodyColor hex to RGB bytes
  const rgbBytes = hexColorToRgb(bodyColor);

  // Get enum indices for each trait
  const starStyleIndex = STAR_STYLE_ENUM[starStyle] ?? 0;

  // Get star color index - can be a hex color string or a color name
  let starColorIndex = 0;
  if (starColor) {
    if (starColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(starColor)) {
      // It's a hex color, convert to index
      starColorIndex = starColorHexToIndex(starColor);
    } else if (starColor in STAR_COLOR_ENUM) {
      // It's a color name
      starColorIndex = STAR_COLOR_ENUM[starColor];
    }
  }

  const accessoryIndex = ACCESSORY_ENUM[accessory] ?? 0;
  const hatIndex = HAT_ENUM[hat] ?? 0;

  // Get hat color index - can be a hex color string or a color name
  let hatColorIndex = 0;
  if (hatColor) {
    if (hatColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(hatColor)) {
      // It's a hex color, convert to index
      hatColorIndex = hatColorHexToIndex(hatColor);
    } else if (hatColor in HAT_COLOR_ENUM) {
      // It's a color name
      hatColorIndex = HAT_COLOR_ENUM[hatColor];
    }
  }

  const shoesIndex = SHOES_ENUM[shoes] ?? 0;

  // Get shoe color index - can be a hex color string or a color name
  let shoeColorIndex = 0;
  if (shoeColor) {
    if (shoeColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(shoeColor)) {
      // It's a hex color, convert to index
      shoeColorIndex = shoeColorHexToIndex(shoeColor);
    } else if (shoeColor in SHOE_COLOR_ENUM) {
      // It's a color name
      shoeColorIndex = SHOE_COLOR_ENUM[shoeColor];
    }
  }

  // Get hand color index - can be a hex color string or a color name
  let handColorIndex = 0;
  if (handColor) {
    if (handColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(handColor)) {
      // It's a hex color, convert to index
      handColorIndex = handColorHexToIndex(handColor);
    } else if (handColor in HAND_COLOR_ENUM) {
      // It's a color name
      handColorIndex = HAND_COLOR_ENUM[handColor];
    }
  }

  const handIndex = HAND_ENUM[hand] ?? 0;
  const rolexTierIndex = rolex?.has
    ? ROLEX_TIER_ENUM[rolex.tier] ?? 0
    : ROLEX_TIER_ENUM.none;

  // Build the data buffer for hashing
  // Total: 3 (RGB) + 1 (starCount) + 1 (starStyle) + 1 (starColor) + 1 (accessory) + 1 (hat) + 1 (hatColor) + 1 (shoes) + 1 (shoeColor) + 1 (handColor) + 1 (hand) + 1 (rolex) + 1 (isOneOfOne) = 15 bytes
  const dataBuffer = Buffer.alloc(15);
  let offset = 0;

  // Body color RGB (3 bytes)
  dataBuffer[offset++] = rgbBytes[0];
  dataBuffer[offset++] = rgbBytes[1];
  dataBuffer[offset++] = rgbBytes[2];

  // Star count (1 byte)
  dataBuffer[offset++] = starCount & 0xff;

  // Star style enum (1 byte)
  dataBuffer[offset++] = starStyleIndex & 0xff;

  // Star color enum (1 byte)
  dataBuffer[offset++] = starColorIndex & 0xff;

  // Accessory enum (1 byte)
  dataBuffer[offset++] = accessoryIndex & 0xff;

  // Hat enum (1 byte)
  dataBuffer[offset++] = hatIndex & 0xff;

  // Hat color enum (1 byte)
  dataBuffer[offset++] = hatColorIndex & 0xff;

  // Shoes enum (1 byte)
  dataBuffer[offset++] = shoesIndex & 0xff;

  // Shoe color enum (1 byte)
  dataBuffer[offset++] = shoeColorIndex & 0xff;

  // Hand color enum (1 byte)
  dataBuffer[offset++] = handColorIndex & 0xff;

  // Hand enum (1 byte)
  dataBuffer[offset++] = handIndex & 0xff;

  // Rolex tier enum (1 byte)
  dataBuffer[offset++] = rolexTierIndex & 0xff;

  // Is one of one (1 byte)
  dataBuffer[offset++] = isOneOfOne ? 1 : 0;

  // Compute SHA256 hash
  const hash = createHash('sha256').update(dataBuffer).digest();

  return new Uint8Array(hash);
}

// =============================================================================
// PDA DERIVATION
// =============================================================================

/**
 * Derives the ProgramState PDA
 *
 * @param {PublicKey} [programId=PROGRAM_ID] - The program ID
 * @returns {[PublicKey, number]} [PDA address, bump seed]
 */
export function deriveProgramStatePda(programId = PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [PDA_SEEDS.PROGRAM_STATE],
    programId
  );
}

/**
 * Derives the MintRegistry PDA for a GitHub user
 *
 * @param {number} githubUserId - The GitHub user ID (u32)
 * @param {PublicKey} [programId=PROGRAM_ID] - The program ID
 * @returns {[PublicKey, number]} [PDA address, bump seed]
 */
export function deriveMintRegistryPda(githubUserId, programId = PROGRAM_ID) {
  // Convert u32 to 4-byte little-endian buffer
  const userIdBuffer = Buffer.alloc(4);
  userIdBuffer.writeUInt32LE(githubUserId, 0);

  return PublicKey.findProgramAddressSync(
    [PDA_SEEDS.MINT_REGISTRY, userIdBuffer],
    programId
  );
}

/**
 * Derives the TraitRegistry PDA for a trait hash
 *
 * @param {Uint8Array} traitHash - 32-byte trait hash
 * @param {PublicKey} [programId=PROGRAM_ID] - The program ID
 * @returns {[PublicKey, number]} [PDA address, bump seed]
 */
export function deriveTraitRegistryPda(traitHash, programId = PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [PDA_SEEDS.TRAIT_REGISTRY, Buffer.from(traitHash)],
    programId
  );
}

// =============================================================================
// UNIQUENESS VERIFICATION
// =============================================================================

/**
 * Verifies uniqueness of a GitHub user and trait combination
 *
 * Checks if:
 * 1. The GitHub user has already minted
 * 2. The trait combination already exists
 *
 * @param {Connection} connection - Solana connection
 * @param {number} githubUserId - GitHub user ID
 * @param {Uint8Array} traitHash - 32-byte trait hash
 * @returns {Promise<{userAlreadyMinted: boolean, traitAlreadyExists: boolean, availableForMint: boolean}>}
 */
export async function verifyUniqueness(connection, githubUserId, traitHash) {
  // Derive PDAs
  const [mintRegistryPda] = deriveMintRegistryPda(githubUserId);
  const [traitRegistryPda] = deriveTraitRegistryPda(traitHash);

  // Fetch account info for both PDAs in parallel
  const [mintRegistryInfo, traitRegistryInfo] = await Promise.all([
    connection.getAccountInfo(mintRegistryPda),
    connection.getAccountInfo(traitRegistryPda),
  ]);

  // Check existence
  const userAlreadyMinted = mintRegistryInfo !== null;
  const traitAlreadyExists = traitRegistryInfo !== null;
  const availableForMint = !userAlreadyMinted && !traitAlreadyExists;

  return {
    userAlreadyMinted,
    traitAlreadyExists,
    availableForMint,
    mintRegistryPda: mintRegistryPda.toBase58(),
    traitRegistryPda: traitRegistryPda.toBase58(),
  };
}

// =============================================================================
// TRANSACTION BUILDING
// =============================================================================

/**
 * Builds a transaction for the RegisterMint instruction
 *
 * @param {Connection} connection - Solana connection
 * @param {PublicKey|string} payerPublicKey - The payer/mint authority public key
 * @param {Object} githubData - GitHub user data
 * @param {number} githubData.id - GitHub user ID
 * @param {string} githubData.login - GitHub username
 * @param {number} [githubData.total_contributions=0] - Total contributions
 * @param {number} [githubData.stars_received=0] - Stars received
 * @param {Object} traits - Generated traits object
 * @param {PublicKey|string} nftMint - The NFT mint address
 * @returns {Promise<{transaction: Transaction, traitHash: Uint8Array, accounts: Object}>}
 */
export async function buildRegistryMintTransaction(
  connection,
  payerPublicKey,
  githubData,
  traits,
  nftMint
) {
  // Convert string keys to PublicKey if needed
  const payer =
    typeof payerPublicKey === 'string'
      ? new PublicKey(payerPublicKey)
      : payerPublicKey;
  const mint =
    typeof nftMint === 'string' ? new PublicKey(nftMint) : nftMint;

  // Compute trait hash
  const traitHash = computeTraitHash(traits);

  // Derive all required PDAs
  const [programStatePda] = deriveProgramStatePda();
  const [mintRegistryPda] = deriveMintRegistryPda(githubData.id);

  // Convert body color to RGB bytes
  const bodyColorRgb = hexColorToRgb(traits.bodyColor);

  // Build instruction data
  const instructionData = buildRegisterMintInstructionData({
    githubUserId: githubData.id,
    githubUsername: githubData.login,
    traitHash: traitHash,
    totalContributions: githubData.total_contributions || 0,
    starsReceived: githubData.stars_received || 0,
    bodyColor: bodyColorRgb,
    starCount: traits.starCount,
    starStyle: STAR_STYLE_ENUM[traits.starStyle] ?? 0,
    accessory: ACCESSORY_ENUM[traits.accessory] ?? 0,
    hat: HAT_ENUM[traits.hat] ?? 0,
    shoes: SHOES_ENUM[traits.shoes] ?? 0,
    hand: HAND_ENUM[traits.hand] ?? 0,
    rolexTier: traits.rolex?.has
      ? ROLEX_TIER_ENUM[traits.rolex.tier] ?? 0
      : ROLEX_TIER_ENUM.none,
    isOneOfOne: traits.isOneOfOne || false,
  });

  // Build the instruction
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: mintRegistryPda, isSigner: false, isWritable: true },
      { pubkey: programStatePda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  // Build transaction
  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  });
  transaction.add(instruction);

  return {
    transaction,
    traitHash,
    blockhash,
    lastValidBlockHeight,
    accounts: {
      mintRegistry: mintRegistryPda.toBase58(),
      programState: programStatePda.toBase58(),
      nftMint: mint.toBase58(),
      mintAuthority: payer.toBase58(),
    },
  };
}

/**
 * Builds the instruction data for RegisterMint
 *
 * @param {Object} params - MintParams struct data
 * @returns {Buffer} Serialized instruction data
 */
function buildRegisterMintInstructionData(params) {
  const {
    githubUserId,
    githubUsername,
    traitHash,
    totalContributions,
    starsReceived,
    bodyColor,
    starCount,
    starStyle,
    accessory,
    hat,
    shoes,
    hand,
    rolexTier,
    isOneOfOne,
  } = params;

  // Calculate buffer size:
  // 8 (discriminator) + 4 (github_user_id) + 4 (string len) + username.length + 32 (trait_hash)
  // + 4 (total_contributions) + 4 (stars_received) + 3 (body_color) + 1 (star_count)
  // + 1 (star_style) + 1 (accessory) + 1 (hat) + 1 (shoes) + 1 (hand) + 1 (rolex_tier) + 1 (is_one_of_one)
  const usernameBytes = Buffer.from(githubUsername, 'utf-8');
  const bufferSize = 8 + 4 + 4 + usernameBytes.length + 32 + 4 + 4 + 3 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1;

  const buffer = Buffer.alloc(bufferSize);
  let offset = 0;

  // Write discriminator (8 bytes)
  INSTRUCTION_DISCRIMINATORS.registerMint.copy(buffer, offset);
  offset += 8;

  // Write github_user_id (u32, 4 bytes)
  buffer.writeUInt32LE(githubUserId, offset);
  offset += 4;

  // Write github_username (String: 4-byte length + bytes)
  buffer.writeUInt32LE(usernameBytes.length, offset);
  offset += 4;
  usernameBytes.copy(buffer, offset);
  offset += usernameBytes.length;

  // Write trait_hash (32 bytes)
  Buffer.from(traitHash).copy(buffer, offset);
  offset += 32;

  // Write total_contributions (u32, 4 bytes)
  buffer.writeUInt32LE(totalContributions, offset);
  offset += 4;

  // Write stars_received (u32, 4 bytes)
  buffer.writeUInt32LE(starsReceived, offset);
  offset += 4;

  // Write body_color (3 bytes RGB)
  buffer[offset++] = bodyColor[0];
  buffer[offset++] = bodyColor[1];
  buffer[offset++] = bodyColor[2];

  // Write star_count (u8, 1 byte)
  buffer[offset++] = starCount;

  // Write star_style (u8, 1 byte)
  buffer[offset++] = starStyle;

  // Write accessory (u8, 1 byte)
  buffer[offset++] = accessory;

  // Write hat (u8, 1 byte)
  buffer[offset++] = hat;

  // Write shoes (u8, 1 byte)
  buffer[offset++] = shoes;

  // Write hand (u8, 1 byte)
  buffer[offset++] = hand;

  // Write rolex_tier (u8, 1 byte)
  buffer[offset++] = rolexTier;

  // Write is_one_of_one (bool, 1 byte)
  buffer[offset++] = isOneOfOne ? 1 : 0;

  return buffer;
}

/**
 * Builds a transaction for the RegisterTrait instruction
 *
 * @param {Connection} connection - Solana connection
 * @param {PublicKey|string} payerPublicKey - The payer/authority public key
 * @param {Uint8Array} traitHash - 32-byte trait hash
 * @param {number} githubUserId - GitHub user ID
 * @param {PublicKey|string} mintAddress - The NFT mint address
 * @returns {Promise<{transaction: Transaction, accounts: Object}>}
 */
export async function buildRegisterTraitTransaction(
  connection,
  payerPublicKey,
  traitHash,
  githubUserId,
  mintAddress
) {
  const payer =
    typeof payerPublicKey === 'string'
      ? new PublicKey(payerPublicKey)
      : payerPublicKey;
  const mint =
    typeof mintAddress === 'string' ? new PublicKey(mintAddress) : mintAddress;

  // Derive PDAs
  const [programStatePda] = deriveProgramStatePda();
  const [traitRegistryPda] = deriveTraitRegistryPda(traitHash);

  // Build instruction data
  const bufferSize = 8 + 32 + 4; // discriminator + trait_hash + github_user_id
  const buffer = Buffer.alloc(bufferSize);
  let offset = 0;

  // Write discriminator
  INSTRUCTION_DISCRIMINATORS.registerTrait.copy(buffer, offset);
  offset += 8;

  // Write trait_hash (32 bytes)
  Buffer.from(traitHash).copy(buffer, offset);
  offset += 32;

  // Write github_user_id (u32, 4 bytes)
  buffer.writeUInt32LE(githubUserId, offset);

  // Build instruction
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: traitRegistryPda, isSigner: false, isWritable: true },
      { pubkey: programStatePda, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: buffer,
  });

  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  // Build transaction
  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  });
  transaction.add(instruction);

  return {
    transaction,
    blockhash,
    lastValidBlockHeight,
    accounts: {
      traitRegistry: traitRegistryPda.toBase58(),
      programState: programStatePda.toBase58(),
      mintAddress: mint.toBase58(),
      authority: payer.toBase58(),
    },
  };
}

// =============================================================================
// STATE DESERIALIZATION
// =============================================================================

/**
 * Account data layout sizes
 */
const ACCOUNT_SIZES = {
  PROGRAM_STATE: 8 + 1 + 32 + 32 + 8 + 1 + 8 + 4 + 4 + 4 + 4 + 4, // discriminator + version + admin + treasury + total_minted + is_paused + min_price + rarity counts
  MINT_REGISTRY: 8 + 1 + 4 + 39 + 32 + 32 + 8 + 32 + 4 + 4 + 3 + 1 + 1 + 1 + 1 + 1 + 1, // discriminator + all fields
  TRAIT_REGISTRY: 8 + 1 + 32 + 4 + 32 + 8 + 4, // discriminator + all fields
};

/**
 * Fetches and deserializes the ProgramState account
 *
 * @param {Connection} connection - Solana connection
 * @returns {Promise<Object|null>} Program state data or null if not initialized
 */
export async function getProgramState(connection) {
  const [programStatePda] = deriveProgramStatePda();

  const accountInfo = await connection.getAccountInfo(programStatePda);
  if (!accountInfo) {
    return null;
  }

  const data = accountInfo.data;
  let offset = 8; // Skip 8-byte discriminator

  // Deserialize ProgramState
  const version = data.readUInt8(offset);
  offset += 1;

  const admin = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const treasury = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const totalMinted = data.readBigUInt64LE(offset);
  offset += 8;

  const isPaused = data.readUInt8(offset) === 1;
  offset += 1;

  const minPrice = data.readBigUInt64LE(offset);
  offset += 8;

  const commonCount = data.readUInt32LE(offset);
  offset += 4;

  const uncommonCount = data.readUInt32LE(offset);
  offset += 4;

  const rareCount = data.readUInt32LE(offset);
  offset += 4;

  const epicCount = data.readUInt32LE(offset);
  offset += 4;

  const legendaryCount = data.readUInt32LE(offset);

  return {
    version,
    admin: admin.toBase58(),
    treasury: treasury.toBase58(),
    totalMinted: Number(totalMinted),
    isPaused,
    minPrice: Number(minPrice),
    rarityStats: {
      common: commonCount,
      uncommon: uncommonCount,
      rare: rareCount,
      epic: epicCount,
      legendary: legendaryCount,
    },
    pda: programStatePda.toBase58(),
  };
}

/**
 * Fetches and deserializes a MintRegistry account for a GitHub user
 *
 * @param {Connection} connection - Solana connection
 * @param {number} githubUserId - GitHub user ID
 * @returns {Promise<Object|null>} Mint registry data or null if not minted
 */
export async function getMintRegistry(connection, githubUserId) {
  const [mintRegistryPda] = deriveMintRegistryPda(githubUserId);

  const accountInfo = await connection.getAccountInfo(mintRegistryPda);
  if (!accountInfo) {
    return null;
  }

  const data = accountInfo.data;
  let offset = 8; // Skip 8-byte discriminator

  // Deserialize MintRegistry
  const version = data.readUInt8(offset);
  offset += 1;

  const storedGithubUserId = data.readUInt32LE(offset);
  offset += 4;

  // Read github_username (39 bytes fixed)
  const usernameBytes = data.slice(offset, offset + 39);
  const usernameEnd = usernameBytes.indexOf(0);
  const githubUsername = usernameBytes
    .slice(0, usernameEnd === -1 ? 39 : usernameEnd)
    .toString('utf-8');
  offset += 39;

  const mintAuthority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const nftMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const mintedAt = data.readBigInt64LE(offset);
  offset += 8;

  const traitHash = data.slice(offset, offset + 32);
  offset += 32;

  const totalContributions = data.readUInt32LE(offset);
  offset += 4;

  const starsReceived = data.readUInt32LE(offset);
  offset += 4;

  const bodyColorR = data.readUInt8(offset);
  offset += 1;
  const bodyColorG = data.readUInt8(offset);
  offset += 1;
  const bodyColorB = data.readUInt8(offset);
  offset += 1;

  const starCount = data.readUInt8(offset);
  offset += 1;

  const accessoryIndex = data.readUInt8(offset);
  offset += 1;

  const hatIndex = data.readUInt8(offset);
  offset += 1;

  const shoesIndex = data.readUInt8(offset);
  offset += 1;

  const rolexTierIndex = data.readUInt8(offset);
  offset += 1;

  const starStyleIndex = data.readUInt8(offset);
  offset += 1;

  const handIndex = data.readUInt8(offset);
  offset += 1;

  const isOneOfOne = data.readUInt8(offset) === 1;

  // Reverse lookup enum names
  const accessoryName =
    Object.keys(ACCESSORY_ENUM).find(
      (key) => ACCESSORY_ENUM[key] === accessoryIndex
    ) || 'none';
  const hatName =
    Object.keys(HAT_ENUM).find((key) => HAT_ENUM[key] === hatIndex) || 'none';
  const shoesName =
    Object.keys(SHOES_ENUM).find((key) => SHOES_ENUM[key] === shoesIndex) ||
    'none';
  const rolexTierName =
    Object.keys(ROLEX_TIER_ENUM).find(
      (key) => ROLEX_TIER_ENUM[key] === rolexTierIndex
    ) || 'none';
  const starStyleName =
    Object.keys(STAR_STYLE_ENUM).find(
      (key) => STAR_STYLE_ENUM[key] === starStyleIndex
    ) || 'bright';
  const handName =
    Object.keys(HAND_ENUM).find(
      (key) => HAND_ENUM[key] === handIndex
    ) || 'none';

  return {
    version,
    githubUserId: storedGithubUserId,
    githubUsername,
    mintAuthority: mintAuthority.toBase58(),
    nftMint: nftMint.toBase58(),
    mintedAt: Number(mintedAt),
    mintedAtDate: new Date(Number(mintedAt) * 1000).toISOString(),
    traitHash: Buffer.from(traitHash).toString('hex'),
    totalContributions,
    starsReceived,
    traits: {
      bodyColor: `#${bodyColorR.toString(16).padStart(2, '0')}${bodyColorG.toString(16).padStart(2, '0')}${bodyColorB.toString(16).padStart(2, '0')}`,
      starCount,
      starStyle: starStyleName,
      accessory: accessoryName,
      hat: hatName,
      shoes: shoesName,
      hand: handName,
      rolexTier: rolexTierName,
      isOneOfOne,
    },
    pda: mintRegistryPda.toBase58(),
  };
}

/**
 * Fetches and deserializes a TraitRegistry account
 *
 * @param {Connection} connection - Solana connection
 * @param {Uint8Array} traitHash - 32-byte trait hash
 * @returns {Promise<Object|null>} Trait registry data or null if not registered
 */
export async function getTraitRegistry(connection, traitHash) {
  const [traitRegistryPda] = deriveTraitRegistryPda(traitHash);

  const accountInfo = await connection.getAccountInfo(traitRegistryPda);
  if (!accountInfo) {
    return null;
  }

  const data = accountInfo.data;
  let offset = 8; // Skip 8-byte discriminator

  // Deserialize TraitRegistry
  const version = data.readUInt8(offset);
  offset += 1;

  const storedTraitHash = data.slice(offset, offset + 32);
  offset += 32;

  const githubUserId = data.readUInt32LE(offset);
  offset += 4;

  const mintAddress = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const registeredAt = data.readBigInt64LE(offset);
  offset += 8;

  const traitIndex = data.readUInt32LE(offset);

  return {
    version,
    traitHash: Buffer.from(storedTraitHash).toString('hex'),
    githubUserId,
    mintAddress: mintAddress.toBase58(),
    registeredAt: Number(registeredAt),
    registeredAtDate: new Date(Number(registeredAt) * 1000).toISOString(),
    traitIndex,
    pda: traitRegistryPda.toBase58(),
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sets the program ID (useful for testing with different deployments)
 *
 * @param {string|PublicKey} newProgramId - New program ID
 */
export function setProgramId(newProgramId) {
  const key =
    typeof newProgramId === 'string'
      ? new PublicKey(newProgramId)
      : newProgramId;
  // Note: Since PROGRAM_ID is const, in a real scenario you'd use a module-level variable
  // This is a simplified version - actual implementation would use a setter
  console.warn(
    'setProgramId is a placeholder. Update PROGRAM_ID constant directly for now.'
  );
  return key;
}

/**
 * Validates traits object has all required fields
 *
 * @param {Object} traits - Traits object to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateTraits(traits) {
  const errors = [];

  if (!traits) {
    return { valid: false, errors: ['Traits object is required'] };
  }

  if (!traits.bodyColor || typeof traits.bodyColor !== 'string') {
    errors.push('bodyColor must be a hex color string');
  } else if (!/^#?[0-9a-fA-F]{6}$/.test(traits.bodyColor)) {
    errors.push('bodyColor must be a valid 6-character hex color');
  }

  if (
    typeof traits.starCount !== 'number' ||
    traits.starCount < 4 ||
    traits.starCount > 21
  ) {
    errors.push('starCount must be a number between 4 and 21');
  }

  if (traits.starStyle !== undefined && !(traits.starStyle in STAR_STYLE_ENUM)) {
    errors.push(
      `starStyle must be one of: ${Object.keys(STAR_STYLE_ENUM).join(', ')}`
    );
  }

  if (!traits.accessory || !(traits.accessory in ACCESSORY_ENUM)) {
    errors.push(
      `accessory must be one of: ${Object.keys(ACCESSORY_ENUM).join(', ')}`
    );
  }

  if (!traits.hat || !(traits.hat in HAT_ENUM)) {
    errors.push(`hat must be one of: ${Object.keys(HAT_ENUM).join(', ')}`);
  }

  if (!traits.shoes || !(traits.shoes in SHOES_ENUM)) {
    errors.push(`shoes must be one of: ${Object.keys(SHOES_ENUM).join(', ')}`);
  }

  if (traits.hand !== undefined && !(traits.hand in HAND_ENUM)) {
    errors.push(`hand must be one of: ${Object.keys(HAND_ENUM).join(', ')}`);
  }

  // Rolex is optional but must be valid if present
  if (traits.rolex && traits.rolex.has) {
    if (!traits.rolex.tier || !(traits.rolex.tier in ROLEX_TIER_ENUM)) {
      errors.push(
        `rolex.tier must be one of: ${Object.keys(ROLEX_TIER_ENUM).join(', ')}`
      );
    }
  }

  // isOneOfOne must be a boolean if present
  if (traits.isOneOfOne !== undefined && typeof traits.isOneOfOne !== 'boolean') {
    errors.push('isOneOfOne must be a boolean');
  }

  // starColor validation - can be a hex color or a color name
  if (traits.starColor !== undefined) {
    const isHex = typeof traits.starColor === 'string' &&
      (traits.starColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(traits.starColor));
    const isColorName = traits.starColor in STAR_COLOR_ENUM;
    if (!isHex && !isColorName) {
      errors.push(
        `starColor must be a hex color or one of: ${Object.keys(STAR_COLOR_ENUM).join(', ')}`
      );
    }
  }

  // hatColor validation - can be a hex color or a color name
  if (traits.hatColor !== undefined) {
    const isHex = typeof traits.hatColor === 'string' &&
      (traits.hatColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(traits.hatColor));
    const isColorName = traits.hatColor in HAT_COLOR_ENUM;
    if (!isHex && !isColorName) {
      errors.push(
        `hatColor must be a hex color or one of: ${Object.keys(HAT_COLOR_ENUM).join(', ')}`
      );
    }
  }

  // shoeColor validation - can be a hex color or a color name
  if (traits.shoeColor !== undefined) {
    const isHex = typeof traits.shoeColor === 'string' &&
      (traits.shoeColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(traits.shoeColor));
    const isColorName = traits.shoeColor in SHOE_COLOR_ENUM;
    if (!isHex && !isColorName) {
      errors.push(
        `shoeColor must be a hex color or one of: ${Object.keys(SHOE_COLOR_ENUM).join(', ')}`
      );
    }
  }

  // handColor validation - can be a hex color or a color name
  if (traits.handColor !== undefined) {
    const isHex = typeof traits.handColor === 'string' &&
      (traits.handColor.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(traits.handColor));
    const isColorName = traits.handColor in HAND_COLOR_ENUM;
    if (!isHex && !isColorName) {
      errors.push(
        `handColor must be a hex color or one of: ${Object.keys(HAND_COLOR_ENUM).join(', ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  // Constants
  PROGRAM_ID,
  PDA_SEEDS,
  ACCESSORY_ENUM,
  HAT_ENUM,
  HAT_COLOR_ENUM,
  SHOES_ENUM,
  SHOE_COLOR_ENUM,
  HAND_COLOR_ENUM,
  ROLEX_TIER_ENUM,
  STAR_STYLE_ENUM,
  STAR_COLOR_ENUM,
  HAND_ENUM,
  INSTRUCTION_DISCRIMINATORS,

  // Trait hash computation
  computeTraitHash,
  starColorHexToIndex,
  hatColorHexToIndex,
  shoeColorHexToIndex,
  handColorHexToIndex,

  // PDA derivation
  deriveProgramStatePda,
  deriveMintRegistryPda,
  deriveTraitRegistryPda,

  // Uniqueness verification
  verifyUniqueness,

  // Transaction building
  buildRegistryMintTransaction,
  buildRegisterTraitTransaction,

  // State fetching
  getProgramState,
  getMintRegistry,
  getTraitRegistry,

  // Utilities
  setProgramId,
  validateTraits,
};
