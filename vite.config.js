import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
    "process.env": {}, // 👈 prevent process env reference crash
  },
  resolve: {
    alias: {
      process: "process/browser", // 👈 add process alias
      buffer: "buffer/",          // 👈 keep buffer alias
    },
  },
  optimizeDeps: {
    include: ["buffer", "process"],
  },
});



