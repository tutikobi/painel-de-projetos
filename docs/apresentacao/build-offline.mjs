// Gera apresentacao-completa.html: um único arquivo, com as imagens embutidas.
//
//   node docs/apresentacao/build-offline.mjs
//
// index.html usa caminhos relativos (img/...) e é o arquivo que se edita.
// A versão completa existe para quem baixa só o HTML, sem a pasta img/.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "index.html");
const target = join(here, "apresentacao-completa.html");

const html = readFileSync(source, "utf8");
let embedded = 0;

const completo = html.replace(/src="(img\/[^"]+\.png)"/g, (_, relative) => {
  const data = readFileSync(join(here, relative)).toString("base64");
  embedded += 1;
  return `src="data:image/png;base64,${data}"`;
});

if (embedded === 0) throw new Error("nenhuma imagem encontrada em index.html");

writeFileSync(target, completo, "utf8");
const mb = (Buffer.byteLength(completo) / 1024 / 1024).toFixed(1);
console.log(`apresentacao-completa.html gerado: ${embedded} imagens, ${mb} MB`);
