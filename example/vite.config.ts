import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Remove base path for Tauri
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT || process.env.DEV_PORT || "3847"),
    // Listen on all interfaces for Docker container access
    host: process.env.VITE_HOST || "0.0.0.0",
    // Prevent browser from opening automatically when used with Tauri
    open: false,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  // Clear host for Tauri compatibility
  clearScreen: false,
});
