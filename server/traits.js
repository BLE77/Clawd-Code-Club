/**
 * @fileoverview GitHub-to-Clawd traits mapping module for Claude Code Club
 *
 * This module transforms GitHub user statistics into visual traits
 * for generating unique Clawd NFT artwork.
 *
 * @module traits
 */

/**
 * Language to body color mapping
 * Colors are based on GitHub's language colors
 * @constant {Object.<string, string>}
 */
const LANGUAGE_COLORS = {
  'TypeScript': '#3178c6',
  'JavaScript': '#f7df1e',
  'Python': '#3572A5',
  'Rust': '#dea584',
  'Go': '#00ADD8',
  'Ruby': '#CC342D',
  'Java': '#b07219',
  'C++': '#f34b7d',
  'C': '#555555',
  'C#': '#178600',
  'Solidity': '#363636',
  'Swift': '#F05138',
  'Kotlin': '#A97BFF',
  'Scala': '#c22d40',
  'Haskell': '#5e5086',
  'Elixir': '#6e4a7e',
  'Clojure': '#db5855',
  'PHP': '#4F5D95',
  'Shell': '#89e051',
  'Vim Script': '#199f4b',
  'Lua': '#000080',
  'Dart': '#00B4AB',
  'Zig': '#ec915c',
  'Nix': '#7e7eff',
  'OCaml': '#3be133',
  'R': '#198CE7',
  'Julia': '#a270ba',
  'Assembly': '#6E4C13',
  'CUDA': '#3A4E3A',
  'WebAssembly': '#04133b'
};

/**
 * Default Claude teal color for unknown languages
 * @constant {string}
 */
const DEFAULT_BODY_COLOR = '#00d4aa';

/**
 * Star color options with rarity tiers
 * Common: Purple, Pink, Green, White
 * Uncommon: Orange, Blue, Red, Silver
 * Rare: Gold, Diamond
 * @constant {Object}
 */
const STAR_COLORS = {
  // Common colors
  purple: { hex: '#8b5cf6', rarity: 'common', name: 'Purple' },
  pink: { hex: '#ec4899', rarity: 'common', name: 'Pink' },
  green: { hex: '#22c55e', rarity: 'common', name: 'Green' },
  white: { hex: '#ffffff', rarity: 'common', name: 'White' },
  // Uncommon colors
  orange: { hex: '#f97316', rarity: 'uncommon', name: 'Orange' },
  blue: { hex: '#3b82f6', rarity: 'uncommon', name: 'Blue' },
  red: { hex: '#ef4444', rarity: 'uncommon', name: 'Red' },
  silver: { hex: '#b0b0c0', rarity: 'uncommon', name: 'Silver' },
  // Rare colors
  gold: { hex: '#eab308', rarity: 'rare', name: 'Gold' },
  diamond: { hex: '#00d4aa', rarity: 'rare', name: 'Diamond' }
};

/**
 * Achievement Hat Colors (from ccc-traits.md)
 * These colors are ONLY available through achievements, not random
 */
const ACHIEVEMENT_COLORS = {
  diamond: { hex: '#00d4aa', name: 'Diamond' },
  gold: { hex: '#eab308', name: 'Gold' },
  purple: { hex: '#8b5cf6', name: 'Purple' },
  silver: { hex: '#b0b0c0', name: 'Silver' }
};

/**
 * Apply achievement-based trait overrides (from ccc-traits.md)
 * Achievement traits override random ones - check from highest to lowest
 *
 * @param {Object} achievements - Achievement flags from GitHub stats
 * @returns {Object|null} Achievement trait overrides or null if no achievements
 */
function applyAchievementOverrides(achievements) {
  if (!achievements) return null;

  // 1. Full Diamond Set (100k+ star repo creator) - EVERYTHING diamond
  if (achievements.hasCreated100kRepo) {
    return {
      isFullDiamond: true,
      hat: 'diamond-crown',
      hatColor: { key: 'diamond', ...ACHIEVEMENT_COLORS.diamond, rarity: 'legendary' },
      bodyColorOverride: { key: 'diamond', hex: '#00d4aa', name: 'Diamond', rarity: 'legendary' },
      starStyleOverride: 'diamonds',
      stageOverride: 'legend',
      achievementName: 'Full Diamond Set',
      achievementDesc: `Created a ${achievements.maxRepoStars.toLocaleString()}+ star repository`
    };
  }

  // 2. Diamond Wizard Hat (PR to 100k+ repo)
  if (achievements.hasPRto100kRepo) {
    return {
      hat: 'diamond-wizardhat',
      hatColor: { key: 'diamond', ...ACHIEVEMENT_COLORS.diamond, rarity: 'legendary' },
      bodyColorOverride: { key: 'diamond', hex: '#00d4aa', name: 'Diamond', rarity: 'rare' },
      achievementName: 'Diamond Wizard',
      achievementDesc: `PR merged to ${achievements.maxPRRepoStars.toLocaleString()}+ star repo`
    };
  }

  // 3. Gold Crown (10k+ star repo creator)
  if (achievements.hasCreated10kRepo) {
    return {
      hat: 'gold-crown',
      hatColor: { key: 'gold', ...ACHIEVEMENT_COLORS.gold, rarity: 'rare' },
      bodyColorOverride: { key: 'gold', hex: '#eab308', name: 'Gold', rarity: 'rare' },
      achievementName: 'Gold Crown',
      achievementDesc: `Created a ${achievements.maxRepoStars.toLocaleString()}+ star repository`
    };
  }

  // 4. Purple Wizard Hat (PR to 10k+ repo)
  if (achievements.hasPRto10kRepo) {
    return {
      hat: 'purple-wizardhat',
      hatColor: { key: 'purple', ...ACHIEVEMENT_COLORS.purple, rarity: 'rare' },
      bodyColorOverride: { key: 'purple', hex: '#8b5cf6', name: 'Purple', rarity: 'common' },
      achievementName: 'Purple Wizard',
      achievementDesc: `PR merged to ${achievements.maxPRRepoStars.toLocaleString()}+ star repo`
    };
  }

  // 5. Silver Crown (1k+ star repo creator)
  if (achievements.hasCreated1kRepo) {
    return {
      hat: 'silver-crown',
      hatColor: { key: 'silver', ...ACHIEVEMENT_COLORS.silver, rarity: 'uncommon' },
      bodyColorOverride: { key: 'silver', hex: '#b0b0c0', name: 'Silver', rarity: 'uncommon' },
      achievementName: 'Silver Crown',
      achievementDesc: `Created a ${achievements.maxRepoStars.toLocaleString()}+ star repository`
    };
  }

  // 6. Top Hat (PR to 1k+ repo) - random colors
  if (achievements.hasPRto1kRepo) {
    return {
      hat: 'tophat',
      hatColor: null, // Will be randomized
      bodyColorOverride: null, // Will be randomized
      achievementName: 'Top Hat',
      achievementDesc: `PR merged to ${achievements.maxPRRepoStars.toLocaleString()}+ star repo`
    };
  }

  // 7. Cap (100+ star repo creator) - random colors
  if (achievements.hasCreated100Repo) {
    return {
      hat: 'cap',
      hatColor: null, // Will be randomized
      bodyColorOverride: null, // Will be randomized
      achievementName: 'Cap',
      achievementDesc: `Created a ${achievements.maxRepoStars.toLocaleString()}+ star repository`
    };
  }

  return null;
}

