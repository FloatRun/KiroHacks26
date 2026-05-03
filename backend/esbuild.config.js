import { build } from 'esbuild'
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

// Cross-platform zip for Lambda deployment
async function createZip(outputPath, files) {
  const { execSync } = await import('child_process')
  const distDir = resolve(__dirname, 'dist')

  if (process.platform === 'win32') {
    const filePaths = files.map(f => resolve(distDir, f)).join("','")
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${filePaths}' -DestinationPath '${outputPath}' -Force"`,
    )
  } else {
    const fileList = files.join(' ')
    execSync(`cd "${distDir}" && zip -r handler.zip ${fileList}`)
  }
}

const distDir = resolve(__dirname, 'dist')
const zipPath = resolve(distDir, 'handler.zip')
await createZip(zipPath, ['handler.js', 'handler.js.map'])

console.log('Build complete → dist/handler.js + dist/handler.zip')
