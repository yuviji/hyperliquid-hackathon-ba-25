from operator import call
from traceback import print_tb
from typing import List, Tuple
from fetch import get_tvl, get_input_token, get_vault_data
from apy import calculate_cost_aware_effective_apy
from quote import run_quote
from dotenv import load_dotenv
from rank import choose_position
import os
from fetch import get_tvl
from fetch import get_quote  # assuming your partner implemented this


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
        # Start with an empty vault list; set via set_of_vaults/add_vault
        self.vaults = []

    def new_deposit(self, amount: float):
        self.token_holdings += amount

    def set_of_vaults(self, vault_addresses: List[str]):
        """Replace the current set of candidate vault addresses."""
        self.vaults = self._clean_addresses(vault_addresses)

    # Backwards compatibility-friendly helpers for managing vault pools
    def add_vault(self, address: str) -> bool:
        """Add a vault address to the candidate set. Returns True if added."""
        if not isinstance(address, str):
            return False
        addr = address.strip()
        if not addr or not addr.startswith("0x"):
            return False
        addr = addr.lower()
        if addr not in self.vaults:
            self.vaults.append(addr)
            return True
        return False

    def remove_vault(self, address: str) -> bool:
        """Remove a vault address from the candidate set. Returns True if removed."""
        try:
            addr = address.lower()
            if addr in self.vaults:
                self.vaults.remove(addr)
                return True
            return False
        except Exception:
            return False

    def clear_vaults(self) -> None:
        """Clear all candidate vault addresses."""
        self.vaults = []

    def list_vaults(self) -> List[str]:
        """Return the current list of candidate vault addresses."""
        return list(self.vaults)

    def redeem(self, amount: float):
        if amount > self.token_holdings:
            raise ValueError("Insufficient token holdings to redeem the requested amount.")
        self.token_holdings -= amount

    def get_currect_token(self) -> Tuple[str, float]:
        # return the current token and its net apy (deprecated name kept for compatibility)
        input_token, net_apy, _ = get_vault_data(self.userAddress, self.chainID, self.token_holdings)
        return input_token, net_apy

    def get_current_token(self) -> Tuple[str, float]:
        """Preferred alias for get_currect_token (spelling fix)."""
        return self.get_currect_token()

    def get_vault_metrics(self) -> Tuple[str, float, float]:
        """Return (input_token, net_apy, daily_yield) for the current user position."""
        input_token, net_apy, daily_yield = get_vault_data(self.userAddress, self.chainID, self.token_holdings)
        return input_token, net_apy, daily_yield
    
    def reallocate(self):
        # for each vault, get the corresponding input_token
        current_token, current_net_apy = self.get_currect_token()
        options = []
        # No vaults configured; nothing to reallocate to
        if not getattr(self, "vaults", None):
            return None
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
            print(f"DEBUG: {options}")
        if len(options) == 0:
            return None
        # rank vaults and choose the best one
        best_option = choose_position(current_net_apy, options)
        # print(f"[DEBUG] User.reallocate: best_option={best_option}, current_net_apy={current_net_apy}")
        if best_option:
            # run quote
            router, calldata = self.commit_trade(current_token, best_option)
            return best_option, router, calldata
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
        print(f"DEBUG: quote_response: {quote_response}")
        effectiveOutputAmount = quote_response["effectiveOutputAmount"]
        self.token_holdings = effectiveOutputAmount
        self.userAddress = best_option["pool_address"]
        calldata = quote_response["calldata"]
        router = quote_response["router"]
        return router, calldata

    # Internal helpers
    def _clean_addresses(self, addresses: List[str]) -> List[str]:
        """Normalize addresses to lowercase, keep unique, filter obvious invalids."""
        cleaned = []
        seen = set()
        for a in addresses or []:
            if not isinstance(a, str):
                continue
            addr = a.strip().lower()
            if not addr.startswith("0x") or len(addr) < 10:
                continue
            if addr not in seen:
                seen.add(addr)
                cleaned.append(addr)
        return cleaned
    

if __name__ == "__main__":
    # Example usage
    user = User(token_holdings=100000000, chainID="hyperevm", userAddress="0xcdc3975df9d1cf054f44ed238edfb708880292ea")
    user.set_of_vaults(["0x8f9291606862eef771a97e5b71e4b98fd1fa216a", "0xe25514992597786e07872e6c5517fe1906c0cadd", "0x9f75eac57d1c6f7248bd2aede58c95689f3827f7", "0x63cf7ee583d9954febf649ad1c40c97a6493b1be"])
    best_option, router, calldata = user.reallocate()

    print(f"rounter: {router}")
    print(f"calldata: {calldata}")