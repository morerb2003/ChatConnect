import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills(),
  ],
  define: {
    global: "globalThis",
  },
  build: {
    chunkSizeWarningLimit: 1500, // Suppress chunk size warning for 1.3 MB bundle
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries for better caching
          react: ['react', 'react-dom', 'react-router-dom'],
          stomp: ['@stomp/stompjs', 'sockjs-client'],
          firebase: ['firebase/app', 'firebase/messaging'],
        },
      },
    },
  },
});
