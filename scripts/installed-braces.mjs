import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";

export function installedBraces(root) {
  const found = new Set();
  const visited = new Set();

  function packages(directory) {
    if (!existsSync(directory)) return;
    directory = realpathSync(directory);
    if (visited.has(directory)) return;
    visited.add(directory);

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.name === ".bun") {
        for (const stored of readdirSync(path)) packages(join(path, stored, "node_modules"));
      } else if (entry.name.startsWith("@")) {
        packages(path);
      } else if (!entry.name.startsWith(".") && (entry.isDirectory() || entry.isSymbolicLink())) {
        const packageRoot = realpathSync(path);
        const manifest = join(packageRoot, "package.json");
        if (
          existsSync(manifest) &&
          (entry.name === "braces" || JSON.parse(readFileSync(manifest, "utf8")).name === "braces")
        )
          found.add(packageRoot);
        packages(join(packageRoot, "node_modules"));
      }
    }
  }

  packages(join(root, "node_modules"));
  return [...found].sort();
}
