import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const targets = [
  {
    input: path.join(projectRoot, "src", "public", "app.js"),
    output: path.join(projectRoot, "src", "public", "assets", "app.min.js"),
    encodeDomSelectors: true
  },
  {
    input: path.join(projectRoot, "src", "public", "tasks.js"),
    output: path.join(projectRoot, "src", "public", "assets", "tasks.min.js"),
    encodeDomSelectors: true
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

const DOM_SELECTOR_DECODER = "const __bitacoraDom=e=>atob(e);";
const DOM_SELECTOR_METHODS = "getElementById|querySelectorAll|querySelector|closest|matches";
const DOM_SELECTOR_DOUBLE_QUOTED = new RegExp(
  `\\b(${DOM_SELECTOR_METHODS})\\("([^"\\\\]*)"\\)`,
  "g"
);
const DOM_SELECTOR_SINGLE_QUOTED = new RegExp(
  `\\b(${DOM_SELECTOR_METHODS})\\('([^'\\\\]*)'\\)`,
  "g"
);

function encodeBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function encodeDomSelectorLiterals(code) {
  let encoded = code;
  let replaced = false;
  const replacer = (match, method, literal) => {
    replaced = true;
    return `${method}(__bitacoraDom("${encodeBase64(literal)}"))`;
  };

  encoded = encoded.replace(DOM_SELECTOR_DOUBLE_QUOTED, replacer);
  encoded = encoded.replace(DOM_SELECTOR_SINGLE_QUOTED, replacer);

  return replaced ? `${DOM_SELECTOR_DECODER}${encoded}` : code;
}

async function buildTarget(target) {
  const source = await readFile(target.input, "utf8");
  const result = await minify(source, minifyOptions);
  if (!result.code) {
    throw new Error(`No se pudo minificar ${path.basename(target.input)}`);
  }
  const outputCode = target.encodeDomSelectors ? encodeDomSelectorLiterals(result.code) : result.code;
  await mkdir(path.dirname(target.output), { recursive: true });
  await writeFile(target.output, outputCode, "utf8");
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

