import { describe, expect, it } from "vitest";
import {
  hasBlankTitle,
  newEmptyItem,
  toConfirmPayload,
  toEditableItems,
} from "./suggestionItems.js";

describe("suggestionItems", () => {
  it("dá chaves únicas às sugestões sem alterar título e prazo", () => {
    const items = toEditableItems([
      { title: "Ler artigos", due_date: "2026-09-20" },
      { title: "Escrever", due_date: null },
    ]);

    expect(items.map(({ title, due_date }) => ({ title, due_date }))).toEqual([
      { title: "Ler artigos", due_date: "2026-09-20" },
      { title: "Escrever", due_date: null },
    ]);
    expect(new Set([...items, newEmptyItem()].map((i) => i.key)).size).toBe(3);
  });

  it("detecta título em branco", () => {
    expect(hasBlankTitle([{ title: "ok" }, { title: "   " }])).toBe(true);
    expect(hasBlankTitle([{ title: "ok" }])).toBe(false);
  });

  it("monta o payload da API sem a chave local", () => {
    const payload = toConfirmPayload([
      { key: 1, title: "  Revisar  ", due_date: "2026-09-30" },
      { key: 2, title: "Entregar", due_date: "" },
    ]);

    expect(payload).toEqual([
      { title: "Revisar", due_date: "2026-09-30" },
      { title: "Entregar", due_date: null },
    ]);
  });
});
