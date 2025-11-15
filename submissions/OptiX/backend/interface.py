from operator import call
from typing import List
from fetch import get_tvl, get_input_token, get_vault_data
from apy import calculate_cost_aware_effective_apy
from quote import run_quote
from dotenv import load_dotenv
from rank import choose_position
import os


load_dotenv()
uniquePID = os.getenv("uniquePID")

class User:
    def __init__(self, 
                token_holdings:int = 0, 
                chainID:str = "hyperevm", 
                userAddress:str = ""):
        self.token_holdings = token_holdings
        self.chainID = chainID
        self.userAddress = userAddress

    def new_deposit(self, amount: float):
        self.token_holdings += amount

    def set_of_vaults(self, vault_addresses: List[str]):
        self.vaults = vault_addresses

    def get_currect_token(self) -> int:
        # return the current token and its net apy
        input_token, net_apy, _ = get_vault_data(self.userAddress, self.chainID, self.token_holdings)
        return input_token, net_apy
    
    def reallocate(self):
        # for each vault, get the corresponding input_token
        current_token, current_net_apy = self.get_currect_token()
        options = []
        for vault in self.vaults:
            input_token = get_input_token(vault, self.chainID)
            tvl = get_tvl(vault, self.chainID)

            payload = {
                "chainID": self.chainID,
                "inputToken": current_token,
                "outputToken": vault,
                "inputAmount": self.token_holdings,
                "orderType": "BUY",
                "userAddress": self.userAddress,
                "outputReceiver": vault,
                "uniquePID": uniquePID
            }
            # calculate cost-aware effective APY
            apy_data = calculate_cost_aware_effective_apy(payload)
            options.append({
                "pool_address": vault,
                "chain": self.chainID,
                "apy": apy_data["cae_apy"],
                "tvl": tvl,
                "input_token": input_token,
                "output_token": apy_data["output_token"],
            })

            # rank vaults and choose the best one
        best_option = choose_position(current_net_apy, options)
        if best_option:
            # run quote
            calldata = self.commit_trade(current_token, best_option)
            return calldata
        return None
    
    def commit_trade(self, input_token, best_option):
        # commit the trade to gluex router
        payload = {
            "chainID": self.chainID,
            "inputToken": input_token,
            "outputToken": best_option["output_token"],
            "inputAmount": self.token_holdings,
            "orderType": "BUY",
            "userAddress": self.userAddress,
            "outputReceiver": best_option["pool_address"],
            "uniquePID": uniquePID
        }
        # run quote
        quote_response = run_quote(payload)
        effectiveOutputAmount = quote_response["effectiveOutputAmount"]
        self.token_holdings = effectiveOutputAmount
        self.userAddress = best_option["pool_address"]
        calldata = quote_response["calldata"]
        return calldata