/**
 * Generates Clawd traits from GitHub user data
 * Now with achievement-based overrides from ccc-traits.md
 *
 * @param {Object} githubData - GitHub user statistics
 * @param {string} githubData.login - GitHub username
 * @param {string} githubData.created_at - Account creation date (ISO string)
 * @param {string} [githubData.top_language] - Most used programming language
 * @param {number} [githubData.total_contributions=0] - Total contribution count
 * @param {number} [githubData.stars_received=0] - Total stars received on repositories
 * @param {number} [githubData.public_repos=0] - Number of public repositories
 * @param {number} [githubData.followers=0] - Number of followers
 * @param {number} [githubData.current_streak=0] - Current contribution streak in days
 * @param {number} [githubData.longest_streak=0] - Longest contribution streak in days
 * @param {boolean} [githubData.has_readme_profile=false] - Whether user has a profile README
 * @param {number} [githubData.pull_requests_merged=0] - Number of merged pull requests
 * @param {number} [githubData.issues_opened=0] - Number of issues opened
 * @param {boolean} [githubData.is_arctic_vault=false] - Whether code is in Arctic Code Vault
 * @param {boolean} [githubData.is_sponsor=false] - Whether user is a GitHub sponsor
 * @param {boolean} [githubData.has_org_membership=false] - Whether user belongs to organizations
 * @param {Object} [githubData.achievements] - Achievement flags from getCompleteStats
 * @returns {Object} Clawd traits object
 */
export function generateTraits(githubData) {
  const {
    login,
    created_at,
    top_language = null,
    total_contributions = 0,
    stars_received = 0,
    public_repos = 0,
    followers = 0,
    current_streak = 0,
    longest_streak = 0,
    has_readme_profile = false,
    pull_requests_merged = 0,
    issues_opened = 0,
    is_arctic_vault = false,
    is_sponsor = false,
    has_org_membership = false,
    achievements = null
  } = githubData;

  // Check for achievement overrides FIRST (from ccc-traits.md)
  const achievementOverrides = applyAchievementOverrides(achievements);

  // Calculate account age in years
  const accountAgeYears = calculateAccountAge(created_at);

  // Generate all traits (with achievement overrides applied)
  const traits = {
    // Identity
    username: login,

    // BODY COLOR - Achievement override or random based on rarity
    // Note: We no longer use top_language for body color (per ccc-traits.md)
    bodyColor: achievementOverrides?.bodyColorOverride?.hex || calculateRandomBodyColor(),
    bodyColorName: achievementOverrides?.bodyColorOverride?.name || null,
    bodyColorRarity: achievementOverrides?.bodyColorOverride?.rarity || 'random',

    // STAR COUNT - Based on total contributions (4-21)
    starCount: calculateStarCount(total_contributions),

    // STAR STYLE - Achievement override (Full Diamond) or random
    starStyle: achievementOverrides?.starStyleOverride || calculateStarStyle(),

    // STAR COLOR - Randomly assigned with rarity tiers
    starColor: calculateStarColor(),

    // ACCESSORY - Based on various stats
    accessory: calculateAccessory({
      stars_received,
      public_repos,
      total_contributions,
      followers
    }),

    // HAT - Achievement hat or random (no 1/1s for non-achievement)
    hat: achievementOverrides?.hat || calculateHat({ total_contributions }),

    // HAT COLOR - Achievement color or random
    hatColor: achievementOverrides?.hatColor || calculateHatColor(),

    // HAND - Randomly assigned with rarity tiers
    hand: calculateHand(),

    // HAND COLOR - Randomly assigned with rarity tiers (same as star colors)
    handColor: calculateHandColor(),

    // SHOES - Randomly assigned with rarity tiers
    shoes: calculateShoes(),

    // SHOE COLOR - Randomly assigned with rarity tiers (same as star colors)
    shoeColor: calculateShoeColor(),

    // ROLEX - Based on longest contribution streak
    rolex: calculateRolex(longest_streak),

    // Is this a 1/1 special edition?
    isOneOfOne: false,  // Set below if applicable

    // Achievement info (from ccc-traits.md)
    achievement: achievementOverrides ? {
      name: achievementOverrides.achievementName,
      description: achievementOverrides.achievementDesc,
      isFullDiamond: achievementOverrides.isFullDiamond || false
    } : null,

    // Raw stats for display/metadata
    stats: {
      totalContributions: total_contributions,
      starsReceived: stars_received,
      publicRepos: public_repos,
      followers: followers,
      topLanguage: top_language,
      longestStreak: longest_streak,
      currentStreak: current_streak
    }
  };

  // Mark as 1/1 if devil-full hat, ble77 hat, or adult hand
  if (traits.hat === 'devil-full' || traits.hat === 'ble77' || traits.hand === 'adult') {
    traits.isOneOfOne = true;
  }

  // 1/1 hats have their own special colors (not from the standard color system)
  if (traits.hat === 'devil-full') {
    traits.hatColor = { key: 'devil-special', hex: '#8b0000', rarity: '1/1', name: 'Devil Blood' };
  } else if (traits.hat === 'ble77') {
    traits.hatColor = { key: 'ble77-special', hex: '#1a1a2e', rarity: '1/1', name: 'Skater Midnight' };
  }

  // Full Diamond Set overrides star style to diamonds (from ccc-traits.md)
  if (achievementOverrides?.isFullDiamond) {
    traits.starStyle = 'diamonds';
    traits.starColor = { key: 'diamond', hex: '#00d4aa', rarity: 'legendary', name: 'Diamond' };
  }

  // Calculate and add rarity
  traits.rarity = calculateRarity(traits);

  return traits;
}

