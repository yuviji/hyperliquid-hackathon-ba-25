
import os
from dotenv import load_dotenv
import requests
load_dotenv()
X_API_KEY = os.getenv("X_API_KEY")

url = "https://router.gluex.xyz/v1/quote"


headers = {
    "x-api-key": X_API_KEY,
    "Content-Type": "application/json"
}

def run_quote(payload):
    response_json = requests.post(url, json=payload, headers=headers).json()
    result = response_json.get("result", {})
    effectiveOutputAmount = result.get("effectiveOutputAmount")
    calldata = result.get("calldata")
    router = result.get("router") or response_json.get("router")  # try both levels
    return {
        "effectiveOutputAmount": effectiveOutputAmount,
        "calldata": calldata,
        "router": router
    }