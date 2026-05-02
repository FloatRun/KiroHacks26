import { build } from 'esbuild'
import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: ['src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/handler.js',
  format: 'esm',
  sourcemap: true,
  minify: false,
  external: ['@aws-sdk/*'],
})

// Zip for Lambda deployment
const distDir = resolve(__dirname, 'dist')
execSync(`cd ${distDir} && zip -r handler.zip handler.js handler.js.map`)

console.log('Build complete → dist/handler.js + dist/handler.zip')
