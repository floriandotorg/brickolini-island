import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, loadEnv } from 'vite'
import glsl from 'vite-plugin-glsl'

const BASE_PORT = 5184

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const offset = Number(env.VITE_PORT_OFFSET ?? 0)

  return {
    plugins: [env.VITE_HTTPS === 'true' ? basicSsl() : null, tailwindcss(), glsl()],
    server: { host: true, port: BASE_PORT + offset },
    appType: 'mpa',
  }
})
