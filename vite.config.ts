import { defineConfig } from 'vite'

export default defineConfig({
  base: '',
  plugins: [
    {
      name: 'cache-iso',
      configureServer: server => {
        server.middlewares.use((req, res, next) => {
          if (req.originalUrl.toLowerCase().includes('.iso')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          }
          next()
        })
      },
    },
  ],
})
