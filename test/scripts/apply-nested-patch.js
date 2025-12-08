#!/usr/bin/env node

/**
 * Script to copy patched shared-models files to nested dependency
 * This copies the already-patched files from top-level shared-models to wallet's nested shared-models
 */

const fs = require('fs');
const path = require('path');

// Source: top-level shared-models (already patched)
const sourceJsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@railgun-community',
  'shared-models',
  'dist',
  'models',
  'network-config.js'
);

const sourceDtsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@railgun-community',
  'shared-models',
  'dist',
  'models',
  'network-config.d.ts'
);

// Target: wallet's nested shared-models
const targetJsPath = path.join(
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

const targetDtsPath = path.join(
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
  'network-config.d.ts'
);

function copyFile(sourcePath, targetPath, fileName) {
  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`Source file not found: ${sourcePath}`);
    return false;
  }

  // Check if target directory exists
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    console.log(`Target directory not found: ${targetDir}`);
    return false;
  }

  // Check if target already has ZetachainTestnet
  if (fs.existsSync(targetPath)) {
    const targetContent = fs.readFileSync(targetPath, 'utf8');
    if (targetContent.includes('ZetachainTestnet')) {
      console.log(`${fileName} already contains ZetachainTestnet, skipping copy`);
      return true;
    }
  }

  // Copy file
  try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${fileName} to nested dependency`);
    return true;
  } catch (error) {
    console.error(`Failed to copy ${fileName}:`, error.message);
    return false;
  }
}

console.log('Copying patched shared-models files to nested dependency...');

const jsCopied = copyFile(sourceJsPath, targetJsPath, 'network-config.js');
const dtsCopied = copyFile(sourceDtsPath, targetDtsPath, 'network-config.d.ts');

if (jsCopied && dtsCopied) {
  console.log('Nested dependency files updated successfully');
} else if (jsCopied || dtsCopied) {
  console.log('Partially updated nested dependency files');
} else {
  console.log('Nested dependency files already up to date or not found');
}

