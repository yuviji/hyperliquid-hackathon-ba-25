


def rank_vaults(options):
    """
    Rank a set of options by highest cost-aware effective APY, then by highest TVL.
    Each option should be a dictionary with 'pool_address', 'chain', 'cae_apy', 'tvl'.
    """

    # Sort by cost-aware effective APY (descending), then by TVL (descending)
    options.sort(key=lambda x: (-x.get("cae_apy", 0), -x.get("tvl", 0)))
    return options

def choose_position(net_apy, options):
    """
    Choose the best vault option and switch position only if the cost-aware effective APY exceeds the net APY of the current vault.
    """
    ranked_options = rank_vaults(options)
    best_option = ranked_options[0] if ranked_options else None

    if best_option and best_option["cae_apy"] > net_apy:
        return best_option
    return None