# Algorand x402

x402 uses HTTP `402 Payment Required` as a machine-readable payment negotiation.
The resource server returns payment requirements, the client signs and submits a
payment, and a facilitator verifies or settles the payment before access is
granted.

Roles:

- Client: the agent or SDK making the request.
- Resource server: the site/API enforcing policy.
- Facilitator: the x402 service that verifies and settles payment.

For local TestNet development, configure:

```sh
AVM_MNEMONIC=
AVM_ADDRESS=
FACILITATOR_URL=https://facilitator.goplausible.xyz
USDC_TESTNET_ASA_ID=
```

The adapter uses TestNet first, `ALGORAND_TESTNET_CAIP2`, `ExactAvmScheme`, USDC
TestNet ASA metadata, and hosted facilitator settings for development examples.
Self-hosted facilitator documentation is a planned extension.

Budget enforcement happens before payment. If price exceeds the declared budget,
or payment is not explicitly enabled, the client refuses to pay and writes a
receipt.

Settlement receipts include payment type, settlement network, asset, price,
facilitator URL, pay-to address where known, transaction ID when available, and
settlement success.

The package also exports deterministic fixtures for tests:

- `createAlgorandX402PaymentRequiredFixture()`
- `createAlgorandX402SettlementFixture()`
- `createMalformedAlgorandX402SettlementFixture()`

Never commit mnemonics, private keys, or seed phrases. For production, use wallet
integration, KMS, smart-wallet delegation, Liquid Auth, or another secure signing
flow. Mnemonic env loading is for local TestNet development only.
