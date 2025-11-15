import requests
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()
X_API_KEY = os.getenv("X_API_KEY")
if not X_API_KEY:
    raise RuntimeError("Missing X_API_KEY in environment variables")



def get_vault_data(pool_address, chain, input_amount):
    """
    Fetch the input token, net APY, and daily APY for a given pool and amount.
    """
    url = "https://yield-api.gluex.xyz/diluted-apy"
    payload = {
        "pool_address": pool_address,
        "chain": chain,
        "input_amount": input_amount
    }
    headers = {"Content-Type": "application/json", 'x-api-key': X_API_KEY}

    response = requests.post(url, json=payload, headers=headers)
    try:
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise RuntimeError(f"Failed to fetch or parse response: {e}")

    yield_block = data.get("diluted_yield") or data.get("diluted_apy")
    input_token = yield_block.get("input_token")
    
    if not isinstance(yield_block, dict):
        raise RuntimeError("Response missing 'diluted_yield' (or 'diluted_apy') object")

    apy_block = yield_block.get("apy") if isinstance(yield_block.get("apy"), dict) else yield_block

    net_apy = apy_block.get("net_apy")
    if net_apy is None:
        net_apy = apy_block.get("apy")

    if net_apy is None:
        raise RuntimeError("Neither 'net_apy' nor 'apy' found in response")

    net_apy = float(net_apy)
    daily_yield = (1 + net_apy / 100) ** (1 / 365) - 1

    return input_token, net_apy, daily_yield


def get_tvl(pool_address, chain):
    """
    Fetch the TVL for a given pool.
    """
    url = "https://yield-api.gluex.xyz/tvl"
    payload = {
        "pool_address": pool_address,
        "chain": chain
    }
    headers = {"Content-Type": "application/json", 'x-api-key': X_API_KEY}

    response = requests.post(url, json=payload, headers=headers)
    try:
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise RuntimeError(f"Failed to fetch or parse response: {e}")

    tvl = data.get("tvl", {}).get("tvl_usd")
    if tvl is None:
        raise RuntimeError("TVL data not found in response")
    return float(tvl)


