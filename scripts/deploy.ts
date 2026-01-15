/**
 * Deploy Candy Machine from collection-config.json
 *
 * Usage: npx tsx skill/scripts/deploy.ts [config-path]
 */

import 'dotenv/config';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import {
  mplCandyMachine,
  create,
  addConfigLines,
  fetchCandyMachine,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  createSignerFromKeypair,
  signerIdentity,
  generateSigner,
  percentAmount,
  some,
  publicKey,
  sol,
  createGenericFile,
} from '@metaplex-foundation/umi';
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import * as fs from 'fs';
import * as path from 'path';

interface CollectionConfig {
  name: string;
  symbol: string;
  description: string;
  supply: number;
  mintPrice: number;
  royalties: number;
  treasury: string;
  authority: string;
  metadata: string;
  rpc: string;
  existingCollection?: string | null;
}

function loadConfig(configPath: string): CollectionConfig {
  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content);
}

function loadKeypair(filepath: string): Uint8Array {
  const absolutePath = path.isAbsolute(filepath) ? filepath : path.resolve(filepath);
  const secretKeyString = fs.readFileSync(absolutePath, 'utf-8');
  return Uint8Array.from(JSON.parse(secretKeyString));
}

async function main() {
  const configPath = process.argv[2] || 'collection-config.json';

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              CANDY MACHINE DEPLOYMENT                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Load config
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    console.error('Create one from skill/templates/collection-config.json');
    process.exit(1);
  }

  const config = loadConfig(configPath);
  console.log(`Collection: ${config.name} (${config.symbol})`);
  console.log(`Supply: ${config.supply} NFTs`);
  console.log(`Mint Price: ${config.mintPrice} SOL`);
  console.log(`Treasury: ${config.treasury}\n`);

  // Initialize Umi
  const secretKey = loadKeypair(config.authority);
  const umi = createUmi(config.rpc)
    .use(mplCandyMachine())
    .use(mplTokenMetadata())
    .use(irysUploader());

  const authorityKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  const authoritySigner = createSignerFromKeypair(umi, authorityKeypair);
  umi.use(signerIdentity(authoritySigner));

  console.log(`Authority: ${authoritySigner.publicKey}`);

  // Check balance
  const balance = await umi.rpc.getBalance(authoritySigner.publicKey);
  const balanceSOL = Number(balance.basisPoints) / 1e9;
  console.log(`Balance: ${balanceSOL} SOL`);

  if (balanceSOL < 0.5) {
    console.error('\nInsufficient balance. Need at least 0.5 SOL.');
    process.exit(1);
  }

  // Find metadata files
  const metadataPath = path.isAbsolute(config.metadata)
    ? config.metadata
    : path.resolve(config.metadata);

  const metadataFiles = fs.readdirSync(metadataPath)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => parseInt(a) - parseInt(b));

  if (metadataFiles.length !== config.supply) {
    console.error(`\nExpected ${config.supply} metadata files, found ${metadataFiles.length}`);
    process.exit(1);
  }

  console.log(`\nFound ${metadataFiles.length} metadata files`);

  // Upload metadata to Irys
  console.log('\n📦 Uploading metadata to Irys/Arweave...');

  const uris: string[] = [];
  const UPLOAD_BATCH = 50;

  for (let i = 0; i < metadataFiles.length; i += UPLOAD_BATCH) {
    const batch = metadataFiles.slice(i, Math.min(i + UPLOAD_BATCH, metadataFiles.length));

    const genericFiles = batch.map(filename => {
      const content = fs.readFileSync(path.join(metadataPath, filename), 'utf-8');
      return createGenericFile(content, filename, { contentType: 'application/json' });
    });

    const batchUris = await umi.uploader.upload(genericFiles);
    uris.push(...batchUris);

    const progress = Math.min(i + UPLOAD_BATCH, metadataFiles.length);
    console.log(`   Uploaded: ${progress}/${metadataFiles.length}`);
  }

  console.log(`   ✅ All metadata uploaded!`);

  // Handle collection
  let collectionMintPubkey;
  if (config.existingCollection) {
    console.log(`\n📚 Using existing collection: ${config.existingCollection}`);
    collectionMintPubkey = publicKey(config.existingCollection);
  } else {
    console.log('\n📚 Creating collection NFT...');

    const collectionMetadata = {
      name: config.name,
      symbol: config.symbol,
      description: config.description,
      image: uris[0],
      external_url: '',
    };

    const [collectionUri] = await umi.uploader.upload([
      createGenericFile(
        JSON.stringify(collectionMetadata),
        'collection.json',
        { contentType: 'application/json' }
      ),
    ]);

    const collectionMint = generateSigner(umi);
    const nftBuilder = createNft(umi, {
      mint: collectionMint,
      name: config.name,
      symbol: config.symbol,
      uri: collectionUri,
      sellerFeeBasisPoints: percentAmount(config.royalties / 100),
      isCollection: true,
    });
    await nftBuilder.sendAndConfirm(umi);

    collectionMintPubkey = collectionMint.publicKey;
    console.log(`   ✅ Collection: ${collectionMintPubkey}`);
  }

  // Create Candy Machine
  console.log('\n🍬 Creating Candy Machine...');

  const candyMachine = generateSigner(umi);

  const createBuilder = await create(umi, {
    candyMachine,
    collectionMint: collectionMintPubkey,
    collectionUpdateAuthority: authoritySigner,
    tokenStandard: 0,
    sellerFeeBasisPoints: percentAmount(config.royalties / 100),
    itemsAvailable: config.supply,
    creators: [
      {
        address: publicKey(config.treasury),
        verified: false,
        percentageShare: 100,
      },
    ],
    configLineSettings: some({
      prefixName: `${config.name} #`,
      nameLength: 4,
      prefixUri: 'https://gateway.irys.xyz/',
      uriLength: 44,
      isSequential: false,
    }),
    guards: {
      solPayment: some({
        lamports: sol(config.mintPrice),
        destination: publicKey(config.treasury),
      }),
    },
  });
  await createBuilder.sendAndConfirm(umi);

  console.log(`   ✅ Candy Machine: ${candyMachine.publicKey}`);

  // Add config lines
  console.log('\n📝 Adding config lines...');

  const CONFIG_BATCH = 10;

  for (let i = 0; i < config.supply; i += CONFIG_BATCH) {
    const batchSize = Math.min(CONFIG_BATCH, config.supply - i);

    const configLines = [];
    for (let j = 0; j < batchSize; j++) {
      const idx = i + j;
      const id = String(idx + 1).padStart(4, '0');
      const hash = uris[idx].replace('https://gateway.irys.xyz/', '');
      configLines.push({ name: id, uri: hash });
    }

    let retries = 5;
    while (retries > 0) {
      try {
        const builder = addConfigLines(umi, {
          candyMachine: candyMachine.publicKey,
          index: i,
          configLines,
        });
        await builder.sendAndConfirm(umi);
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    const progress = Math.round(((i + batchSize) / config.supply) * 100);
    process.stdout.write(`\r   Progress: ${i + batchSize}/${config.supply} (${progress}%)`);
  }

  console.log('\n   ✅ All config lines added!');

  // Verify and save
  const cm = await fetchCandyMachine(umi, candyMachine.publicKey);

  const deployment = {
    candyMachine: candyMachine.publicKey.toString(),
    collection: collectionMintPubkey.toString(),
    treasury: config.treasury,
    authority: authoritySigner.publicKey.toString(),
    itemsAvailable: config.supply,
    itemsLoaded: Number(cm.itemsLoaded),
    mintPrice: config.mintPrice,
    royalties: config.royalties / 100 + '%',
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://explorer.solana.com/address/${candyMachine.publicKey}`,
  };

  fs.writeFileSync('deployment.json', JSON.stringify(deployment, null, 2));

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    DEPLOYMENT COMPLETE!                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📍 ADDRESSES:');
  console.log(`   Candy Machine: ${deployment.candyMachine}`);
  console.log(`   Collection:    ${deployment.collection}`);
  console.log(`   Treasury:      ${deployment.treasury}`);

  console.log('\n🔗 Explorer:', deployment.explorerUrl);
  console.log('\n💾 Saved to deployment.json');
}

main().catch((error) => {
  console.error('\n❌ Deployment failed:', error.message || error);
  process.exit(1);
});
