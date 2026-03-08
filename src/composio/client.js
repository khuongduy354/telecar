import { Composio } from "@composio/core";

let composioInstance = null;

export function getComposio() {
  if (!composioInstance) {
    composioInstance = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
  }
  return composioInstance;
}
