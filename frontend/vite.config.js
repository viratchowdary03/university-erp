import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the browser talks to /api on the same address, and Vite forwards it to the backend.
    // That is why the two programs behave like one site and no CORS setup is needed.
    proxy: { "/api": { target: process.env.VITE_PROXY_TARGET || "http://localhost:5000", changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries that change rarely go into their own files, so the browser can keep them cached
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) return "charts";
          if (id.includes("react-router")) return "router";
          if (id.includes("@reduxjs") || id.includes("react-redux") || id.includes("immer") || id.includes("reselect")) return "state";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) return "forms";
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "react";
          return undefined;
        },
      },
    },
  },
});
