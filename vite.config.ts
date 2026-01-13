import { defineConfig } from 'vite'
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  plugins: [react()],
  root: path.resolve(__dirname, "client")
})
