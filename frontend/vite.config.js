export default defineConfig({
  plugins: [react()],
  base: './', // 👈 ADD THIS LINE RIGHT HERE
  server: {
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
