import { Asset, Memo, Networks, Operation, TransactionBuilder, StrKey } from "@stellar/stellar-sdk";

export const CAMPAIGN_ID = "BAULA-DEMO";
export const AMOUNT_XLM = "1.0000000";

export function configuredReceiver(value) {
  return typeof value === "string" && StrKey.isValidEd25519PublicKey(value) ? value : null;
}

export function makeDemoTransaction(account, receiver) {
  return new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({ destination: receiver, asset: Asset.native(), amount: AMOUNT_XLM }))
    .addMemo(Memo.text(CAMPAIGN_ID))
    .setTimeout(60)
    .build();
}

export function checkDemoTransaction(transaction, receiver) {
  if (!receiver) return { ok: false, reason: "Cuenta receptora Testnet sin configurar" };
  if (transaction.operations.length !== 1) return { ok: false, reason: "La transacción debe tener un solo pago" };
  const operation = transaction.operations[0];
  if (operation.type !== "payment") return { ok: false, reason: "La operación no es un pago" };
  if (operation.destination !== receiver) return { ok: false, reason: "Destinatario incorrecto" };
  if (!operation.asset.isNative()) return { ok: false, reason: "El activo no es XLM" };
  if (operation.amount !== AMOUNT_XLM) return { ok: false, reason: "Importe incorrecto" };
  if (transaction.memo.type !== "text" || Buffer.from(transaction.memo.value).toString("utf8") !== CAMPAIGN_ID) {
    return { ok: false, reason: "Referencia de campaña incorrecta" };
  }
  return { ok: true, reason: "Pago XLM de ejemplo válido" };
}

export function parseDemoTransaction(xdr) {
  return TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
}

