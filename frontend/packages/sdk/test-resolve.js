try {
  console.log('ethers:', require.resolve('ethers'));
  console.log('wallet:', require.resolve('@railgun-community/wallet'));
  console.log('shared-models:', require.resolve('@railgun-community/shared-models'));
} catch (e) {
  console.error(e.message);
}
