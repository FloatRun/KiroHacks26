import { build } from 'esbuild'

await build({
  entryPoints: ['src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/handler.js',
  format: 'esm',
  sourcemap: true,
  minify: false,
  external: [
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-bedrock-agent-runtime',
    '@aws-sdk/client-ssm',
  ],
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
})

console.log('Build complete → dist/handler.js')
