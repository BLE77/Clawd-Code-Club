import { generateStaticHTML, generateAnimatedHTML, EXAMPLE_TRAITS } from './artwork-generator.js';
import fs from 'fs';

const variants = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const tokenIds = { common: '1234', uncommon: '5678', rare: '3456', epic: '9993', legendary: '9164' };

variants.forEach(variant => {
  const traits = EXAMPLE_TRAITS[variant];
  if (!traits) return;

  const staticHTML = generateStaticHTML(traits);
  fs.writeFileSync('./generated/' + variant + '-static.html', staticHTML);

  const animatedHTML = generateAnimatedHTML(traits, tokenIds[variant]);
  fs.writeFileSync('./generated/' + variant + '-animated.html', animatedHTML);

  console.log('Generated ' + variant + ': hand=' + (traits.hand || 'none'));
});
console.log('Done!');