/**
 * Calculates account age in years from creation date
 *
 * @param {string} createdAt - ISO date string of account creation
 * @returns {number} Account age in years (decimal)
 */
function calculateAccountAge(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now - created;
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, diffYears);
}

/**
 * Body color options with rarity tiers (from ccc-traits.md)
 */
const BODY_COLORS = [
  // Common (~40%)
  { hex: '#8b5cf6', name: 'Purple', rarity: 'common', weight: 12 },
  { hex: '#ec4899', name: 'Pink', rarity: 'common', weight: 12 },
  { hex: '#22c55e', name: 'Green', rarity: 'common', weight: 12 },
  { hex: '#ffffff', name: 'White', rarity: 'common', weight: 10 },
  { hex: '#f97316', name: 'Orange', rarity: 'common', weight: 14 },
  { hex: '#3b82f6', name: 'Blue', rarity: 'common', weight: 14 },
  { hex: '#ef4444', name: 'Red', rarity: 'common', weight: 14 },
  // Uncommon
  { hex: '#b0b0c0', name: 'Silver', rarity: 'uncommon', weight: 8 },
  // Rare (achievement colors can appear randomly but rare)
  { hex: '#eab308', name: 'Gold', rarity: 'rare', weight: 2.5 },
  { hex: '#00d4aa', name: 'Diamond', rarity: 'rare', weight: 1.5 }
];

/**
 * Calculates random body color based on rarity weights (from ccc-traits.md)
 * @returns {string} Hex color code
 */
function calculateRandomBodyColor() {
  const total = BODY_COLORS.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * total;

  for (const color of BODY_COLORS) {
    rand -= color.weight;
    if (rand <= 0) return color.hex;
  }

  return BODY_COLORS[0].hex;
}

/**
 * Maps top programming language to body color
 *
 * @param {string|null} topLanguage - Primary programming language
 * @returns {string} Hex color code
 */
function calculateBodyColor(topLanguage) {
  if (!topLanguage) return DEFAULT_BODY_COLOR;
  return LANGUAGE_COLORS[topLanguage] || DEFAULT_BODY_COLOR;
}

/**
 * Calculates number of stars to display (4-21)
 * Based on total contributions with logarithmic scaling
 *
 * @param {number} totalContributions - Total contribution count
 * @returns {number} Star count (4-21)
 */
function calculateStarCount(totalContributions) {
  if (totalContributions <= 0) return 4;
  if (totalContributions < 50) return 5;
  if (totalContributions < 100) return 6;
  if (totalContributions < 200) return 7;
  if (totalContributions < 350) return 8;
  if (totalContributions < 500) return 9;
  if (totalContributions < 750) return 10;
  if (totalContributions < 1000) return 11;
  if (totalContributions < 1500) return 12;
  if (totalContributions < 2000) return 13;
  if (totalContributions < 2500) return 14;
  if (totalContributions < 3000) return 15;
  if (totalContributions < 4000) return 16;
  if (totalContributions < 5000) return 17;
  if (totalContributions < 7500) return 18;
  if (totalContributions < 10000) return 19;
  if (totalContributions < 15000) return 20;
  return 21;
}

/**
 * Determines accessory based on various stats
 *
 * @param {Object} stats - User statistics
 * @param {number} stats.stars_received - Stars received
 * @param {number} stats.public_repos - Number of repos
 * @param {number} stats.total_contributions - Total contributions
 * @param {number} stats.followers - Follower count
 * @returns {'none'|'crown'|'wand'|'keyboard'|'headphones'|'coffee'|'hoodie'} Accessory type
 */
