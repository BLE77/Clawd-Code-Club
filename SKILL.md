---
name: ccc-mint
description: Mint your Claude Code Club NFT - a generative Clawd based on your GitHub profile
triggers:
  - mint my ccc nft
  - claude code club
  - ccc mint
  - mint my claude nft
  - claim ccc
---

# CCC - Claude Code Club Minter

Welcome to the Claude Code Club. Your code tells a story. Your Clawd tells the world.

## What This Skill Does

The CCC Minter generates your unique **Clawd** - the official mascot of Claude Code. Each Clawd is a one-of-one generative NFT on Solana, algorithmically derived from your GitHub profile. No two Clawds are alike because no two developers are alike.

When invoked, this skill will:
1. Fetch your GitHub profile stats via the GitHub API
2. Calculate your Clawd traits based on your developer journey
3. Render your personalized Clawd in FULL COLOR ASCII art in the terminal
4. Display your complete trait summary
5. Provide instructions for minting on Solana

## Terminal Rendering

After analyzing your GitHub profile, your Clawd will be rendered directly in the terminal using ANSI escape codes for true color display.

### ANSI Color System

The skill uses 24-bit RGB ANSI escape codes for accurate color rendering:

```
\x1b[38;2;R;G;Bm  - Set foreground color to RGB(R,G,B)
\x1b[48;2;R;G;Bm  - Set background color to RGB(R,G,B)
\x1b[0m           - Reset all formatting
\x1b[1m           - Bold/Bright
\x1b[5m           - Blink (for special effects)
```

### Language Color Palette

Your Clawd's body color is determined by your primary GitHub language:

| Language | Color Name | Hex Code | RGB Values |
|----------|------------|----------|------------|
| Python | Python Blue | #3572A5 | (53, 114, 165) |
| JavaScript | JS Yellow | #F7DF1E | (247, 223, 30) |
| TypeScript | TS Blue | #3178C6 | (49, 120, 198) |
| Rust | Rust Orange | #DEA584 | (222, 165, 132) |
| Go | Go Cyan | #00ADD8 | (0, 173, 216) |
| Ruby | Ruby Red | #CC342D | (204, 52, 45) |
| Java | Java Orange | #B07219 | (176, 114, 25) |
| C++ | CPP Pink | #F34B7D | (243, 75, 125) |
| C | C Gray | #555555 | (85, 85, 85) |
| Solidity | Ethereum Purple | #AA6746 | (170, 103, 70) |
| PHP | PHP Purple | #4F5D95 | (79, 93, 149) |
| Swift | Swift Orange | #F05138 | (240, 81, 56) |
| Kotlin | Kotlin Purple | #A97BFF | (169, 123, 255) |
| Scala | Scala Red | #C22D40 | (194, 45, 64) |
| Elixir | Elixir Purple | #6E4A7E | (110, 74, 126) |
| Haskell | Haskell Purple | #5D4F85 | (93, 79, 133) |
| Default | Claude Orange | #DA7756 | (218, 119, 86) |

### Hat Colors

| Hat Type | Color | Hex Code |
|----------|-------|----------|
| Devil Horns | Hellfire Red | #FF2D2D |
| Wizard Hat | Mystic Purple | #8B5CF6 |
| Crown | Royal Gold | #FFD700 |
| Halo | Divine White | #FFFACD |
| None | N/A | N/A |

### Accessory Colors

Stars, sparkles, and special accessories render in randomized bright colors from this palette:
- Star Gold: #FFD700
- Hot Pink: #FF69B4
- Electric Blue: #00BFFF
- Neon Green: #39FF14
- Cosmic Purple: #9400D3

### Shoes with Fire Tips

When your Clawd earns **Jordans** (1000+ stars), the shoe tips render with animated fire colors:
```
Fire Palette: #FF4500 -> #FF6B35 -> #FFD700 (gradient effect)
```

## Clawd ASCII Art Template

The Clawd is rendered using this base template, with colors applied via ANSI codes:

```
        ★   ★
      ★   ★   ★
         ◢█◣
        █████
       ███████
      █████████
     ███████████
    █████████████
   ██████   ██████
  ██████     ██████
  █████  ◉ ◉  █████
  █████   ▽   █████
  ██████     ██████
   ███████████████
    █████████████
     ███████████
      █████████
       ███████
        █████
       ██   ██
      ███   ███
     ████   ████
```

### Rendering Process

1. **Fetch GitHub Stats**
   ```bash
   # Using GitHub CLI or API
   gh api users/{username}
   gh api users/{username}/repos --paginate
   ```

2. **Calculate Traits**
   - Account age -> Evolution stage
   - Top language -> Body color RGB
   - Star count -> Star style + shoe type
   - Repo count -> Eye complexity
   - Streak data -> Aura effect

