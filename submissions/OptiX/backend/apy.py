from enum import unique
import requests
from dotenv import load_dotenv
import os
from fetch import get_vault_data

load_dotenv()
X_API_KEY = os.getenv("X_API_KEY")
uniquePID = os.getenv("uniquePID")

url = "https://router.gluex.xyz/v1/price"

def calculate_cost_aware_effective_apy(payload):
    """
    Calculate the cost-aware effective APY for a given payload.
    """
    url = "https://router.gluex.xyz/v1/price"
    headers = {
        "x-api-key": X_API_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)
    try:
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise RuntimeError(f"Failed to fetch or parse response: {e}")

    effective_input_amount_USD = data.get("result", {}).get("effectiveInputAmountUSD")
    effective_output_amount = data.get("result", {}).get("effectiveOutputAmount")
    effective_output_amount_USD = data.get("result", {}).get("effectiveOutputAmountUSD")

    if not all([effective_input_amount_USD, effective_output_amount, effective_output_amount_USD]):
        raise RuntimeError("Missing required fields in price response")

    # Fetch vault data for the output receiver
    output_token, output_net_apy, output_daily_yield = get_vault_data(
        pool_address=payload["outputReceiver"],
        chain=payload["chainID"],
        input_amount=int(effective_output_amount)
    )

    # Calculate effective output daily yield
    effective_output_daily_yield = float(effective_output_amount_USD) * output_daily_yield / float(effective_input_amount_USD)

    # Calculate effective output APY
    effective_output_apy = ((1 + effective_output_daily_yield) ** 365 - 1) * 100

    return {
        "output_token": output_token,
        "output_net_apy": output_net_apy,
        "effective_output_apy": effective_output_apy
    }


# Example usage:
if __name__ == "__main__":
    payload = {
        "chainID": "hyperevm",
        "inputToken": "0xb88339cb7199b77e23db6e890353e22632ba630f",
        "outputToken": "0x111111a1a0667d36bd57c0a9f569b98057111111",
        "inputAmount": "100000000",
        "orderType": "BUY",
        "userAddress": "0xe25514992597786e07872e6c5517fe1906c0cadd",
        "outputReceiver": "0x9f75eac57d1c6f7248bd2aede58c95689f3827f7",
        "uniquePID": uniquePID
    }

    result = calculate_cost_aware_effective_apy(payload)
    print("Output Token:", result["output_token"])
    print("Output Net APY:", result["output_net_apy"])
    print("Effective Output APY:", result["effective_output_apy"])