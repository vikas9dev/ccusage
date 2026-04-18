import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadRootEnv() {
  const envFile = resolve(__dirname, '../.env')
  if (!existsSync(envFile)) return {}
  const vars = {}
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    vars[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
  }
  return vars
}

export default defineConfig(() => {
  const env = loadRootEnv()
  const backendPort  = parseInt(env.BACKEND_PORT  || '9001')
  const frontendPort = parseInt(env.FRONTEND_PORT || '5173')

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      proxy: { '/api': `http://localhost:${backendPort}` }
    }
  }
})
