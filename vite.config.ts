import { defineConfig } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const BACKUP_DIRECTORY = resolve(".codex-saves");

function persistentSaveBackup() {
  return {
    name: "persistent-save-backup",
    configureServer(server: { middlewares: { use: (handler: (request: any, response: any, next: () => void) => void) => void } }) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname !== "/__save-backup") return next();
        const slot = Number(url.searchParams.get("slot"));
        if (![1, 2, 3].includes(slot)) {
          response.statusCode = 400;
          response.end("Invalid slot");
          return;
        }
        const path = resolve(BACKUP_DIRECTORY, `latest-slot-${slot}.json`);
        if (request.method === "GET") {
          void readFile(path).then((data) => {
            response.setHeader("Content-Type", "application/json");
            response.end(data);
          }).catch(() => {
            response.statusCode = 404;
            response.end("No backup");
          });
          return;
        }
        if (request.method !== "POST") return next();
        let body = "";
        request.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        request.on("end", () => {
          try {
            const formatted = `${JSON.stringify(JSON.parse(body), null, 2)}\n`;
            void mkdir(BACKUP_DIRECTORY, { recursive: true })
              .then(() => writeFile(path, formatted))
              .then(() => { response.statusCode = 204; response.end(); })
              .catch(() => { response.statusCode = 500; response.end("Backup failed"); });
          } catch {
            response.statusCode = 400;
            response.end("Invalid save");
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [persistentSaveBackup()],
  server: {
    host: "127.0.0.1",
    port: 5176,
    strictPort: true,
  },
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