function calculateAccessory({ stars_received, public_repos, total_contributions, followers }) {
  // Crown for popular developers (high stars + followers)
  if (stars_received >= 1000 && followers >= 500) return 'crown';

  // Wand for prolific open source contributors
  if (public_repos >= 50 && stars_received >= 500) return 'wand';

  // Keyboard for heavy contributors
  if (total_contributions >= 5000) return 'keyboard';

  // Headphones for consistent contributors
  if (total_contributions >= 1000 && public_repos >= 20) return 'headphones';

  // Coffee for active developers
  if (total_contributions >= 500) return 'coffee';

  return 'none';
}

/**
 * Determines hat type based on contributions
 * Common ~55%, Uncommon ~30%, Rare ~14%, 1/1 ~1% (0.5% devil-full, 0.5% ble77)
 *
 * @param {Object} stats - User statistics
 * @param {number} stats.total_contributions - Total contributions
 * @returns {'none'|'cap'|'tophat'|'wizardhat'|'devil'|'halo'|'crown'|'hoodie'|'devil-full'|'ble77'|'antenna'|'headphones'|'cowboy'} Hat type
 */
function calculateHat({ total_contributions }) {
  const rand = Math.random() * 100;

  // 1/1 (1% total - 0.5% each)
  if (rand < 0.5) return 'devil-full';
  if (rand < 1.0) return 'ble77';

  // Rare (~14%)
  if (rand < 4.5) return 'crown';
  if (rand < 9.5) return 'hoodie';
  if (rand < 14.5) return 'halo';

  // Uncommon (~26% - added cowboy)
  if (rand < 22.5) return 'devil';
  if (rand < 30) return 'wizardhat';
  if (rand < 38) return 'cowboy';

  // Common (~62% - added antenna, headphones)
  if (rand < 53) return 'antenna';
  if (rand < 68) return 'headphones';
  if (rand < 80) return 'tophat';
  if (rand < 92) return 'cap';
  return 'none';
}

/**
 * Determines shoe type - randomly assigned
 *
 * @returns {'none'|'slides'|'crocs'|'heels'|'jordans'} Shoe type
 */
function calculateShoes() {
  const rand = Math.random();

  // Jordans - rare (10% chance)
  if (rand < 0.10) return 'jordans';

  // High Heels - uncommon (15% chance)
  if (rand < 0.25) return 'heels';

  // Crocs - common (20% chance)
  if (rand < 0.45) return 'crocs';

  // Slides - common (25% chance)
  if (rand < 0.70) return 'slides';

  // Barefoot - default (30% chance)
  return 'none';
}

/**
 * Determines shoe color - randomly assigned with rarity weights
 * Uses same color system as star colors
 * Common ~46%: purple, pink, green, white
 * Uncommon ~50%: orange, blue, red, silver
 * Rare ~4%: gold, diamond
 *
 * @returns {Object} Shoe color object with key, hex, rarity, and name
 */
function calculateShoeColor() {
  const rand = Math.random() * 100;

  // Rare (~4%)
  if (rand < 2) return { key: 'diamond', ...STAR_COLORS.diamond };
  if (rand < 4) return { key: 'gold', ...STAR_COLORS.gold };

  // Uncommon (~50%)
  if (rand < 16.5) return { key: 'silver', ...STAR_COLORS.silver };
  if (rand < 29) return { key: 'red', ...STAR_COLORS.red };
  if (rand < 41.5) return { key: 'blue', ...STAR_COLORS.blue };
  if (rand < 54) return { key: 'orange', ...STAR_COLORS.orange };

  // Common (~46%)
  if (rand < 65.5) return { key: 'white', ...STAR_COLORS.white };
  if (rand < 77) return { key: 'green', ...STAR_COLORS.green };
  if (rand < 88.5) return { key: 'pink', ...STAR_COLORS.pink };
  return { key: 'purple', ...STAR_COLORS.purple };
}

/**
 * Determines star color - randomly assigned with rarity weights
 * Common ~46%: purple, pink, green, white
 * Uncommon ~50%: orange, blue, red, silver
 * Rare ~4%: gold, diamond
 *
 * @returns {Object} Star color object with key, hex, rarity, and name
 */
function calculateStarColor() {
  const rand = Math.random() * 100;

  // Rare (~4%)
  if (rand < 2) return { key: 'diamond', ...STAR_COLORS.diamond };
  if (rand < 4) return { key: 'gold', ...STAR_COLORS.gold };

  // Uncommon (~50%)
  if (rand < 16.5) return { key: 'silver', ...STAR_COLORS.silver };
  if (rand < 29) return { key: 'red', ...STAR_COLORS.red };
  if (rand < 41.5) return { key: 'blue', ...STAR_COLORS.blue };
  if (rand < 54) return { key: 'orange', ...STAR_COLORS.orange };

  // Common (~46%)
  if (rand < 65.5) return { key: 'white', ...STAR_COLORS.white };
  if (rand < 77) return { key: 'green', ...STAR_COLORS.green };
  if (rand < 88.5) return { key: 'pink', ...STAR_COLORS.pink };
  return { key: 'purple', ...STAR_COLORS.purple };
}

/**
 * Determines hat color - randomly assigned with rarity weights
 * Uses same color system as star colors
 * Common ~46%: purple, pink, green, white
 * Uncommon ~50%: orange, blue, red, silver
 * Rare ~4%: gold, diamond
 *
 * NOTE: 1/1 hats (devil-full, ble77) have their own special colors and don't use this system
 *
 * @returns {Object} Hat color object with key, hex, rarity, and name
 */
