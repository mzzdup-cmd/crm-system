import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/xlsx")) {
            return "xlsx";
          }

          if (id.includes("node_modules/recharts")) {
            return "recharts";
          }

          if (id.includes("node_modules/firebase")) {
            return "firebase";
          }

          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/")
          ) {
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
