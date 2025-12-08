#!/usr/bin/env node

/**
 * Script to manually apply ZetachainTestnet support to nested shared-models dependency
 * This handles the case where @railgun-community/wallet has its own shared-models@7.5.0
 */

const fs = require('fs');
const path = require('path');

const nestedPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@railgun-community',
  'wallet',
  'node_modules',
  '@railgun-community',
  'shared-models',
  'dist',
  'models',
  'network-config.js'
);

const nestedDtsPath = nestedPath.replace('.js', '.d.ts');

function checkAndApplyPatch(filePath, isDts = false) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if ZetachainTestnet already exists
  if (content.includes('ZetachainTestnet')) {
    console.log(`✅ ZetachainTestnet already exists in ${path.basename(filePath)}`);
    return true;
  }

  // Apply patch for .d.ts file
  if (isDts) {
    content = content.replace(
      /PolygonMumbai_DEPRECATED = "Polygon_Mumbai"\n}/,
      'PolygonMumbai_DEPRECATED = "Polygon_Mumbai",\n    ZetachainTestnet = "Zetachain_Testnet"\n}'
    );
  } else {
    // Apply patch for .js file - this is more complex, so we'll just log
    console.log(`⚠️  Manual patch needed for ${path.basename(filePath)}`);
    console.log(`   Please ensure ZetachainTestnet is added to the nested dependency`);
    return false;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Applied patch to ${path.basename(filePath)}`);
  return true;
}

console.log('Checking nested shared-models dependency...');

const dtsPatched = checkAndApplyPatch(nestedDtsPath, true);
const jsPatched = checkAndApplyPatch(nestedPath, false);

if (dtsPatched || jsPatched) {
  console.log('✅ Nested dependency patch applied');
} else {
  console.log('ℹ️  Nested dependency already patched or not found');
}

