import os
import uuid as _uuid
import json
import streamlit as st
from dotenv import load_dotenv
from interface import User
from fetch import get_vault_data, get_tvl, get_input_token
from rank import choose_position
from apy import calculate_cost_aware_effective_apy
from quote import run_quote
from config import WHITELISTED_VAULTS

load_dotenv()

# Optional Web3 integration (only if env vars provided)
try:
    from web3 import Web3
except ImportError:
    Web3 = None

# App-wide page configuration
st.set_page_config(
    page_title="OptiX",
    page_icon="💹",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Light UI polish via CSS injection
def inject_css():
        st.markdown(
                """
                <style>
                :root {
                    --optix-accent: #00ff88;
                    --optix-muted: rgba(255,255,255,0.08);
                }
                /* Tighten top padding a bit */
                section.main > div:first-child { padding-top: 0.5rem; }
                /* Make metrics look like cards */
                div[data-testid="stMetric"] {
                    background: var(--secondary-background-color);
                    border: 1px solid var(--optix-muted);
                    border-radius: 12px;
                    padding: 12px 14px;
                }
                div[data-testid="metric-container"] > label p {
                    opacity: 0.8;
                }
                /* Buttons: subtle glow on hover */
                button[kind="primary"] {
                    border-radius: 10px !important;
                    box-shadow: 0 0 0 rgba(0,0,0,0);
                    transition: box-shadow .2s ease;
                }
                button[kind="primary"]:hover { box-shadow: 0 0 12px var(--optix-accent); }
                /* Tables */
                div[data-testid="stDataFrame"] {
                    border: 1px solid var(--optix-muted);
                    border-radius: 10px;
                }
                /* Progress bar */
                div[data-testid="stProgressBar"] > div > div {
                    background: linear-gradient(90deg, var(--optix-accent), #22ffaa);
                }
                /* Badges */
                .optix-badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 6px 10px; border-radius: 999px; font-size: 0.875rem;
                    background: var(--secondary-background-color); border: 1px solid var(--optix-muted);
                }
                .optix-badge img { width: 18px; height: 18px; border-radius: 999px; }
                /* Copy button */
                .optix-copy {
                    background: transparent; color: var(--primary-color);
                    border: 1px solid var(--optix-muted); border-radius: 8px;
                    padding: 4px 10px; cursor: pointer; font-size: 0.85rem;
                }
                .optix-copy:hover { box-shadow: 0 0 10px var(--optix-accent); }
                code.copyable[data-copied="1"]::after { content: "  Copied!"; color: var(--optix-accent); }
                /* Cards */
                .optix-card {
                    border: 1px solid var(--optix-muted);
                    border-radius: 14px;
                    padding: 14px 16px; margin-bottom: 12px;
                    background: var(--secondary-background-color);
                }
                .optix-card h4 { margin: 0 0 8px 0; font-size: 1.05rem; }
                .optix-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
                .apy-badge { color: #0b0f0c; background: var(--optix-accent); padding: 4px 10px; border-radius: 999px; font-weight: 700; }
                .tvl-tag { opacity: .85; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.06); border: 1px solid var(--optix-muted); }
                .risk-low { color: #9be7ff; }
                .risk-med { color: #ffd166; }
                .risk-high { color: #ff7b7b; }
                </style>
                """,
                unsafe_allow_html=True,
        )

RPC_ENDPOINT = os.getenv("RPC_ENDPOINT")
VAULT_CONTRACT_ADDRESS = os.getenv("VAULT_CONTRACT_ADDRESS")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")  # Avoid in production UI; for demo only
CHAIN_ID = os.getenv("CHAIN_ID", "hyperevm")
UNIQUE_PID = os.getenv("uniquePID")

# Minimal ABI for deposit/withdraw (update with real one as needed)
VAULT_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

def get_web3():
    if Web3 and RPC_ENDPOINT and RPC_ENDPOINT.startswith("http"):
        return Web3(Web3.HTTPProvider(RPC_ENDPOINT))
    return None

# ---- UI helpers ----
def shorten(addr: str) -> str:
    try:
        return f"{addr[:6]}...{addr[-4:]}" if isinstance(addr, str) and len(addr) > 10 else addr
    except Exception:
        return str(addr)

def fmt_pct(x: float) -> str:
    try:
        return f"{float(x):.2f}%"
    except Exception:
        return "-"

def fmt_usd(x: float) -> str:
    try:
        v = float(x)
        if v >= 1e9:
            return f"${v/1e9:.2f}B"
        if v >= 1e6:
            return f"${v/1e6:.2f}M"
        if v >= 1e3:
            return f"${v/1e3:.2f}K"
        return f"${v:,.0f}"
    except Exception:
        return "-"

# Chain logos mapping
CHAIN_LOGOS = {
    "hyperevm": "https://storage.googleapis.com/zapper-fi-assets/networks/hyperevm-icon.png",
}

def badge(text: str, icon_url: str | None = None):
    if icon_url:
        st.markdown(f'<span class="optix-badge"><img src="{icon_url}" />{text}</span>', unsafe_allow_html=True)
    else:
        st.markdown(f'<span class="optix-badge">{text}</span>', unsafe_allow_html=True)

def copyable(text: str, label: str | None = None, shortened: bool = True):
    display = shorten(text) if shortened else text
    element_id = f"copy-{_uuid.uuid4().hex}"
    label_html = f"<div style='opacity:.8;margin-bottom:4px'>{label}</div>" if label else ""
    # text is expected to be an address (0x...), safe for embedding in quotes
    st.markdown(
        label_html +
        f"""
        <div class='optix-row'>
          <code id='{element_id}' class='copyable'>{display}</code>
          <button class='optix-copy' onclick="navigator.clipboard.writeText('{text}'); const el=document.getElementById('{element_id}'); el.setAttribute('data-copied','1'); setTimeout(()=>el.removeAttribute('data-copied'),900);">Copy</button>
        </div>
        """,
        unsafe_allow_html=True,
    )

def risk_label(apy: float, tvl_usd: float | None = None) -> tuple[str, str]:
    # Simple heuristic: higher APY and low TVL -> higher risk label
    level = "Low"
    css = "risk-low"
    if apy is None:
        return ("Unknown", "risk-med")
    if apy > 15 or (tvl_usd is not None and tvl_usd < 1_000_000):
        level, css = "High", "risk-high"
    elif apy > 5:
        level, css = "Medium", "risk-med"
    return (level, css)

def hero_section():
    if not ensure_user():
        return
    user = st.session_state.user
    try:
        input_token, net_apy, daily_yield = user.get_vault_metrics()
        projected_7d = int(user.token_holdings * ((1 + daily_yield) ** 7 - 1))
        projected_30d = int(user.token_holdings * ((1 + daily_yield) ** 30 - 1))
        with st.container():
            st.markdown("<div class='optix-card'>", unsafe_allow_html=True)
            st.markdown("<h4>Portfolio</h4>", unsafe_allow_html=True)
            c1, c2, c3, c4 = st.columns([2,1,1,1])
            with c1:
                st.metric("Holdings (raw units)", f"{int(user.token_holdings):,}")
                badge("Token: " + (shorten(input_token) if input_token else "-"))
            with c2:
                st.metric("Net APY", f"{net_apy:.2f}%")
            with c3:
                st.metric("Proj. 7d", f"+{projected_7d:,}")
            with c4:
                st.metric("Proj. 30d", f"+{projected_30d:,}")
            st.markdown("</div>", unsafe_allow_html=True)
    except Exception as e:
        st.error(f"Failed to load portfolio: {e}")

def init_state():
    if "user" not in st.session_state:
        st.session_state.user = None
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "available_vaults" not in st.session_state:
        st.session_state.available_vaults = list(WHITELISTED_VAULTS)
    if "vaults" not in st.session_state:
        st.session_state.vaults = list(st.session_state.available_vaults)

def log(msg):
    st.session_state.messages.append(msg)

def display_messages():
    for m in st.session_state.messages[-10:]:
        st.caption(m)

def create_user(addr: str, initial_amount: float):
    st.session_state.user = User(token_holdings=int(initial_amount), chainID=CHAIN_ID, userAddress=addr)

def ensure_user():
    if st.session_state.user is None:
        st.warning("Create a user session first.")
        return False
    return True

def ui_header():
    st.title("💹 OptiX Vault Interface")
    st.write("Deposit, redeem, and trigger reallocations across GlueX vaults.")

def wallet_section():
    st.subheader("Wallet / Session Setup")
    col1, col2 = st.columns(2)
    with col1:
        addr = st.text_input("User Address", value="0xcdc3975df9d1cf054f44ed238edfb708880292ea")
    with col2:
        default_initial = (
            int(st.session_state.user.token_holdings) if st.session_state.get("user") else 100000
        )
        initial = st.number_input(
            "Initial Holding (raw units)",
            value=default_initial,
            min_value=0,
            help="Sets your starting balance for this session (simulation)."
        )
    if st.button("Initialize Session"):
        create_user(addr, initial)
        # attach current vault set to user
        if st.session_state.vaults:
            st.session_state.user.set_of_vaults(st.session_state.vaults)
        log(f"Session initialized for {addr} with holdings {initial}")
    if st.session_state.user:
        st.success(f"Session active for {st.session_state.user.userAddress}")

def vaults_section():
    st.subheader("Vaults: Select or Add")
    selected = st.multiselect(
        "Select vaults to consider",
        options=st.session_state.available_vaults,
        default=st.session_state.vaults,
    )
    add_col1, add_col2 = st.columns([3,1])
    with add_col1:
        new_vault = st.text_input("Add vault address (0x...)", value="")
    with add_col2:
        if st.button("Add"):
            v = new_vault.strip()
            if v and v.startswith("0x") and len(v) >= 10:
                if v not in st.session_state.available_vaults:
                    st.session_state.available_vaults.append(v)
                if v not in selected:
                    selected.append(v)
            else:
                st.error("Please enter a valid address.")
    # Persist selection
    st.session_state.vaults = selected
    # Update user if exists
    if st.session_state.user and st.session_state.vaults:
        st.session_state.user.set_of_vaults(st.session_state.vaults)
    st.caption(f"Active vaults: {', '.join(st.session_state.vaults) if st.session_state.vaults else 'None'}")

def holdings_section():
    st.subheader("💼 Holdings")
    if not ensure_user():
        return
    user = st.session_state.user
    cols = st.columns(3)
    with cols[0]:
        st.metric("Holdings (raw units)", f"{int(user.token_holdings):,}")
    with cols[1]:
        st.caption("Chain")
        logo = CHAIN_LOGOS.get(CHAIN_ID)
        badge(CHAIN_ID.upper(), logo)
    with cols[2]:
        st.metric("Current Pool", shorten(user.userAddress))
    copyable(user.userAddress, label="Pool Address", shortened=True)

def position_section():
    st.subheader("📈 Current Position & APY")
    if not ensure_user():
        return
    try:
        user = st.session_state.user
        # Prefer using User helper to fetch metrics
        input_token, net_apy, daily_yield = user.get_vault_metrics()

        # Top metrics row
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.metric("Net APY", f"{net_apy:.2f}%")
        with m2:
            st.metric("Daily Yield", f"{daily_yield*100:.4f}%")
        with m3:
            st.metric("Holdings", f"{int(user.token_holdings):,}")
        # 1-day projection based on current daily yield (purely indicative)
        projected_1d = user.token_holdings * daily_yield
        with m4:
            st.metric("Projected 1d Gain", f"{int(projected_1d):,}")

        # Token info row
        tcol1, tcol2 = st.columns([2, 3])
        with tcol1:
            st.caption("Input Token")
            if input_token:
                copyable(input_token, shortened=True)
            else:
                st.code("-", language=None)
        with tcol2:
            st.caption("Current Pool")
            copyable(user.userAddress, shortened=True)

        # No chart per request

    except Exception as e:
        st.error(f"Failed to fetch vault data: {e}")

def deposit_section():
    st.subheader("⬆️ Deposit")
    if not ensure_user():
        return
    with st.form("deposit_form", clear_on_submit=True):
        amount = st.number_input(
            "Amount to deposit (raw units)", min_value=0, value=0, key="deposit_amount"
        )
        submitted = st.form_submit_button("Deposit")
        if submitted:
            if amount <= 0:
                st.error("Amount must be > 0")
            else:
                st.session_state.user.new_deposit(amount)
                log(f"Deposited {amount}. New holdings: {st.session_state.user.token_holdings}")
                st.toast("Deposit recorded.")
                st.rerun()
    if Web3 and PRIVATE_KEY and VAULT_CONTRACT_ADDRESS:
        with st.expander("On-chain Deposit (demo)"):
            if st.button("Send On-chain Deposit Tx"):
                w3 = get_web3()
                if not w3:
                    st.error("Web3 not configured.")
                else:
                    acct = w3.eth.account.from_key(PRIVATE_KEY)
                    contract = w3.eth.contract(
                        address=Web3.to_checksum_address(VAULT_CONTRACT_ADDRESS), abi=VAULT_ABI
                    )
                    try:
                        tx = contract.functions.deposit(int(amount)).build_transaction({
                            'from': acct.address,
                            'nonce': w3.eth.get_transaction_count(acct.address),
                        })
                        signed = acct.sign_transaction(tx)
                        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
                        st.write(f"Submitted tx: {tx_hash.hex()}")
                    except Exception as e:
                        st.error(f"Tx failed: {e}")

def redeem_section():
    st.subheader("⬇️ Redeem")
    if not ensure_user():
        return
    with st.form("redeem_form", clear_on_submit=True):
        amount = st.number_input(
            "Amount to redeem (raw units)", min_value=0, value=0, key="redeem_amount"
        )
        submitted = st.form_submit_button("Redeem")
        if submitted:
            try:
                st.session_state.user.redeem(amount)
                log(f"Redeemed {amount}. New holdings: {st.session_state.user.token_holdings}")
                st.toast("Redeem successful.")
                st.rerun()
            except Exception as e:
                st.error(str(e))
    if Web3 and PRIVATE_KEY and VAULT_CONTRACT_ADDRESS:
        with st.expander("On-chain Withdraw (demo)"):
            if st.button("Send On-chain Withdraw Tx"):
                w3 = get_web3()
                if not w3:
                    st.error("Web3 not configured.")
                else:
                    acct = w3.eth.account.from_key(PRIVATE_KEY)
                    contract = w3.eth.contract(address=Web3.to_checksum_address(VAULT_CONTRACT_ADDRESS), abi=VAULT_ABI)
                    try:
                        tx = contract.functions.withdraw(int(amount)).build_transaction({
                            'from': acct.address,
                            'nonce': w3.eth.get_transaction_count(acct.address),
                        })
                        signed = acct.sign_transaction(tx)
                        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
                        st.write(f"Submitted tx: {tx_hash.hex()}")
                    except Exception as e:
                        st.error(f"Tx failed: {e}")

def reallocation_section():
    st.subheader("🔁 Reallocate (Quote & Calldata)")
    if not ensure_user():
        return
    # Detailed evaluation with ranking and quotes (preview only)
    if st.button("Evaluate Reallocation (Preview)"):
        user = st.session_state.user
        candidates = list(st.session_state.vaults)
        options = []
        try:
            current_token, current_net_apy = user.get_current_token()
            st.session_state['current_token'] = current_token
            total = len(candidates)
            progress = st.progress(0)
            status = st.empty()
            for idx, vault in enumerate(candidates, start=1):
                if vault.lower() == user.userAddress.lower():
                    continue
                try:
                    input_token = get_input_token(vault, CHAIN_ID)
                    tvl = get_tvl(vault, CHAIN_ID)
                    payload = {
                        "chainID": CHAIN_ID,
                        "inputToken": current_token,
                        "outputToken": vault,
                        "inputAmount": user.token_holdings,
                        "orderType": "BUY",
                        "userAddress": user.userAddress,
                        "outputReceiver": vault,
                        "uniquePID": UNIQUE_PID,
                    }
                    apy_data = calculate_cost_aware_effective_apy(payload)
                    options.append({
                        "pool_address": vault,
                        "chain": CHAIN_ID,
                        "apy": apy_data["cae_apy"],
                        "tvl": tvl,
                        "input_token": input_token,
                        "output_token": apy_data["output_token"],
                    })
                except Exception as inner:
                    log(f"Failed option for {vault}: {inner}")
                # Update progress UI
                status.write(f"Evaluating {vault} ({idx}/{total})...")
                percent = int(idx / total * 100) if total else 100
                progress.progress(percent)
            progress.progress(100)
            status.write("Evaluation complete.")

            # Rank options and compute display rows
            ranked = sorted(options, key=lambda x: (-x.get("apy", 0), -x.get("tvl", 0))) if options else []
            best_display = ranked[0] if ranked else None
            st.session_state['best_display'] = best_display

            st.markdown("**Current Net APY:** " + fmt_pct(current_net_apy))

            if best_display:
                delta = best_display["apy"] - current_net_apy
                c1, c2 = st.columns(2)
                with c1:
                    st.metric("Best APY", fmt_pct(best_display["apy"]), delta=f"{delta:.2f}%")
                with c2:
                    st.metric("Best TVL", fmt_usd(best_display["tvl"]))

                # Prepare a compact table of top options (CSV-like)
                top_n = min(3, len(ranked))
                table = []
                for i, opt in enumerate(ranked[:top_n], start=1):
                    table.append({
                        "Rank": i,
                        "Vault": shorten(opt["pool_address"]),
                        "APY": fmt_pct(opt["apy"]),
                        "Δ vs current": f"{(opt['apy']-current_net_apy):.2f}%",
                        "TVL": fmt_usd(opt["tvl"]),
                    })
                st.write("Top Options:")
                st.dataframe(table, hide_index=True, use_container_width=True)

                better = best_display["apy"] > current_net_apy
                st.session_state['better'] = better
                if better:
                    st.success("Better APY found. Generate calldata to switch.")
                else:
                    st.info("Best APY alternative does not beat current.")
            else:
                st.info("Best APY alternative does not beat current. ")
        except Exception as e:
            st.error(f"Reallocation failed: {e}")

    if st.session_state.get('better'):
        if st.button("Generate Reallocation Calldata"):
            try:
                user = st.session_state.user
                print(f"DEBUG: user: {user}")
                current_token = st.session_state.get('current_token')
                best_display = st.session_state.get('best_display')
                print(f"DEBUG: best_display {best_display}")
                if not best_display:
                    st.error("No best option available. Run evaluation first.")
                    return
                print(f"DEBUG: current_token {current_token}")
                router, calldata = user.commit_trade(current_token, best_display)
                print(f"router: {router}")
                st.write("Router:")
                st.code(router or "-", language=None)
                st.write("Calldata for Reallocation:")
                st.code(calldata or "", language="json")
                st.toast("Reallocated. Please refresh!")
            except Exception as trade_err:
                st.error(f"Commit trade failed: {trade_err}")

def quick_reallocate_section():
    st.subheader("Quick Reallocate")
    st.caption("One-click: evaluate & switch if better APY found.")
    if not ensure_user():
        return
    if st.button("Run Quick Reallocate"):
        try:
            user = st.session_state.user
            
            result = user.reallocate()
            if result:
                best_option, router, calldata = result
                st.success("Switched to better vault.")
                st.write("Chosen Option:")
                st.json(best_option)
                st.write("Router:")
                st.code(router or "-", language=None)
                st.write("Calldata:")
                st.code(calldata or "", language="json")
                st.toast("Position updated. Refreshing...")
                st.rerun()
            else:
                st.info("No vault exceeds current net APY.")
        except Exception as e:
            st.error(f"Quick reallocate failed: {e}")

def developer_notes():
    with st.expander("Developer / Security Notes"):
        st.markdown("""
        - This UI simulates deposits/redeems locally via the `User` class.
        - On-chain transaction buttons require `RPC_ENDPOINT`, `VAULT_CONTRACT_ADDRESS`, and `PRIVATE_KEY` set in `.env`.
        - Never expose private keys in a production Streamlit app; integrate WalletConnect or similar instead.
        - APY and TVL data fetched from GlueX APIs via your configured API key.
        - Reallocation provides GlueX Router calldata you can pass to operator bot or contract call.
        """)

def page_wallet():
    ui_header()
    wallet_section()
    vaults_section()

def page_overview():
    ui_header()
    hero_section()
    holdings_section()
    position_section()

def page_actions():
    ui_header()
    actions_summary()
    actions_two_col()

def page_reallocate():
    ui_header()
    reallocation_section()

def page_quick_reallocate():
    ui_header()
    quick_reallocate_section()

def page_notes():
    ui_header()
    developer_notes()
    st.divider()
    display_messages()

def actions_two_col():
    col_left, col_right = st.columns(2)
    with col_left:
        deposit_section()
    with col_right:
        redeem_section()

def actions_summary():
    st.subheader("🧭 Summary")
    if not ensure_user():
        return
    try:
        user = st.session_state.user
        input_token, net_apy, daily_yield = get_vault_data(
            user.userAddress, CHAIN_ID, user.token_holdings
        )
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.metric("Holdings", f"{int(user.token_holdings):,}")
        with c2:
            st.metric("Net APY", f"{net_apy:.2f}%")
        with c3:
            st.metric("Daily Yield", f"{daily_yield*100:.4f}%")
        with c4:
            st.metric("Pool", shorten(user.userAddress))
    except Exception as e:
        st.error(f"Failed to fetch summary: {e}")

def main():
    init_state()
    inject_css()
    # Use Streamlit's pages API if available, otherwise fallback to single-page
    if hasattr(st, "navigation") and hasattr(st, "Page"):
        pages = [
            st.Page(page_wallet, title="Wallet", icon="👛"),
            st.Page(page_overview, title="Overview", icon="📊"),
            st.Page(page_actions, title="Actions", icon="⚙️"),
            st.Page(page_reallocate, title="Reallocate", icon="🔁"),
            st.Page(page_quick_reallocate, title="Quick Reallocate", icon="⚡"),
            st.Page(page_notes, title="Notes", icon="🧩"),
        ]
        nav = st.navigation(pages)
        nav.run()
    else:
        st.info("Running in single-page mode (upgrade Streamlit for st.pages)")
        ui_header()
        wallet_section()
        vaults_section()
        holdings_section()
        position_section()
        actions_summary()
        actions_two_col()
        reallocation_section()
        developer_notes()
        st.divider()
        display_messages()

if __name__ == "__main__":
    main()
