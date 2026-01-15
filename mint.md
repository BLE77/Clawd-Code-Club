# NFT Collection Minting Skill

Deploy and manage Solana NFT collections using Metaplex Candy Machine.

## Commands

### `/mint setup`
Interactive setup for a new NFT collection. Creates config files and folder structure.

### `/mint deploy`
Deploy a candy machine with your collection. Uploads metadata to Arweave and creates the on-chain candy machine.

### `/mint status [address]`
Check the status of a candy machine (items loaded, minted, etc).

### `/mint resume [address]`
Resume a partially deployed candy machine.

---

## Setup Instructions

When the user runs `/mint setup`, guide them through:

1. **Collection Name** - Name for the NFT collection
2. **Symbol** - 3-5 character symbol (e.g., "CCC")
3. **Supply** - Total number of NFTs
4. **Mint Price** - Price in SOL
5. **Treasury Wallet** - Address to receive mint payments
6. **Royalties** - Percentage for secondary sales (e.g., 5%)
7. **Metadata Location** - Path to metadata JSON files
8. **Image Location** - Path to image files (PNG/GIF)

Create the following files:
- `collection-config.json` - Main configuration
- `collections/<name>/` - Collection folder structure

## Deploy Instructions

When the user runs `/mint deploy`:

1. Load `collection-config.json`
2. Verify all metadata files exist
3. Check wallet balance (need ~0.5+ SOL)
4. Upload metadata to Irys/Arweave
5. Create candy machine
6. Add config lines (all items)
7. Save deployment info to `deployment.json`

Use the scripts in `skill/scripts/` for deployment.

## Required Files

### collection-config.json
```json
{
  "name": "Collection Name",
  "symbol": "SYM",
  "description": "Collection description",
  "supply": 777,
  "mintPrice": 0.1,
  "royalties": 500,
  "treasury": "WALLET_ADDRESS",
  "authority": "path/to/keypair.json",
  "metadata": "path/to/metadata/",
  "rpc": "https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY"
}
```

### RPC Provider (Required)

You need your own Solana RPC provider. The public RPC has rate limits that will cause failures.

**Free options:**
- **Helius** (Recommended): https://helius.dev - 100k requests/day free
- **QuickNode**: https://quicknode.com - 10M credits/month free
- **Alchemy**: https://alchemy.com - 300M compute/month free

Set your RPC URL in `.env`:
```bash
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### Metadata Files
Each NFT needs a JSON file (0001.json, 0002.json, etc.) with:
```json
{
  "name": "NFT Name #0001",
  "symbol": "SYM",
  "description": "Description",
  "image": "ipfs://CID/0001.png",
  "attributes": [...],
  "properties": {
    "creators": [{ "address": "...", "share": 100 }]
  }
}
```

## Dependencies

The project needs these npm packages:
```bash
npm install @metaplex-foundation/mpl-candy-machine @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults @metaplex-foundation/umi-uploader-irys @metaplex-foundation/mpl-token-metadata
```

## Example Workflow

```
User: /mint setup
Assistant: [Creates collection-config.json with user inputs]

User: /mint deploy
Assistant: [Deploys candy machine, shows progress, saves deployment.json]

User: /mint status
Assistant: [Shows: 500/777 minted, 0.5 SOL earned, etc.]
```

## Error Handling

- **Insufficient balance**: Need at least 0.5 SOL for deployment
- **Rate limiting**: Script auto-retries with exponential backoff
- **Blockhash expired**: Use `/mint resume` to continue
- **URI too long**: Use prefix URI pattern with short hashes

## Output Files

After deployment:
- `deployment.json` - Candy machine addresses and config
- Saved to project root for easy access
