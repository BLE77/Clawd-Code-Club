/**
 * Check Candy Machine status
 *
 * Usage: npx tsx skill/scripts/status.ts [candy-machine-address]
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCandyMachine, fetchCandyMachine, fetchCandyGuard } from '@metaplex-foundation/mpl-candy-machine';
import { publicKey } from '@metaplex-foundation/umi';
import * as fs from 'fs';

async function main() {
  let candyMachineAddress = process.argv[2];

  // Try to load from deployment.json if no address provided
  if (!candyMachineAddress) {
    if (fs.existsSync('deployment.json')) {
      const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'));
      candyMachineAddress = deployment.candyMachine;
      console.log(`Loading from deployment.json...\n`);
    } else {
      console.error('Usage: npx tsx skill/scripts/status.ts <candy-machine-address>');
      console.error('Or run from a directory with deployment.json');
      process.exit(1);
    }
  }

  const umi = createUmi('https://api.mainnet-beta.solana.com').use(mplCandyMachine());

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   CANDY MACHINE STATUS                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const cmPubkey = publicKey(candyMachineAddress);
    const cm = await fetchCandyMachine(umi, cmPubkey);

    const itemsAvailable = Number(cm.data.itemsAvailable);
    const itemsLoaded = Number(cm.itemsLoaded);
    const itemsRedeemed = Number(cm.itemsRedeemed);
    const remaining = itemsAvailable - itemsRedeemed;

    console.log('📍 ADDRESS');
    console.log(`   ${candyMachineAddress}\n`);

    console.log('📊 ITEMS');
    console.log(`   Available: ${itemsAvailable}`);
    console.log(`   Loaded:    ${itemsLoaded}/${itemsAvailable}`);
    console.log(`   Minted:    ${itemsRedeemed}/${itemsAvailable}`);
    console.log(`   Remaining: ${remaining}\n`);

    // Progress bar
    const mintProgress = Math.round((itemsRedeemed / itemsAvailable) * 20);
    const loadProgress = Math.round((itemsLoaded / itemsAvailable) * 20);
    const mintBar = '█'.repeat(mintProgress) + '░'.repeat(20 - mintProgress);
    const loadBar = '█'.repeat(loadProgress) + '░'.repeat(20 - loadProgress);

    console.log(`   Loaded:  [${loadBar}] ${Math.round((itemsLoaded / itemsAvailable) * 100)}%`);
    console.log(`   Minted:  [${mintBar}] ${Math.round((itemsRedeemed / itemsAvailable) * 100)}%\n`);

    // Config
    console.log('⚙️  CONFIG');
    console.log(`   Authority:  ${cm.authority}`);
    console.log(`   Collection: ${cm.collectionMint}`);

    if (cm.data.configLineSettings.__option === 'Some') {
      const settings = cm.data.configLineSettings.value;
      console.log(`   Name:       ${settings.prefixName}XXXX`);
      console.log(`   Sequential: ${settings.isSequential}`);
    }

    // Fetch guard info if available
    try {
      const guard = await fetchCandyGuard(umi, cm.mintAuthority);
      console.log(`\n🛡️  GUARDS`);

      const guards = guard.guards;
      if (guards.solPayment.__option === 'Some') {
        const payment = guards.solPayment.value;
        const price = Number(payment.lamports.basisPoints) / 1e9;
        console.log(`   SOL Payment: ${price} SOL`);
        console.log(`   Destination: ${payment.destination}`);
      }

      if (guards.startDate.__option === 'Some') {
        const start = new Date(Number(guards.startDate.value.date) * 1000);
        console.log(`   Start Date:  ${start.toISOString()}`);
      }

      if (guards.endDate.__option === 'Some') {
        const end = new Date(Number(guards.endDate.value.date) * 1000);
        console.log(`   End Date:    ${end.toISOString()}`);
      }

      if (guards.mintLimit.__option === 'Some') {
        console.log(`   Mint Limit:  ${guards.mintLimit.value.limit} per wallet`);
      }
    } catch {
      // No guard or can't fetch
    }

    console.log('\n🔗 LINKS');
    console.log(`   Explorer: https://explorer.solana.com/address/${candyMachineAddress}`);

    // Status summary
    console.log('\n📋 STATUS');
    if (itemsLoaded < itemsAvailable) {
      console.log(`   ⚠️  Partially loaded - run resume script`);
    } else if (itemsRedeemed === 0) {
      console.log(`   ✅ Ready for minting`);
    } else if (itemsRedeemed < itemsAvailable) {
      console.log(`   🔄 Minting in progress`);
    } else {
      console.log(`   🎉 SOLD OUT!`);
    }

  } catch (error: any) {
    console.error('Error fetching candy machine:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
