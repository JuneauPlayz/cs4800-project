import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = path.join(__dirname, '..', 'splitstack.db');

if (fs.existsSync(databasePath)) {
  fs.rmSync(databasePath);
}

await import('../src/db.js');
console.log(`Reset database at ${databasePath}`);
