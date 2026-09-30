// Gera as duas apresentações em arquivo único, com as imagens embutidas:
//
//   node docs/apresentacao/build-offline.mjs
//
//   apresentacao-completa.html  todos os slides
//   apresentacao-curta.html     só os slides marcados com data-short
//
// index.html é o arquivo que se edita: usa caminhos relativos (img/...),
// marca com `data-short` os slides da versão curta e com
// `data-only="curta"` ou `data-only="completa"` o que existe em uma só delas.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// \r\n vira \n: no Windows o arquivo pode estar com CRLF, e a divisão em
// slides compara trechos com quebras de linha.
const html = readFileSync(join(here, "index.html"), "utf8").replace(/\r\n/g, "\n");

const ABERTURA = '<section class="slide';
const FECHAMENTO = "\n    </section>\n";

function slides(documento) {
  // Divide o documento em cabeçalho, slides e rodapé, sem depender de um parser.
  const inicio = documento.indexOf(ABERTURA);
  const cabecalho = documento.slice(0, inicio);
  const partes = [];
  let resto = documento.slice(inicio);
  while (resto.startsWith(ABERTURA)) {
    const fim = resto.indexOf(FECHAMENTO) + FECHAMENTO.length;
    partes.push("    " + resto.slice(0, fim));
    // pula espaços em branco e o comentário que numera o próximo slide
    resto = resto.slice(fim).replace(/^\s*(?:<!--[^>]*-->\s*)?/, "");
  }
  return { cabecalho, partes, rodape: "\n" + resto };
}

function montar(versao) {
  const outra = versao === "curta" ? "completa" : "curta";
  const { cabecalho, partes, rodape } = slides(html);
  const escolhidos = partes.filter((slide) => {
    const abertura = slide.slice(0, slide.indexOf(">") + 1);
    if (abertura.includes(`data-only="${outra}"`)) return false;
    return versao === "completa" || abertura.includes("data-short");
  });
  const corpo = escolhidos
    .map((slide) =>
      slide
        .split("\n")
        .filter((linha) => !linha.includes(`data-only="${outra}"`))
        .join("\n"),
    )
    .join("\n");
  return cabecalho + corpo + rodape;
}

for (const versao of ["completa", "curta"]) {
  let documento = montar(versao);
  let imagens = 0;
  documento = documento.replace(/src="(img\/[^"]+\.png)"/g, (_, caminho) => {
    imagens += 1;
    return `src="data:image/png;base64,${readFileSync(join(here, caminho)).toString("base64")}"`;
  });
  if (imagens === 0) throw new Error(`nenhuma imagem embutida na versão ${versao}`);

  const arquivo = `apresentacao-${versao}.html`;
  writeFileSync(join(here, arquivo), documento, "utf8");
  const total = (documento.match(/<section class="slide/g) || []).length;
  const mb = (Buffer.byteLength(documento) / 1024 / 1024).toFixed(1);
  console.log(`${arquivo}: ${total} slides, ${imagens} imagens, ${mb} MB`);
}
