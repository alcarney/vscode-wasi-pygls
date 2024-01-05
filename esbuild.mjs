import * as esbuild from 'esbuild'

await esbuild.build({
    entryPoints: ['src/node/extension.ts'],
    outfile: 'dist/node/extension.js',
    format: 'cjs',
    bundle: true,
    sourcemap: true,
    target: 'es2020',
    external: ['vscode'],
    platform: 'node'
})

await esbuild.build({
    entryPoints: ['src/web/extension.ts'],
    outfile: 'dist/web/extension.js',
    format: 'cjs',
    bundle: true,
    sourcemap: true,
    target: 'es2020',
    external: ['vscode'],
    platform: 'browser'
})
