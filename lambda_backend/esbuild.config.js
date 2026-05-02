import esbuild from 'esbuild'
import { mkdir, rm } from 'fs/promises'
import { execSync } from 'child_process'

async function build() {
  // Clean dist
  await rm('dist', { recursive: true, force: true })
  await mkdir('dist', { recursive: true })

  // Bundle with esbuild — CommonJS format for Lambda compatibility
  await esbuild.build({
    entryPoints: ['src/handler.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: 'dist/handler.js',
    external: [
      '@aws-sdk/client-bedrock-runtime',
      '@aws-sdk/client-bedrock-agent-runtime',
      '@aws-sdk/client-ssm',
    ],
  })

  console.log('✓ Bundle created: dist/handler.js')

  // Create zip for Lambda deployment using native zip command
  execSync('cd dist && zip handler.zip handler.js', { stdio: 'inherit' })

  console.log('✓ Deployment package created: dist/handler.zip')
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
