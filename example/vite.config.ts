import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Remove base path for Tauri
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  server: {
    port: 3003,
    // Prevent browser from opening automatically when used with Tauri
    open: false,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  // Clear host for Tauri compatibility
  clearScreen: false,
});
