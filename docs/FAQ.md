# FAQ

## Is this a crawler?

No. It is a policy, access, payment, and receipt layer.

## Does it bypass paywalls or robots.txt?

No. The protocol is designed to respect resource owner policy and make payment
or denial explicit.

## Is Algorand required?

Algorand x402 is first-class in this repo, but the core protocol is modular.

## Are payments enabled by default?

No. The CLI never pays unless `--pay` or `OAA_PAYMENTS_ENABLED=true` is set and
the declared budget allows the price.
