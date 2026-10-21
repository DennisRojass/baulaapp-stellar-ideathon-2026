import test from "node:test";
import assert from "node:assert/strict";
import { Account, Keypair, Memo, Networks, Operation, Asset, TransactionBuilder } from "@stellar/stellar-sdk";
import { AMOUNT_XLM, CAMPAIGN_ID, checkDemoTransaction, makeDemoTransaction, parseDemoTransaction } from "../verify.mjs";

const sender = Keypair.random().publicKey();
const receiver = Keypair.random().publicKey();
const account = new Account(sender, "1");

test("acepta el pago exacto de la campaña en Testnet", () => {
  const tx = makeDemoTransaction(account, receiver);
  assert.equal(checkDemoTransaction(tx, receiver).ok, true);
  assert.equal(checkDemoTransaction(parseDemoTransaction(tx.toXDR()), receiver).ok, true);
});

test("rechaza destino, activo, monto o referencia erróneos", () => {
  const variations = [
    { destination: Keypair.random().publicKey(), asset: Asset.native(), amount: AMOUNT_XLM, memo: CAMPAIGN_ID },
    { destination: receiver, asset: new Asset("USD", Keypair.random().publicKey()), amount: AMOUNT_XLM, memo: CAMPAIGN_ID },
    { destination: receiver, asset: Asset.native(), amount: "2", memo: CAMPAIGN_ID },
    { destination: receiver, asset: Asset.native(), amount: AMOUNT_XLM, memo: "OTRA" },
  ];
  for (const item of variations) {
    const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.payment({ destination: item.destination, asset: item.asset, amount: item.amount }))
      .addMemo(Memo.text(item.memo)).setTimeout(60).build();
    assert.equal(checkDemoTransaction(tx, receiver).ok, false);
  }
});

