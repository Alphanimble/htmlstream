import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { loadProjectEnv, openRouterChatPlugin } from "./server/openrouter-chat";
import { sessionLogPlugin } from "./server/session-log";

const demoRoot = path.resolve(__dirname);
/** Project root `.env` (one level up from demo/) */
const envRoot = path.resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  const env = loadProjectEnv(envRoot, loadEnv(mode, envRoot, ""));

  return {
    root: demoRoot,
    envDir: envRoot,
    plugins: [react(), openRouterChatPlugin(env), sessionLogPlugin()],
    resolve: {
      alias: {
        streamhtml: path.resolve(__dirname, "../src/index.ts"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(demoRoot, "index.html"),
          chat: path.resolve(demoRoot, "chat/index.html"),
        },
      },
    },
  };
});
