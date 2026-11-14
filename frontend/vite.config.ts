import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 开发环境把 /api 转发到本地 FastAPI，避免跨域
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
