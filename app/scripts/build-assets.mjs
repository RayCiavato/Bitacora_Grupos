import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const targets = [
  {
    input: path.join(projectRoot, "src", "public", "tasks.js"),
    output: path.join(projectRoot, "src", "public", "assets", "tasks.min.js")
  },
  {
    input: path.join(projectRoot, "src", "public", "security.js"),
    output: path.join(projectRoot, "src", "public", "assets", "security.min.js")
  },
  {
    input: path.join(projectRoot, "src", "public", "report-view.js"),
    output: path.join(projectRoot, "src", "public", "assets", "report-view.min.js")
  }
];

const minifyOptions = {
  compress: {
    passes: 2,
    drop_console: true,
    drop_debugger: true
  },
  mangle: {
    toplevel: true
  },
  format: {
    comments: false
  }
};

async function buildTarget(target) {
  const source = await readFile(target.input, "utf8");
  const result = await minify(source, minifyOptions);
  if (!result.code) {
    throw new Error(`No se pudo minificar ${path.basename(target.input)}`);
  }
  await mkdir(path.dirname(target.output), { recursive: true });
  await writeFile(target.output, `${result.code}\n`, "utf8");
}

async function main() {
  for (const target of targets) {
    await buildTarget(target);
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
