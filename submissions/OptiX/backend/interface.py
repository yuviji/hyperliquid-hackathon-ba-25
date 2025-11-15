from typing import List
from fetch import get_vault_data, get_tvl

class User:
    def __init__(self, 
                cash_deposits:float = 0.0, 
                token_holdings:int = 0, 
                chainID:str = "hyperevm", 
                userAddress:str = ""):
        self.cash_deposits = cash_deposits
        self.token_holdings = token_holdings
        self.chainID = chainID
        self.userAddress = userAddress

    def new_deposit(self, amount: float):
        self.cash_deposits += amount

    def set_of_vaults(self, vault_addresses: List[str]):
        self.vaults = vault_addresses

    def reallocate(self):
        # for each vault, fetch current APY and TVL
        pass