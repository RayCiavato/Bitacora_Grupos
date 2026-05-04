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

const DOM_SELECTOR_XOR_KEY = 73;
const DOM_SELECTOR_DECODER = `const _0x5a=e=>new TextDecoder().decode(Uint8Array.from(e.match(/../g)||[],t=>parseInt(t,16)^${DOM_SELECTOR_XOR_KEY}));`;
const DOM_SELECTOR_METHODS = "getElementById|querySelectorAll|querySelector|closest|matches";
const DOM_SELECTOR_DOUBLE_QUOTED = new RegExp(
  `(\\??)\\.(${DOM_SELECTOR_METHODS})\\("([^"\\\\]*)"\\)`,
  "g"
);
const DOM_SELECTOR_SINGLE_QUOTED = new RegExp(
  `(\\??)\\.(${DOM_SELECTOR_METHODS})\\('([^'\\\\]*)'\\)`,
  "g"
);
const DOM_SELECTOR_METHOD_REFERENCE = new RegExp(`(\\??)\\.(${DOM_SELECTOR_METHODS})\\(`, "g");

function encodeDomToken(value) {
  return Array.from(Buffer.from(value, "utf8"), (byte) =>
    (byte ^ DOM_SELECTOR_XOR_KEY).toString(16).padStart(2, "0")
  ).join("");
}

function encodeDomSelectorLiterals(code) {
  let encoded = code;
  let replaced = false;
  const replacer = (match, optionalPrefix, method, literal) => {
    replaced = true;
    const accessPrefix = optionalPrefix === "?" ? "?." : "";
    return `${accessPrefix}[_0x5a("${encodeDomToken(method)}")](_0x5a("${encodeDomToken(literal)}"))`;
  };

  encoded = encoded.replace(DOM_SELECTOR_DOUBLE_QUOTED, replacer);
  encoded = encoded.replace(DOM_SELECTOR_SINGLE_QUOTED, replacer);
  encoded = encoded.replace(DOM_SELECTOR_METHOD_REFERENCE, (match, optionalPrefix, method) => {
    replaced = true;
    const accessPrefix = optionalPrefix === "?" ? "?." : "";
    return `${accessPrefix}[_0x5a("${encodeDomToken(method)}")](`;
  });

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