function calculateHatColor() {
  const rand = Math.random() * 100;

  // Rare (~4%)
  if (rand < 2) return { key: 'diamond', ...STAR_COLORS.diamond };
  if (rand < 4) return { key: 'gold', ...STAR_COLORS.gold };

  // Uncommon (~50%)
  if (rand < 16.5) return { key: 'silver', ...STAR_COLORS.silver };
  if (rand < 29) return { key: 'red', ...STAR_COLORS.red };
  if (rand < 41.5) return { key: 'blue', ...STAR_COLORS.blue };
  if (rand < 54) return { key: 'orange', ...STAR_COLORS.orange };

  // Common (~46%)
  if (rand < 65.5) return { key: 'white', ...STAR_COLORS.white };
  if (rand < 77) return { key: 'green', ...STAR_COLORS.green };
  if (rand < 88.5) return { key: 'pink', ...STAR_COLORS.pink };
  return { key: 'purple', ...STAR_COLORS.purple };
}

/**
 * Determines star style - randomly assigned with rarity weights
 * Common ~82%, Uncommon ~14%, Rare ~3.5%
 *
 * @returns {'bright'|'swords'|'music'|'none'|'unholy'|'goth'|'bitcoin'|'diamonds'} Star style
 */
function calculateStarStyle() {
  const rand = Math.random() * 100;

  // Rare (~3.5%)
  if (rand < 1.5) return 'diamonds';
  if (rand < 3.5) return 'bitcoin';

  // Uncommon (~14%)
  if (rand < 9.5) return 'goth';
  if (rand < 17.5) return 'unholy';

  // Common (~82%)
  if (rand < 31.5) return 'none';
  if (rand < 49.5) return 'music';
  if (rand < 71.5) return 'swords';
  return 'bright';  // Default ~28%
}

/**
 * Determines hand color - randomly assigned with rarity weights
 * Uses same color system as star colors
 * Common ~46%: purple, pink, green, white
 * Uncommon ~50%: orange, blue, red, silver
 * Rare ~4%: gold, diamond
 *
 * @returns {Object} Hand color object with key, hex, rarity, and name
 */
function calculateHandColor() {
  const rand = Math.random() * 100;

  // Rare (~4%)
  if (rand < 2) return { key: 'diamond', ...STAR_COLORS.diamond };
  if (rand < 4) return { key: 'gold', ...STAR_COLORS.gold };

  // Uncommon (~50%)
  if (rand < 16.5) return { key: 'silver', ...STAR_COLORS.silver };
  if (rand < 29) return { key: 'red', ...STAR_COLORS.red };
  if (rand < 41.5) return { key: 'blue', ...STAR_COLORS.blue };
  if (rand < 54) return { key: 'orange', ...STAR_COLORS.orange };

  // Common (~46%)
  if (rand < 65.5) return { key: 'white', ...STAR_COLORS.white };
  if (rand < 77) return { key: 'green', ...STAR_COLORS.green };
  if (rand < 88.5) return { key: 'pink', ...STAR_COLORS.pink };
  return { key: 'purple', ...STAR_COLORS.purple };
}

/**
 * Determines hand accessory - randomly assigned with rarity weights
 * Common ~80%, Uncommon ~16%, Rare ~3%, 1/1 ~0.5%
 *
 * @returns {'none'|'peace'|'pen'|'microphone'|'coffee'|'phone'|'rolex'|'adult'} Hand accessory
 */
function calculateHand() {
  const rand = Math.random() * 100;

  // 1/1 (0.5%)
  if (rand < 0.5) return 'adult';

  // Rare (~3%)
  if (rand < 3.5) return 'rolex';

  // Uncommon (~16%)
  if (rand < 10.5) return 'phone';
  if (rand < 19.5) return 'coffee';

  // Common (~80%)
  if (rand < 31.5) return 'microphone';
  if (rand < 47.5) return 'pen';
  if (rand < 67.5) return 'peace';
  return 'none';  // Default ~32%
}

/**
 * Determines Rolex trait based on longest contribution streak
 * Diamond (365+ days) and Gold (100-364 days) are guaranteed
 * Under 100 days has scaling chance to get a normal Rolex
 *
 * @param {number} longestStreak - Longest contribution streak in days
 * @returns {Object} Rolex object with has, color, and tier properties
 */
function calculateRolex(longestStreak) {
  // Guaranteed tiers
  if (longestStreak >= 365) {
    return { has: true, color: '#00d4aa', tier: 'diamond' };
  }
  if (longestStreak >= 100) {
    return { has: true, color: '#eab308', tier: 'gold' };
  }

  // Scaling chance for normal Rolex
  let chance = 0;
  if (longestStreak >= 70) chance = 0.75;
  else if (longestStreak >= 50) chance = 0.50;
  else if (longestStreak >= 30) chance = 0.35;
  else if (longestStreak >= 14) chance = 0.20;
  else if (longestStreak >= 7) chance = 0.10;

  if (Math.random() < chance) {
    // Random color for normal Rolex
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return { has: true, color: randomColor, tier: 'normal' };
  }

  return { has: false, color: null, tier: null };
}

/**
 * Calculates overall rarity based on trait combination
 *
 * @param {Object} traits - Complete traits object
 * @returns {'common'|'uncommon'|'rare'|'epic'|'legendary'} Rarity tier
 */
