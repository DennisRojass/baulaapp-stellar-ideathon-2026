import { getAddress, getNetworkDetails, isConnected, setAllowed, signTransaction } from "@stellar/freighter-api";
import "./style.css";

type Config = { network: string; campaign: string; amount: string; receiver: string | null };
type Verification = { status: string; hash: string; ledger?: number; source?: string; destination?: string; amount?: string; asset?: string; message: string };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const connectButton = $<HTMLButtonElement>("connect");
const sendButton = $<HTMLButtonElement>("send");
const verifyButton = $<HTMLButtonElement>("verify");
const hashInput = $<HTMLInputElement>("hash");
let config: Config | null = null;
let address: string | null = null;

function status(message: string) { $("result").textContent = message; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  return data as T;
}

function showReceipt(result: Verification) {
  const receipt = $("receipt");
  receipt.hidden = false;
  receipt.replaceChildren();
  const fields = [
    ["Estado", result.status], ["Hash", result.hash], ["Ledger", String(result.ledger ?? "—")],
    ["Origen", result.source ?? "—"], ["Destino", result.destination ?? "—"],
    ["Importe", result.amount ? `${result.amount} ${result.asset}` : "—"],
  ];
  for (const [label, value] of fields) {
    const row = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    row.append(strong, document.createTextNode(value));
    receipt.append(row);
  }
  if (result.status === "CONFIRMED") {
    const link = document.createElement("a");
    link.href = `https://stellar.expert/explorer/testnet/tx/${result.hash}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Abrir transacción en el explorador ↗";
    receipt.append(link);
  }
}

async function verify(hash: string) {
  status("Consultando la red Testnet…");
  const result = await api<Verification>(`/api/verify?hash=${encodeURIComponent(hash)}`);
  status(result.message);
  showReceipt(result);
}

connectButton.addEventListener("click", async () => {
  try {
    const connected = await isConnected();
    if (connected.error || !connected.isConnected) throw new Error("Instala o habilita Freighter para continuar");
    const allowed = await setAllowed();
    if (allowed.error || !allowed.isAllowed) throw new Error("Acceso a Freighter rechazado");
    const network = await getNetworkDetails();
    if (network.error || network.networkPassphrase !== "Test SDF Network ; September 2015") throw new Error("Cambia Freighter a Stellar Testnet");
    const wallet = await getAddress();
    if (wallet.error || !wallet.address) throw new Error("No se obtuvo la dirección de Freighter");
    address = wallet.address;
    $("address").textContent = address;
    sendButton.disabled = !config?.receiver;
    status("Wallet Testnet conectada. Puedes firmar el aporte ficticio.");
  } catch (error) { status(errorMessage(error)); }
});

sendButton.addEventListener("click", async () => {
  if (!address) return;
  sendButton.disabled = true;
  try {
    const network = await getNetworkDetails();
    if (network.error || network.networkPassphrase !== "Test SDF Network ; September 2015") throw new Error("La wallet ya no está en Testnet");
    status("Preparando transacción…");
    const prepared = await api<{ xdr: string; networkPassphrase: string }>("/api/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address }) });
    status("Esperando firma en Freighter…");
    const signed = await signTransaction(prepared.xdr, { networkPassphrase: prepared.networkPassphrase, address });
    if (signed.error || !signed.signedTxXdr) throw new Error("Firma rechazada o cancelada");
    status("Enviando a Stellar Testnet…");
    const sent = await api<{ hash: string; status: string }>("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ xdr: signed.signedTxXdr }) });
    hashInput.value = sent.hash;
    status("Enviada; esperando confirmación de la red…");
    await verify(sent.hash);
  } catch (error) { status(errorMessage(error)); }
  finally { sendButton.disabled = !config?.receiver; }
});

verifyButton.addEventListener("click", async () => {
  try { await verify(hashInput.value.trim()); }
  catch (error) { status(errorMessage(error)); }
});

async function init() {
  try {
    config = await api<Config>("/api/config");
    $("config").textContent = config.receiver ? `Destino Testnet: ${config.receiver}` : "Falta configurar la cuenta receptora pública Testnet.";
  } catch (error) { $("config").textContent = errorMessage(error); }
}
void init();

