// Itens editáveis da revisão de sugestões (spec H4). Cada item ganha uma
// chave local estável para o React, que não vai para a API.

let lastKey = 0;
const nextKey = () => ++lastKey;

export function toEditableItems(suggestions) {
  return suggestions.map((suggestion) => ({
    key: nextKey(),
    title: suggestion.title,
    due_date: suggestion.due_date,
  }));
}

export function newEmptyItem() {
  return { key: nextKey(), title: "", due_date: null };
}

export function hasBlankTitle(items) {
  return items.some((item) => !item.title.trim());
}

export function toConfirmPayload(items) {
  return items.map((item) => ({
    title: item.title.trim(),
    due_date: item.due_date || null,
  }));
}