export function calculateRarity(traits) {
  let rarityScore = 0;

  // Star count scoring (4-21 range, so divide by 3)
  rarityScore += Math.floor(traits.starCount / 3);

  // Star style scoring
  const starStyleScores = {
    bright: 0,
    swords: 0,
    music: 0,
    none: 0,
    unholy: 2,
    goth: 2,
    bitcoin: 5,
    diamonds: 6
  };
  rarityScore += starStyleScores[traits.starStyle] || 0;

  // Star color scoring
  if (traits.starColor) {
    const starColorScores = {
      // Common colors: 0 points
      purple: 0,
      pink: 0,
      green: 0,
      white: 0,
      // Uncommon colors: 2 points
      orange: 2,
      blue: 2,
      red: 2,
      silver: 2,
      // Rare colors
      gold: 4,
      diamond: 5
    };
    rarityScore += starColorScores[traits.starColor.key] || 0;
  }

  // Hat color scoring (same as star color)
  if (traits.hatColor) {
    const hatColorScores = {
      // Common colors: 0 points
      purple: 0,
      pink: 0,
      green: 0,
      white: 0,
      // Uncommon colors: 2 points
      orange: 2,
      blue: 2,
      red: 2,
      silver: 2,
      // Rare colors
      gold: 4,
      diamond: 5,
      // 1/1 special colors
      'devil-special': 15,
      'ble77-special': 15
    };
    rarityScore += hatColorScores[traits.hatColor.key] || 0;
  }

  // Accessory scoring
  const accessoryScores = {
    none: 0,
    coffee: 1,
    headphones: 2,
    keyboard: 2,
    wand: 3,
    crown: 5
  };
  rarityScore += accessoryScores[traits.accessory] || 0;

  // Hat scoring
  const hatScores = {
    none: 0,
    cap: 1,
    tophat: 1,
    antenna: 1,
    headphones: 1,
    wizardhat: 2,
    wizard: 2,
    cowboy: 2,
    devil: 3,  // Uncommon
    halo: 5,   // Rare
    hoodie: 4,
    crown: 5,
    'devil-full': 15,  // ⛧ RARE 1/1 ⛧
    'ble77': 15  // 🛹 RARE 1/1 - Skateboard legend
  };
  rarityScore += hatScores[traits.hat] || 0;

  // Hand scoring
  const handScores = {
    none: 0,
    peace: 0,
    pen: 0,
    microphone: 0,
    coffee: 1,
    phone: 2,
    rolex: 4,
    adult: 15  // 1/1
  };
  rarityScore += handScores[traits.hand] || 0;

  // Shoes scoring
  const shoesScores = {
    none: 0,
    slides: 1,
    crocs: 1,
    heels: 2,
    jordans: 4  // 🔥 Fire kicks
  };
  rarityScore += shoesScores[traits.shoes] || 0;

  // Shoe color scoring (same as star color/hat color)
  if (traits.shoeColor) {
    const shoeColorScores = {
      // Common colors: 0 points
      purple: 0,
      pink: 0,
      green: 0,
      white: 0,
      // Uncommon colors: 2 points
      orange: 2,
      blue: 2,
      red: 2,
      silver: 2,
      // Rare colors
      gold: 4,
      diamond: 5
    };
    rarityScore += shoeColorScores[traits.shoeColor.key] || 0;
  }

  // Hand color scoring (same as shoe color)
  if (traits.handColor) {
    const handColorScores = {
      // Common colors: 0 points
      purple: 0,
      pink: 0,
      green: 0,
      white: 0,
      // Uncommon colors: 2 points
      orange: 2,
      blue: 2,
      red: 2,
      silver: 2,
      // Rare colors
      gold: 4,
      diamond: 5
    };
    rarityScore += handColorScores[traits.handColor.key] || 0;
  }

  // Rolex scoring
  if (traits.rolex && traits.rolex.has) {
    const rolexScores = {
      diamond: 10,  // 💎 365+ day streak
      gold: 6,      // 🥇 100-364 day streak
      normal: 3     // Random color Rolex
    };
    rarityScore += rolexScores[traits.rolex.tier] || 0;
  }

  // Determine rarity tier
  if (rarityScore >= 30) return 'legendary';
  if (rarityScore >= 20) return 'epic';
  if (rarityScore >= 12) return 'rare';
  if (rarityScore >= 6) return 'uncommon';
  return 'common';
}

/**
 * Generates human-readable descriptions for each trait
 *
 * @param {Object} traits - Complete traits object
 * @returns {Object.<string, string>} Trait descriptions keyed by trait name
 */
