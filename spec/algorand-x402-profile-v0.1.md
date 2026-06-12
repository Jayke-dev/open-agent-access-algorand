# Algorand x402 Profile v0.1

This profile defines how Open Agent Access uses x402 for Algorand-first paid
access.

## Network

v0.1 targets Algorand TestNet first.

Accepted network identifiers:

- `testnet`
- `algorand:testnet`

MainNet support is planned after TestNet settlement fixtures and operator
guidance are stable.

## Scheme

The profile uses exact-payment semantics:

```text
scheme: exact
```

The implementation exports `ExactAvmScheme` for adapter metadata.

## Asset

USDC TestNet ASA is the default example asset. Policies should declare either:

- `assetId`
- `assetIdEnv: "USDC_TESTNET_ASA_ID"`

## Pay-To

Policies should not hard-code production wallets. For examples and deploys,
prefer:

```json
{
  "payToEnv": "AVM_ADDRESS"
}
```

## Facilitator

Local examples default to:

```text
https://facilitator.goplausible.xyz
```

Production deployments should document facilitator trust assumptions and should
prefer HTTPS outside local development.

## Binding Requirements

Payment prompts and receipts should bind:

- method
- URL
- policy hash
- rule ID
- trace ID

Sites should reject replayed payment proof metadata and should use idempotency
keys for paid fulfilment paths.

## Receipts

Settlement metadata written into receipts should include:

- payment type
- settlement network
- asset
- price
- facilitator URL
- transaction ID, if available
- payer, if available and PII-safe
- pay-to address, if available
- settlement success
