"""Constants for blocked keywords and other static configuration."""

# Keywords that indicate a company operates in financial services.
# Update or append to this list to extend blocking behaviour.
BLOCKED_COMPANY_KEYWORDS = [
    # Banking & Fintech
    "fintech", "finance", "financing", "financial", "bank", "banking", "banks",
    "neobank", "digital bank", "open bank", "commercial bank", "retail bank",
    "microfinance", "micro finance", "nbfc", "non-banking", "mfi",
    # Insurance
    "insurance", "insure", "insurer", "assurance", "reinsurance",
    "life insurance", "health insurance", "general insurance",
    # Investment & Trading
    "investment", "invest", "investor", "capital", "venture capital", "vc fund",
    "private equity", "securities", "trading", "trader", "stock broker", "stockbroker",
    "stock market", "share market", "nse", "bse", "forex", "commodity", "derivatives",
    "equity", "hedge fund", "mutual fund", "asset management", "amc",
    # Credit & Lending
    "credit", "loan", "lending", "lender", "mortgage", "home loan",
    "personal loan", "business loan", "creditor", "bnpl", "buy now pay later",
    "gold loan", "chit fund", "pawn",
    # Payments & Wallets
    "payment", "payments", "pay", "upi", "wallet", "e-wallet", "digital wallet",
    "payment gateway", "payment processor", "merchant services", "remittance",
    "money transfer", "pos", "point of sale",
    # Crypto & Blockchain Finance
    "crypto", "cryptocurrency", "bitcoin", "defi", "crypto exchange",
    "crypto wallet", "digital currency", "blockchain finance",
    # Wealth Management & Advisory
    "wealth", "wealth management", "portfolio", "fund management", "treasury",
    "financial advisor", "financial planning",
    # Accounting & Taxation
    "accounting", "accounting software", "bookkeeping", "payroll",
    "tax", "tax software", "tax filing", "audit firm", "chartered accountant",
    # Institutions & Other Services
    "credit union", "financial institution", "financial services",
    "acquirer", "issuer", "leasing", "factoring", "monetary", "fiscal"
]

# Keywords that indicate an opportunity type is related to finance.
BLOCKED_OPPORTUNITY_KEYWORDS = [
    "finance", "financial", "bank", "banking", "fintech", "investment",
    "investor", "trading", "trader", "stock", "forex", "equity", "hedge",
    "mutual fund", "wealth", "loan", "credit", "mortgage", "insurance",
    "actuarial", "underwriting", "tax", "accounting", "audit", "portfolio",
    "treasury", "fund management", "private equity", "venture capital",
    "asset management", "payment", "wallet", "digital currency", "crypto",
    "defi", "broker", "brokerage"
]
