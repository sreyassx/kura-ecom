import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetFile = path.resolve(__dirname, '../node_modules/nitro/dist/vite.mjs');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  const target = `ctx._isRolldown = !!this.meta.rolldownVersion;`;
  const replacement = `ctx._isRolldown = !!(this && this.meta && this.meta.rolldownVersion);`;
  
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ [Postinstall Patch] Successfully patched nitro/dist/vite.mjs for Vite 6 compatibility.');
  } else if (content.includes(replacement)) {
    console.log('ℹ️ [Postinstall Patch] nitro/dist/vite.mjs is already patched.');
  } else {
    console.warn('⚠️ [Postinstall Patch] Could not find target pattern in nitro/dist/vite.mjs.');
  }
} else {
  console.warn('⚠️ [Postinstall Patch] nitro/dist/vite.mjs not found.');
}
