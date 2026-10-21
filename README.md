# Baulaapp · aporte trazable en Stellar Testnet

Prototipo educativo para la Pura Vida Ideathon 2026. Una experiencia turística **ficticia** contextualiza un aporte voluntario de **1 XLM de prueba**. La aplicación construye la transacción, Freighter la firma y el servidor verifica el resultado en Stellar Testnet. No hay reservas, cobros reales, emisión de tokens ni prueba automática de impacto ambiental.

## Requisitos

- Node.js 22 o posterior y pnpm.
- [Freighter](https://www.freighter.app/) instalada, configurada en **Testnet** y con XLM de prueba.
- Una cuenta pública Testnet receptora bajo control del equipo. Nunca copies ni publiques su clave secreta. [Stellar Lab](https://lab.stellar.org/) permite practicar cuentas; Friendbot financia cuentas Testnet.

## Ejecutar

1. Copia `.env.example` a `.env.local` y sustituye `BAULA_TESTNET_RECEIVER` por la dirección **pública** `G...` de la cuenta receptora.
2. Ejecuta `pnpm install --frozen-lockfile` y `pnpm dev`.
3. Abre `http://127.0.0.1:4173`, conecta Freighter en Testnet, firma el pago y verifica el hash.

Para compilar: `pnpm typecheck`, `pnpm test`, `pnpm build`. Para ejecutar la compilación: `NODE_ENV=production node server.mjs` con `BAULA_TESTNET_RECEIVER` configurada en el entorno. En PowerShell: `$env:NODE_ENV='production'; $env:BAULA_TESTNET_RECEIVER='G...'; node server.mjs`.

## Qué verifica

`POST /api/prepare` crea una única operación de pago por 1 XLM con memo `BAULA-DEMO`. `POST /api/submit` acepta únicamente una transacción firmada que conserve destinatario, XLM, importe y memo. `GET /api/verify?hash=...` consulta Stellar RPC Testnet y solo responde `CONFIRMED` si la red informa `SUCCESS` y la transacción cumple las condiciones. `NOT_FOUND` se presenta como pendiente; una transacción fallida o distinta no acredita el aporte.

La firma y el envío no prueban recepción. La comprobación de pago tampoco acredita ejecución o resultados de un proyecto ambiental. Esas evidencias se documentarían y revisarían fuera de la cadena. No escribas nombres, correos ni documentos personales en memos.

## Demo y entrega

1. Enseña la experiencia ficticia y el destino público configurado.
2. Conecta Freighter Testnet y firma 1 XLM de prueba.
3. Muestra el hash y el estado confirmado, o consulta uno ya generado.
4. Abre el explorador Testnet y explica exactamente qué verifica la red.
5. Explica las validaciones pendientes: entrevistas, turismo real, custodia, evidencia ambiental y economía del producto.

Antes de compartir este código como entrega del evento, verifica las reglas exactas de APEX sobre trabajo previo y atribuye a cada integrante sus commits reales. Esta carpeta contiene trabajo preparatorio del 21 de octubre de 2026.

## Referencias

- [Transacciones Stellar](https://developers.stellar.org/docs/build/guides/transactions)
- [RPC](https://developers.stellar.org/docs/data/apis/rpc)
- [Freighter](https://developers.stellar.org/docs/build/guides/freighter)

