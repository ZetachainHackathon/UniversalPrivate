# Zetachain Railgun Test

## Installation

```bash
npm install
```

The `postinstall` script will automatically apply patches to add ZetachainTestnet support.

## Run the test

```bash
npx tsx main.ts
```

## Configuration

Set up your environment variables in `.env`:

```env
MNEMONIC=your mnemonic phrase here
PRIVATE_KEY=your private key here
```

## Troubleshooting

If you encounter issues with nested dependencies:

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Manually apply patches: `npx patch-package`

If `@railgun-community/wallet` has a nested `shared-models` dependency that's missing ZetachainTestnet, you may need to manually patch it after installation.
