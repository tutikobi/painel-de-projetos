import { useEffect, useState } from "react";
import { api } from "../api/client.js";

// "checking" | "configured" | "not_configured" | "unknown"
// "unknown" (falha ao consultar) não bloqueia: o próprio pedido de sugestões
// ainda responde com o aviso se a chave faltar.
export function useAiStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let ignore = false;
    api.aiStatus().then(
      ({ configured }) => {
        if (!ignore) setStatus(configured ? "configured" : "not_configured");
      },
      () => {
        if (!ignore) setStatus("unknown");
      },
    );
    return () => {
      ignore = true;
    };
  }, []);

  return [status, setStatus];
}
