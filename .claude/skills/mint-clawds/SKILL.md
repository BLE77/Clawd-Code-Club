---
name: mint-clawds
description: Mint a Clawd NFT from Claude Code Club. Starts the local minting server and opens the mint page.
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(start:*), Bash(open:*), Bash(xdg-open:*), Bash(git:*)
user-invocable: true
---

# /mint-clawds - Claude Code Club

> **EXCLUSIVE TO CLAUDE CODE USERS** - Mint your unique Clawd. You must be shipping with Claude to join the club.

## What This Skill Does

Starts the local minting server and opens the mint page. Connect your Solana wallet, click mint, and you're in the club.

## When To Use

- User says "mint a clawd" or "mint clawds"
- User says "/mint-clawds"
- User wants to join Claude Code Club

## Instructions

### Step 1: Check if repo exists

Look for `package.json` with `"name": "claude-code-club"`.

If NOT found, clone the repo first:
```bash
git clone https://github.com/BLE77/Clawd-Code-Club.git
cd Clawd-Code-Club
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Start the minting server

```bash
npm start
```

The browser should open automatically to http://localhost:3456

### Step 4: Tell the user

```
Minting server running at: http://localhost:3456

COLLECTION:
- Supply: 777 Clawds
- Network: Solana Mainnet

TO MINT:
1. Connect your Solana wallet (Phantom/Solflare)
2. Click "Mint Clawd"
3. Approve transaction
4. Welcome to the club!
```

---

## About the Collection

777 unique ASCII art Clawds on Solana. Each has different traits:

| Trait | Examples |
|-------|----------|
| Body | Diamond, Gold, Purple, Pink, Green |
| Hat | Crown, Halo, Wizard, Devil, Hoodie |
| Stars | Bitcoin, Diamonds, Music, Swords |
| Hand | Rolex, Coffee, Peace, Phone |
| Shoes | Jordans, Heels, Crocs, Slides |

---

## Troubleshooting

**Port in use?** Kill the process using port 3456.

**No wallet?** Install Phantom (phantom.app) or Solflare (solflare.com).

**Transaction fails?** Make sure wallet is on Mainnet with enough SOL.
