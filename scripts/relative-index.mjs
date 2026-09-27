// The static fallback page points at /app/...; make those paths relative so the build works from any folder.
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'build/index.html';
writeFileSync(file, readFileSync(file, 'utf8').replaceAll('"/app/', '"./app/'));
