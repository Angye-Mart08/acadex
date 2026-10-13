import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

console.log('======================================================')
console.log(' ACADEX — Iniciando servicios integrados (API + Web)')
console.log('======================================================')

const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'

const apiProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: resolve(rootDir, 'api'),
  stdio: 'inherit',
  shell: true,
})

const webProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: resolve(rootDir, 'web'),
  stdio: 'inherit',
  shell: true,
})

function cleanup() {
  console.log('\nDeteniendo servicios de Acadex...')
  apiProcess.kill()
  webProcess.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
