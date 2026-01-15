/**
 * Resume adding config lines to a partially deployed Candy Machine
 *
 * Usage: npx tsx skill/scripts/resume.ts [candy-machine-address] [config-path]
 */

import 'dotenv/config';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import {
  mplCandyMachine,
  addConfigLines,
  fetchCandyMachine,
} from '@metaplex-foundation/mpl-candy-machine';
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
  createGenericFile,
} from '@metaplex-foundation/umi';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import * as fs from 'fs';
import * as path from 'path';

interface CollectionConfig {
  authority: string;
  metadata: string;
  rpc: string;
}

function loadKeypair(filepath: string): Uint8Array {
  const absolutePath = path.isAbsolute(filepath) ? filepath : path.resolve(filepath);
  const secretKeyString = fs.readFileSync(absolutePath, 'utf-8');
  return Uint8Array.from(JSON.parse(secretKeyString));
}

async function main() {
  let candyMachineAddress = process.argv[2];
  const configPath = process.argv[3] || 'collection-config.json';

  // Try to load from deployment.json if no address provided
  if (!candyMachineAddress) {
    if (fs.existsSync('deployment.json')) {
      const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'));
      candyMachineAddress = deployment.candyMachine;
    } else {
      console.error('Usage: npx tsx skill/scripts/resume.ts <candy-machine-address> [config-path]');
      process.exit(1);
    }
  }

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const config: CollectionConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              RESUME CANDY MACHINE DEPLOYMENT                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Initialize Umi
  const secretKey = loadKeypair(config.authority);
  const umi = createUmi(config.rpc || 'https://api.mainnet-beta.solana.com')
    .use(mplCandyMachine())
    .use(mplTokenMetadata())
    .use(irysUploader());

  const authorityKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  const authoritySigner = createSignerFromKeypair(umi, authorityKeypair);
  umi.use(signerIdentity(authoritySigner));

  console.log(`Authority: ${authoritySigner.publicKey}`);

  const balance = await umi.rpc.getBalance(authoritySigner.publicKey);
  console.log(`Balance: ${Number(balance.basisPoints) / 1e9} SOL\n`);

  // Fetch candy machine state
  const cmPubkey = publicKey(candyMachineAddress);
  const cm = await fetchCandyMachine(umi, cmPubkey);

  const itemsAvailable = Number(cm.data.itemsAvailable);
  const itemsLoaded = Number(cm.itemsLoaded);

  console.log(`Candy Machine: ${candyMachineAddress}`);
  console.log(`Items Loaded: ${itemsLoaded}/${itemsAvailable}`);

  if (itemsLoaded >= itemsAvailable) {
    console.log('\n✅ All items already loaded!');
    return;
  }

  const startIndex = itemsLoaded;
  const remaining = itemsAvailable - itemsLoaded;
  console.log(`\nNeed to load ${remaining} more items starting from index ${startIndex}`);

  // Get metadata files
  const metadataPath = path.isAbsolute(config.metadata)
    ? config.metadata
    : path.resolve(config.metadata);

  const metadataFiles = fs.readdirSync(metadataPath)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .slice(startIndex);

  // Upload remaining metadata
  console.log('\n📦 Uploading remaining metadata to Irys...');
  console.log(`   Uploading ${metadataFiles.length} files...`);

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

  console.log(`   ✅ Uploaded ${uris.length} metadata files`);

  // Add config lines
  console.log('\n📝 Adding config lines...');

  const CONFIG_BATCH = 10;
  let currentIndex = startIndex;

  for (let i = 0; i < uris.length; i += CONFIG_BATCH) {
    const batchSize = Math.min(CONFIG_BATCH, uris.length - i);

    const configLines = [];
    for (let j = 0; j < batchSize; j++) {
      const idx = currentIndex + j;
      const id = String(idx + 1).padStart(4, '0');
      const hash = uris[i + j].replace('https://gateway.irys.xyz/', '');
      configLines.push({ name: id, uri: hash });
    }

    let retries = 5;
    while (retries > 0) {
      try {
        const builder = addConfigLines(umi, {
          candyMachine: cmPubkey,
          index: currentIndex,
          configLines,
        });
        await builder.sendAndConfirm(umi);
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) throw error;
        console.log(`   Retry (${5 - retries}/5)...`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    currentIndex += batchSize;
    const totalLoaded = currentIndex;
    const progress = Math.round((totalLoaded / itemsAvailable) * 100);
    process.stdout.write(`\r   Progress: ${totalLoaded}/${itemsAvailable} (${progress}%)`);
  }

  console.log('\n   ✅ All config lines added!');

  // Verify
  const finalCm = await fetchCandyMachine(umi, cmPubkey);
  console.log(`\n📊 Final State:`);
  console.log(`   Items Loaded: ${finalCm.itemsLoaded}/${finalCm.data.itemsAvailable}`);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUME COMPLETE!                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message || error);
  process.exit(1);
});
