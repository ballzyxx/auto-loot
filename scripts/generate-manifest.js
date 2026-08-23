'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'manifest.json');
const FILE_ENTRIES = [
    "README.md",
    {
        "file": "config.js",
        "overwrite": false
    },
    "index.js",
    "module.json"
];
const DEFS = null;

function sha256(filePath) {
    const raw = fs.readFileSync(filePath);
    const normalized = Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8');
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

const outFiles = {};
for (const entry of FILE_ENTRIES) {
    const rel = typeof entry === 'string' ? entry : entry.file;
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) throw new Error('Missing file: ' + rel);
    const hash = sha256(full);
    const key = rel.replace(/\\/g, '/');
    if (entry && typeof entry === 'object' && entry.overwrite === false) {
        outFiles[key] = { overwrite: false, hash };
    } else {
        outFiles[key] = hash;
    }
}

const payload = { files: outFiles };
if (DEFS) payload.defs = DEFS;
fs.writeFileSync(OUT, JSON.stringify(payload, null, 4).replace(/\r\n/g, '\n') + '\n');
console.log('Wrote manifest.json (' + Object.keys(outFiles).length + ' files)');
