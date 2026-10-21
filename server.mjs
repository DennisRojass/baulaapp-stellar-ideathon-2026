import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { rpc, Networks } from "@stellar/stellar-sdk";
import { createServer as createViteServer } from "vite";
import { AMOUNT_XLM, CAMPAIGN_ID, checkDemoTransaction, configuredReceiver, makeDemoTransaction, parseDemoTransaction } from "./verify.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const receiver = configuredReceiver(process.env.BAULA_TESTNET_RECEIVER);
const stellar = new rpc.Server("https://soroban-testnet.stellar.org");
const port = Number(process.env.PORT || 4173);
const production = process.env.NODE_ENV === "production";
const vite = production ? null : await createViteServer({ root, server: { middlewareMode: true }, appType: "spa" });

function json(response, status, data) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(data));
}

async function body(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 20000) throw new Error("Solicitud demasiado grande");
  }
  return JSON.parse(raw || "{}");
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/config" && request.method === "GET") {
    return json(response, 200, { network: "TESTNET", campaign: CAMPAIGN_ID, amount: AMOUNT_XLM, receiver });
  }
  if (!receiver) return json(response, 503, { error: "Configura BAULA_TESTNET_RECEIVER con una dirección pública Testnet" });

  if (url.pathname === "/api/prepare" && request.method === "POST") {
    const input = await body(request);
    if (typeof input.address !== "string" || !configuredReceiver(input.address)) return json(response, 400, { error: "Dirección pública inválida" });
    const account = await stellar.getAccount(input.address);
    const transaction = makeDemoTransaction(account, receiver);
    return json(response, 200, { xdr: transaction.toXDR(), networkPassphrase: Networks.TESTNET });
  }

  if (url.pathname === "/api/submit" && request.method === "POST") {
    const input = await body(request);
    if (typeof input.xdr !== "string") return json(response, 400, { error: "Falta la transacción firmada" });
    const transaction = parseDemoTransaction(input.xdr);
    const validation = checkDemoTransaction(transaction, receiver);
    if (!validation.ok) return json(response, 400, { error: validation.reason });
    const result = await stellar.sendTransaction(transaction);
    return json(response, 200, { hash: result.hash, status: result.status });
  }

  if (url.pathname === "/api/verify" && request.method === "GET") {
    const hash = url.searchParams.get("hash") || "";
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) return json(response, 400, { error: "Hash inválido" });
    const result = await stellar.getTransaction(hash);
    if (result.status === "NOT_FOUND") return json(response, 200, { status: "PENDING", hash, message: "Aún no aparece confirmada; vuelve a consultar" });
    if (result.status !== "SUCCESS") return json(response, 200, { status: "FAILED", hash, message: "La red no confirmó el pago" });
    const transaction = parseDemoTransaction(result.envelopeXdr.toXDR("base64"));
    const validation = checkDemoTransaction(transaction, receiver);
    return json(response, 200, {
      status: validation.ok ? "CONFIRMED" : "MISMATCH",
      hash,
      ledger: result.ledger,
      source: transaction.source,
      destination: transaction.operations[0]?.type === "payment" ? transaction.operations[0].destination : null,
      amount: transaction.operations[0]?.type === "payment" ? transaction.operations[0].amount : null,
      asset: transaction.operations[0]?.type === "payment" && transaction.operations[0].asset.isNative() ? "XLM" : "otro",
      campaign: CAMPAIGN_ID,
      message: validation.reason,
    });
  }
  return json(response, 404, { error: "Ruta no encontrada" });
}

const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(request, response, url);
    if (vite) return vite.middlewares(request, response, () => json(response, 404, { error: "No encontrado" }));
    const asset = resolve(join(root, "dist", url.pathname === "/" ? "index.html" : url.pathname));
    const base = resolve(join(root, "dist"));
    if (!(asset === base || asset.startsWith(base + sep)) || !existsSync(asset)) return json(response, 404, { error: "No encontrado" });
    response.writeHead(200, { "content-type": mime[extname(asset)] || "application/octet-stream" });
    response.end(await readFile(asset));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    json(response, 500, { error: message });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Baulaapp Testnet: http://127.0.0.1:${port}`));

