We have three major entities in our billing system:

1. Payments
2. Wallets
3. Invoices

And they are supposed to be related to each other in multiple ways or there are multiple workflows that involve dealing with these entities.

1. Invoices
    - They can be created once a subscription is created.
    - They can be created once the subscription current period is moved to the next period. ex month 1 to month 2.
    - They can be created manually as a one off invoice against the customer.
    - They can be created when you top up the wallet of the customer. (there are also free credits that are added to the wallet but they do not create an invoice)

2. Wallets
    - Wallets are made up of wallet transactions (ledger entries) and they have a credits balance.
    - Each wallet transaction has a type (credit, debit, free credit, paid credit) and a credits balance.
    - The wallet transaction can be related to a reference entity (invoice, external reference, payment, or nothing for ex free credits)

3. Payments
    - Payments simply represent a transaction from the customer to the company and they are always related to an invoice for now (destination type is invoice only for now)
    - Each payment transaction needs to have a type either purchase (debit from customer) or refund (credit to customer)
    - We support multiple payment methods (cash, card, bank transfer, etc) and we need to support multiple currencies (USD, EUR, etc)
    - We also support payments powered by external payment processors (stripe, paypal, etc) 


Relationships between the entities:
    - Wallet - Invoice relationship scenarios
        - Invoice created to top up the wallet of the customer i.e purchase of credits
        - Invoice created against a subscription and the credits are being used to pay for the subscription
        - Invoice created against a subscription and the credits are being used as loyalty credits ie as a discount
        - One off Invoice created manually by the admin and use credits to pay for it
    - Wallet - Payment relationship scenarios
        - Payment created to top up the wallet of the customer i.e purchase of credits without an invoice (maybe)
        - credits used to pay for an invoice as a discount (free credits)
        - credits used to pay for a one off invoice as a payment method (paid credits)
        - credits used to pay for a few line items in an invoice (paid credits) ex usage based line items
    - Payment - Invoice relationship scenarios
        - Payment created to pay for an invoice
        - Payment created to pay for a one off invoice created manually by the admin
        - Payment created to pay for a few line items in an invoice (paid credits) ex usage based line items

Common desired workflows / scenarios by current set of customers:
1. A leading auth provider
    1. Usage to be charged prepaid vs postpaid ex prepaid to be debited from the wallet immediately and postpaid to be raised as an invoice
    2. Credits can be both purchased (come with an invoice) or  used as loyalty/free credits (no invoice)
    3. Credits can be used to pay for an invoice as a discount (free credits) or as a payment method (paid credits) and these credit payments can be partial also
    