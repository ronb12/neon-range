import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

const headset = process.env.HEADSET === "1";

export default defineConfig({
  plugins: headset ? [basicSsl()] : [],
  server: {
    host: true,
    port: headset ? 43178 : 43177,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 43177,
    strictPort: true,
  },
});