3. **Apply ANSI Colors**
   ```
   # Example: Python developer body
   \x1b[38;2;53;114;165m█████████\x1b[0m

   # Example: Devil horns in red
   \x1b[38;2;255;45;45m◢█◣\x1b[0m

   # Example: Gold star
   \x1b[38;2;255;215;0m★\x1b[0m
   ```

4. **Render Complete Clawd**
   The full Clawd is assembled line-by-line with appropriate color codes applied to each element.

## Output Format

After rendering your Clawd, the skill displays a comprehensive trait summary:

```
═══════════════════════════════════════════════════════════════
                    YOUR CLAWD TRAITS
═══════════════════════════════════════════════════════════════
  Body Color    : Python Blue (#3572A5)
  Star Count    : 1,247 ⭐
  Hat           : Wizard 🧙
  Shoes         : Jordans 🔥
  Rolex         : Gold 🥇
  Accessory     : Keyboard ⌨️
  Aura          : Blazing Corona 🔥
  Evolution     : Architect (7 years)
  Background    : Night (2,341 contributions)
  Rarity Score  : LEGENDARY ✨✨✨
═══════════════════════════════════════════════════════════════

  GitHub Stats Snapshot:
  ─────────────────────────────────────────────────────────────
  Username      : @yourhandle
  Repositories  : 87
  Total Stars   : 1,247
  Followers     : 432
  Contributions : 2,341 (last year)
  Top Language  : Python
  Account Age   : 7 years, 3 months
═══════════════════════════════════════════════════════════════
```

## Minting Instructions

After viewing your Clawd, follow these steps to mint:

```
═══════════════════════════════════════════════════════════════
                    READY TO MINT?
═══════════════════════════════════════════════════════════════

  Your Clawd is ready! To mint on Solana:

  1. Visit: https://claudecodeclub.com/mint
  2. Connect your Solana wallet (Phantom/Solflare)
  3. Authorize GitHub (read-only)
  4. Confirm transaction (~0.01 SOL)

  Your traits are locked to your GitHub ID.
  One developer = One Clawd. Forever.

═══════════════════════════════════════════════════════════════
```

## Example Terminal Output

Here is what a fully rendered Clawd looks like in the terminal (colors shown as comments):

```

       [GOLD]★[/]   [PINK]★[/]                      <- Random star colors
     [BLUE]★[/]   [GOLD]★[/]   [GREEN]★[/]

        [RED]◢███◣[/]                               <- Devil horns (if earned)
       [RED] ████ [/]

      [#3572A5]█████████[/]                         <- Body in Python Blue
     [#3572A5]███████████[/]
    [#3572A5]█████████████[/]
   [#3572A5]███████████████[/]
  [#3572A5]█████████████████[/]
  [#3572A5]██████[/]     [#3572A5]██████[/]
  [#3572A5]█████[/] [WHITE]◉ ◉[/] [#3572A5]█████[/] <- Eyes
  [#3572A5]█████[/]  [WHITE]▽[/]  [#3572A5]█████[/] <- Smile
  [#3572A5]██████[/]     [#3572A5]██████[/]
   [#3572A5]███████████████[/]
    [#3572A5]█████████████[/]
     [#3572A5]███████████[/]

      [#FFD700]◯[/]                                 <- Gold Rolex (if earned)

      [#3572A5]█████████[/]
       [#3572A5]███████[/]
        [#3572A5]█████[/]

       [BLACK]██[/]   [BLACK]██[/]                  <- Jordans
      [BLACK]███[/]   [BLACK]███[/]
     [#FF4500]█[/][BLACK]██[/]   [#FF4500]█[/][BLACK]██[/]  <- Fire tips!
```

The actual terminal output uses real ANSI escape sequences:
```bash
# Example of how a single line is rendered:
echo -e "\x1b[38;2;53;114;165m█████████\x1b[0m"
#        └─ Python Blue RGB ─┘         └─ Reset
```

## Meet Clawd

Clawd is the spirit animal of Claude Code users - a distinctive, evolving companion that grows with your coding journey. Your Clawd is not randomly generated; it is *earned*. Every trait reflects something real about your contributions to the open source ecosystem.

Clawd represents the intersection of AI-assisted development and developer identity. It is proof that you were here, building with Claude Code, leaving your mark on the blockchain.

## Trait Generation System

Your Clawd's appearance is deterministically generated from your GitHub profile data. Here is how each trait is determined:

### Evolution Stage (Base Form)
Your GitHub account age determines your Clawd's evolutionary stage:

| Account Age | Evolution Stage | Description |
|-------------|-----------------|-------------|
| < 1 year | **Spark** | Fresh energy, bright-eyed newcomer |
| 1-2 years | **Coder** | Finding their rhythm, building momentum |
| 3-5 years | **Hacker** | Battle-tested, shipping code that matters |
| 6-9 years | **Architect** | Designing systems, mentoring others |
| 10+ years | **Legend** | The ancients who remember when JavaScript was simple |

