import { copyFile, writeFile } from "node:fs/promises";

// GitHub Pages serves this document for direct visits to client-side routes.
await copyFile("dist/index.html", "dist/404.html");
await writeFile("dist/.nojekyll", "");
