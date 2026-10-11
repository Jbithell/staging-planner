import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Commit the build came from, shown in the footer so a stale cached page is easy to spot.
function commitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

// Relative asset paths so the build works under the GitHub Pages /<repo>/ path.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __COMMIT__: JSON.stringify(commitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