export function getTraitDescriptions(traits) {
  const descriptions = {};

  // Body color description
  const languageDescriptions = {
    'TypeScript': 'Azure blue reflecting TypeScript mastery.',
    'JavaScript': 'Golden yellow emanating JavaScript energy.',
    'Python': 'Deep blue symbolizing Pythonic wisdom.',
    'Rust': 'Warm copper tone of a Rustacean.',
    'Go': 'Cyan glow of a Gopher.',
    'Ruby': 'Rich crimson of a Ruby gem.',
    'Java': 'Burnt orange of Java tradition.',
    'C++': 'Vibrant pink of C++ power.',
    'Solidity': 'Dark grey of blockchain mastery.',
    'Unknown': 'Classic Claude teal, language-agnostic excellence.'
  };
  descriptions.bodyColor = languageDescriptions[traits.topLanguage] ||
    (traits.bodyColor === DEFAULT_BODY_COLOR
      ? 'Classic Claude teal, language-agnostic excellence.'
      : `Custom color representing ${traits.topLanguage} development.`);

  // Star count description
  if (traits.starCount === 0) {
    descriptions.starCount = 'No stars yet - the journey begins.';
  } else if (traits.starCount <= 2) {
    descriptions.starCount = `${traits.starCount} star${traits.starCount > 1 ? 's' : ''} - building momentum.`;
  } else if (traits.starCount <= 5) {
    descriptions.starCount = `${traits.starCount} stars - a consistent contributor.`;
  } else {
    descriptions.starCount = `${traits.starCount} stars - a prolific developer!`;
  }

  // Star style description
  const starStyleDescriptions = {
    bright: 'Bright stars - classic and shining.',
    swords: 'Crossed swords ⚔ - the warrior coder.',
    music: 'Music notes 𝄞♪♫ - coding with rhythm.',
    none: 'No decoration - minimalist and clean.',
    unholy: 'Unholy symbols ⸸ - dark arts of code.',
    goth: 'Goth symbols ☠🕷🕸 - embracing the shadows.',
    bitcoin: 'Bitcoin ₿ - the crypto developer.',
    diamonds: 'Diamonds ◆ - rare and precious.'
  };
  descriptions.starStyle = starStyleDescriptions[traits.starStyle] || 'Unknown star style.';

  // Star color description
  if (traits.starColor) {
    const starColorDescriptions = {
      // Common
      purple: 'Purple stars - mystical and vibrant.',
      pink: 'Pink stars - bold and playful.',
      green: 'Green stars - fresh and natural.',
      white: 'White stars - pure and classic.',
      // Uncommon
      orange: 'Orange stars - warm and energetic.',
      blue: 'Blue stars - calm and focused.',
      red: 'Red stars - passionate and fierce.',
      silver: 'Silver stars - sleek and refined.',
      // Rare
      gold: 'Gold stars - rare and prestigious.',
      diamond: 'Diamond stars - the rarest sparkle of all.'
    };
    descriptions.starColor = starColorDescriptions[traits.starColor.key] || `${traits.starColor.name} stars.`;
  } else {
    descriptions.starColor = 'Unknown star color.';
  }

  // Accessory description
  const accessoryDescriptions = {
    none: 'No accessories - pure and unadorned.',
    coffee: 'A trusty coffee mug for those long coding sessions.',
    headphones: 'Headphones for focused, distraction-free development.',
    keyboard: 'A mechanical keyboard badge of the dedicated coder.',
    wand: 'A magic wand for the open source wizard.',
    crown: 'A crown befitting developer royalty.'
  };
  descriptions.accessory = accessoryDescriptions[traits.accessory] || 'Unknown accessory.';

  // Hat description
  const hatDescriptions = {
    none: 'No hat - letting those ears breathe.',
    cap: 'A casual cap for the everyday coder.',
    tophat: 'A dapper top hat for the distinguished developer.',
    wizardhat: 'A mystical wizard hat for the coding sorcerer.',
    wizard: 'A mystical wizard hat for the coding sorcerer.',
    devil: 'Blood red devil horns. A little mischief never hurt anyone.',
    halo: '○ A golden halo. Pure code, pure intentions.',
    hoodie: 'A snug hoodie for those late-night coding marathons.',
    crown: 'A royal crown for the legendary developer.',
    'devil-full': '⛧ RARE 1/1 ⛧ The full devil package. Pentagrams, symbols, horns. You sold your soul to the code.',
    'ble77': '🛹 RARE 1/1 🛹 The legendary ble77 skate cap. Kickflips, grinds, and code commits. Skate or die, code or cry.',
    antenna: 'An antenna for receiving cosmic code signals.',
    headphones: 'Headphones for coding in the zone.',
    cowboy: 'A cowboy hat for the code wrangler.'
  };
  descriptions.hat = hatDescriptions[traits.hat] || 'Unknown hat.';

  // Hat color description
  if (traits.hatColor) {
    const hatColorDescriptions = {
      // Common
      purple: 'Purple hat - mystical and vibrant.',
      pink: 'Pink hat - bold and playful.',
      green: 'Green hat - fresh and natural.',
      white: 'White hat - pure and classic.',
      // Uncommon
      orange: 'Orange hat - warm and energetic.',
      blue: 'Blue hat - calm and focused.',
      red: 'Red hat - passionate and fierce.',
      silver: 'Silver hat - sleek and refined.',
      // Rare
      gold: 'Gold hat - rare and prestigious.',
      diamond: 'Diamond hat - the rarest sparkle of all.',
      // 1/1 special colors
      'devil-special': '⛧ Devil Blood - the crimson of eternal damnation.',
      'ble77-special': '🛹 Skater Midnight - dark as a late-night skate session.'
    };
    descriptions.hatColor = hatColorDescriptions[traits.hatColor.key] || `${traits.hatColor.name} hat.`;
  } else {
    descriptions.hatColor = 'Unknown hat color.';
  }

  // Hand description
  const handDescriptions = {
    none: 'Empty hands - ready for anything.',
    peace: 'Peace sign ✌︎ - spreading good vibes.',
    pen: 'Pen ✎ - the classic writer coder.',
    microphone: 'Microphone 🎙 - the speaker and teacher.',
    coffee: 'Coffee ☕︎ - fuel for the soul.',
    phone: 'Phone 🖥 - always connected.',
    rolex: 'Rolex ⏱ - time is money, streak is everything.',
    adult: '( ๏ 人 ๏ ) - 1/1 NSFW edition. Eyes wide open.'
  };
  descriptions.hand = handDescriptions[traits.hand] || 'Unknown hand accessory.';

  // Hand color description
  if (traits.handColor) {
    const handColorDescriptions = {
      // Common
      purple: 'Purple hands - mystical and vibrant.',
      pink: 'Pink hands - bold and playful.',
      green: 'Green hands - fresh and natural.',
      white: 'White hands - pure and classic.',
      // Uncommon
      orange: 'Orange hands - warm and energetic.',
      blue: 'Blue hands - calm and focused.',
      red: 'Red hands - passionate and fierce.',
      silver: 'Silver hands - sleek and refined.',
      // Rare
      gold: 'Gold hands - rare and prestigious.',
      diamond: 'Diamond hands - the rarest sparkle of all.'
    };
    descriptions.handColor = handColorDescriptions[traits.handColor.key] || `${traits.handColor.name} hands.`;
  } else {
    descriptions.handColor = 'Unknown hand color.';
  }

  // Shoes description
  const shoesDescriptions = {
    none: 'Barefoot - feeling the code beneath your feet.',
    slides: 'Comfy slides for casual coding sessions.',
    crocs: 'Crocs with sport mode activated. Maximum comfort.',
    heels: 'High heels - coding in style, standing tall.',
    jordans: '🔥 Jordans - the freshest kicks in the codebase.'
  };
  descriptions.shoes = shoesDescriptions[traits.shoes] || 'Unknown shoes.';

  // Shoe color description
  if (traits.shoeColor) {
    const shoeColorDescriptions = {
      // Common
      purple: 'Purple shoes - mystical and vibrant.',
      pink: 'Pink shoes - bold and playful.',
      green: 'Green shoes - fresh and natural.',
      white: 'White shoes - pure and classic.',
      // Uncommon
      orange: 'Orange shoes - warm and energetic.',
      blue: 'Blue shoes - calm and focused.',
      red: 'Red shoes - passionate and fierce.',
      silver: 'Silver shoes - sleek and refined.',
      // Rare
      gold: 'Gold shoes - rare and prestigious.',
      diamond: 'Diamond shoes - the rarest sparkle of all.'
    };
    descriptions.shoeColor = shoeColorDescriptions[traits.shoeColor.key] || `${traits.shoeColor.name} shoes.`;
  } else {
    descriptions.shoeColor = 'Unknown shoe color.';
  }

  // Rolex description
  if (traits.rolex && traits.rolex.has) {
    const rolexDescriptions = {
      diamond: '💎 Diamond Rolex - 365+ day streak. Time is on your side.',
      gold: '🥇 Gold Rolex - 100+ day streak. Consistency pays off.',
      normal: '⌚ Rolex - A symbol of dedication earned through streaks.'
    };
    descriptions.rolex = rolexDescriptions[traits.rolex.tier] || 'A mysterious timepiece.';
  } else {
    descriptions.rolex = 'No Rolex - keep that streak going!';
  }

  // Rarity description
  const rarityDescriptions = {
    common: 'Common - A standard Clawd, but still unique!',
    uncommon: 'Uncommon - Standing out from the crowd.',
    rare: 'Rare - A distinguished member of the community.',
    epic: 'Epic - An exceptional developer with remarkable achievements.',
    legendary: 'Legendary - Among the most elite developers in existence!'
  };
  descriptions.rarity = rarityDescriptions[traits.rarity] || 'Unknown rarity.';

  return descriptions;
}