### Body Color (Primary Language)
Your most-used programming language determines your Clawd's body color. See the **Language Color Palette** section above for exact RGB values used in terminal rendering.

### Background (Contribution Density)
Your total contribution count shapes the environment behind your Clawd:

| Contributions | Background |
|---------------|------------|
| < 100 | Dawn (soft gradient) |
| 100-500 | Day (clear sky) |
| 500-1000 | Sunset (warm tones) |
| 1000-5000 | Night (starfield) |
| 5000+ | Cosmos (deep space) |

### Aura (Contribution Streak)
Your longest contribution streak manifests as a visible aura:

| Streak | Aura Effect |
|--------|-------------|
| < 7 days | None |
| 7-30 days | Faint glow |
| 30-90 days | Pulsing ring |
| 90-180 days | Radiant halo |
| 180-365 days | Blazing corona |
| 365+ days | Legendary flame |

### Star Style (Stars Received)
The total stars across your repositories determine your Clawd's star accessory:

| Stars | Star Style |
|-------|------------|
| 0-10 | None |
| 11-50 | Single sparkle |
| 51-200 | Constellation |
| 201-1000 | Galaxy cluster |
| 1000+ | Supernova crown |

### Additional Traits
- **Eyes**: Repository count (more repos = more complex eye patterns)
- **Accessories**: Special achievements (Arctic Code Vault, GitHub Sponsors, etc.)
- **Expression**: Ratio of issues closed to opened
- **Particles**: Languages used (each language adds unique particle effects)

## Requirements

Before minting, ensure you have:

### Technical Requirements
- **Node.js 18+** or **Bun** runtime
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Stable internet connection

### Blockchain Requirements
- **Solana wallet** (Phantom or Solflare recommended)
- **~0.01 SOL** for transaction gas fees
- Wallet must be connected to Solana mainnet
- **Solana RPC URL** - You need your own RPC provider (free options below)

### RPC Provider Setup (Required)

The public Solana RPC has rate limits. You'll need a dedicated RPC provider. Free options:

| Provider | Free Tier | Signup |
|----------|-----------|--------|
| **Helius** (Recommended) | 100k requests/day | https://helius.dev |
| **QuickNode** | 10M credits/month | https://quicknode.com |
| **Alchemy** | 300M compute/month | https://alchemy.com |

After signing up, add your RPC URL to `.env`:
```bash
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### Identity Requirements
- **GitHub account** (public profile)
- OAuth authorization for trait reading (read-only, no write access)

## How to Run

Simply trigger this skill in Claude Code by saying one of:
- "mint my ccc nft"
- "claude code club"
- "ccc mint"

The skill will:
1. Detect your GitHub username from your local git config
2. Fetch your public GitHub stats via the API
3. Calculate all traits based on your profile
4. Render your full-color Clawd directly in the terminal
5. Display your trait summary
6. Provide minting instructions

## One-Per-Developer Rule

Each GitHub account can mint exactly **one** Clawd. This is enforced on-chain using your GitHub user ID as a unique identifier. This design choice serves multiple purposes:

1. **Sybil Resistance**: Prevents mint farming and maintains collection integrity
2. **True Identity**: Your Clawd represents you, not a collection of alts
3. **Value Preservation**: Scarcity tied to real developer accounts
4. **Fair Distribution**: One developer, one Clawd, no exceptions

If you already minted with your GitHub account, the minter will recognize you and display your existing Clawd instead of allowing a second mint.

## Rarity System

Clawds follow an organic rarity distribution based on real developer demographics:

### Evolution Rarity
- **Spark** (< 1 year): ~15% of developers
- **Coder** (1-2 years): ~25% of developers
- **Hacker** (3-5 years): ~30% of developers
- **Architect** (6-9 years): ~20% of developers
- **Legend** (10+ years): ~10% of developers

### Trait Rarity
Rare traits emerge naturally from exceptional GitHub profiles:
- **Cosmos backgrounds** require 5000+ contributions (< 5% of developers)
- **Legendary flame auras** require 365+ day streaks (< 1% of developers)
- **Supernova crowns** require 1000+ stars (< 2% of developers)

### Special Editions
Certain GitHub achievements unlock ultra-rare accessories:
- **Arctic Code Vault Contributor**: Frozen crystal effect
- **GitHub Star**: Official star badge
- **GitHub Sponsors**: Patron heart
- **Mars 2020 Contributor**: Red planet particle

The rarity of your Clawd is not random - it is a reflection of your real contributions to open source.

## Post-Mint

After minting, your Clawd lives on the Solana blockchain forever. You can:
- View it in your wallet (Phantom, Solflare, Backpack)
- Display it on Magic Eden, Tensor, or other Solana marketplaces
- Use it as your PFP across web3 platforms
- Trade it (though we hope you keep your first Clawd)

Your Clawd's metadata includes your GitHub stats at mint time - a permanent snapshot of your developer journey.

---

*Built with Claude Code. Powered by developers. Owned by you.*
