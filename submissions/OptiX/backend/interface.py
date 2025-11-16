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
        print(f"[DEBUG] User.reallocate: current_token={current_token}, current_net_apy={current_net_apy}")
        options = []
        for vault in self.vaults:
            if vault == self.userAddress:
                continue
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
        if len(options) == 0:
            return None
        # rank vaults and choose the best one
        best_option = choose_position(current_net_apy, options)
        # print(f"[DEBUG] User.reallocate: best_option={best_option}, current_net_apy={current_net_apy}")
        if best_option:
            # run quote
            calldata = self.commit_trade(current_token, best_option)
            return best_option, calldata
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
    

if __name__ == "__main__":
    # Example usage
    user = User(token_holdings=100000000, chainID="hyperevm", userAddress="0xcdc3975df9d1cf054f44ed238edfb708880292ea")
    user.set_of_vaults(["0x8f9291606862eef771a97e5b71e4b98fd1fa216a", "0xe25514992597786e07872e6c5517fe1906c0cadd", "0x9f75eac57d1c6f7248bd2aede58c95689f3827f7", "0x63cf7ee583d9954febf649ad1c40c97a6493b1be"])
    calldata = user.reallocate()