/**
 * Validates GitHub data input and returns sanitized version
 *
 * @param {Object} githubData - Raw GitHub data
 * @returns {Object} Sanitized GitHub data with defaults
 */
export function validateGitHubData(githubData) {
  if (!githubData || typeof githubData !== 'object') {
    throw new Error('GitHub data must be an object');
  }

  if (!githubData.login || typeof githubData.login !== 'string') {
    throw new Error('GitHub login (username) is required');
  }

  if (!githubData.created_at) {
    throw new Error('GitHub account creation date (created_at) is required');
  }

  // Validate date format
  const createdDate = new Date(githubData.created_at);
  if (isNaN(createdDate.getTime())) {
    throw new Error('Invalid created_at date format');
  }

  // Return sanitized data with defaults for optional fields
  return {
    login: githubData.login.trim(),
    created_at: githubData.created_at,
    top_language: githubData.top_language || null,
    total_contributions: Math.max(0, parseInt(githubData.total_contributions) || 0),
    stars_received: Math.max(0, parseInt(githubData.stars_received) || 0),
    public_repos: Math.max(0, parseInt(githubData.public_repos) || 0),
    followers: Math.max(0, parseInt(githubData.followers) || 0),
    current_streak: Math.max(0, parseInt(githubData.current_streak) || 0),
    longest_streak: Math.max(0, parseInt(githubData.longest_streak) || 0),
    has_readme_profile: Boolean(githubData.has_readme_profile),
    pull_requests_merged: Math.max(0, parseInt(githubData.pull_requests_merged) || 0),
    issues_opened: Math.max(0, parseInt(githubData.issues_opened) || 0),
    is_arctic_vault: Boolean(githubData.is_arctic_vault),
    is_sponsor: Boolean(githubData.is_sponsor),
    has_org_membership: Boolean(githubData.has_org_membership)
  };
}

/**
 * Get all possible trait values for documentation/UI
 *
 * @returns {Object} Object containing all possible values for each trait
 */
export function getTraitOptions() {
  return {
    starStyles: ['bright', 'swords', 'music', 'none', 'unholy', 'goth', 'bitcoin', 'diamonds'],
    starColors: STAR_COLORS,
    hatColors: STAR_COLORS,  // Hat colors use the same color system as star colors
    shoeColors: STAR_COLORS,  // Shoe colors use the same color system as star colors
    handColors: STAR_COLORS,  // Hand colors use the same color system as star colors
    accessories: ['none', 'coffee', 'headphones', 'keyboard', 'wand', 'crown'],
    hats: ['none', 'cap', 'tophat', 'wizardhat', 'devil', 'halo', 'hoodie', 'crown', 'devil-full', 'ble77', 'antenna', 'headphones', 'cowboy'],
    hands: ['none', 'peace', 'pen', 'microphone', 'coffee', 'phone', 'rolex', 'adult'],
    shoes: ['none', 'slides', 'crocs', 'heels', 'jordans'],
    rolexTiers: ['none', 'normal', 'gold', 'diamond'],
    rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    languageColors: LANGUAGE_COLORS,
    defaultBodyColor: DEFAULT_BODY_COLOR
  };
}
