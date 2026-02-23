import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        configure(proxy) {
          const origEmit = proxy.emit.bind(proxy)
          proxy.emit = function (event, ...args) {
            if (event === 'error' && (args[0]?.code === 'ECONNRESET' || args[0]?.code === 'ECONNREFUSED')) return true
            return origEmit.apply(this, [event, ...args])
          }
        },
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
        configure(proxy) {
          // Подавляем ECONNRESET/ECONNREFUSED (норма при выключенном или перезапуске бэкенда)
          const origEmit = proxy.emit.bind(proxy)
          proxy.emit = function (event, ...args) {
            if (event === 'error' && (args[0]?.code === 'ECONNRESET' || args[0]?.code === 'ECONNREFUSED')) {
              return true
            }
            return origEmit.apply(this, [event, ...args])
          }
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            setImmediate(() => {
              socket.removeAllListeners('error')
              socket.on('error', (err) => {
                if (err.code !== 'ECONNRESET' && err.code !== 'ECONNREFUSED') {
                  console.error('ws proxy socket error:', err)
                }
              })
            })
          })
        },
      },
    },
  },
})
