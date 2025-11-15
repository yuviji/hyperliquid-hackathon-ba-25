# config.py

# === API keys (set via environment variables for security) ===
import os

GLUEX_API_KEY = os.getenv("GLUEX_API_KEY")

# === Vault whitelist ===
WHITELISTED_VAULTS = [
    "0xe25514992597786e07872e6c5517fe1906c0cadd",
    "0xcdc3975df9d1cf054f44ed238edfb708880292ea",
    "0x8f9291606862eef771a97e5b71e4b98fd1fa216a",
    "0x9f75eac57d1c6f7248bd2aede58c95689f3827f7",
    "0x63cf7ee583d9954febf649ad1c40c97a6493b1be",
]

# === Strategy parameters ===
# Yield difference threshold (e.g., 0.50 means 0.50% better to switch)
THRESHOLD_YIELD_DIFFERENCE = 0.50  
# Time between scans in seconds (e.g., every hour)
SCAN_INTERVAL_SECONDS = 3600  

# === On-chain config ===
NETWORK = os.getenv("NETWORK", "goerli")  # or mainnet/hyperevm etc.
VAULT_CONTRACT_ADDRESS = os.getenv("VAULT_CONTRACT_ADDRESS", "<YOUR_VAULT_ADDRESS>")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "<YOUR_PRIVATE_KEY>")  # for transaction signing
RPC_ENDPOINT = os.getenv("RPC_ENDPOINT", "<YOUR_RPC_ENDPOINT>")

# Token (assuming single stablecoin for simplicity)
TOKEN_ADDRESS = os.getenv("TOKEN_ADDRESS", "<TOKEN_ADDRESS_USDC_USDT>")