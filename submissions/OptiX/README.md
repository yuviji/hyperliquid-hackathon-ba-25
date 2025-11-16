# OptiX (Streamlit App)

Cost‑aware vault reallocation on GlueX with a simple, dark‑themed Streamlit UI.

- Wallet/session setup
- Deposit and redeem (simulated via `User` state)
- Reallocation preview with Top Options table (APY, Δ vs current, TVL)
- Quick Reallocate (one‑click evaluate + switch if better)
- Router calldata generation for operators

---

## Quickstart

```bash
# 1) Install Python deps
cd submissions/OptiX/backend
pip install -r requirements.txt

# 2) Create a .env (see below)

# 3) Run the app (from submissions/OptiX)
cd ..
streamlit run backend/streamlit_app.py
```

If `streamlit` isn’t found, install it first:
```bash
pip install streamlit
```

---

## .env configuration
Create `submissions/OptiX/.env` (or export env vars in your shell):

```env
# Required for GlueX APIs
X_API_KEY=your_gluex_api_key
uniquePID=your_unique_pid
CHAIN_ID=hyperevm

# Optional: only needed for on-chain demo buttons in the UI
RPC_ENDPOINT=https://...
VAULT_CONTRACT_ADDRESS=0x...
PRIVATE_KEY=0x...   # demo only; do NOT use in production UIs
```

---

## App structure

- `backend/streamlit_app.py` — Streamlit pages, forms, UI polish
- `backend/interface.py` — `User` class (holdings, reallocation, commit_trade)
- `backend/fetch.py` — GlueX yield + TVL API clients
- `backend/apy.py` — Cost‑aware effective APY calculation
- `backend/rank.py` — `choose_position` ranking policy
- `backend/quote.py` — Router quote → calldata
- `contracts/` — Optimizer vault contracts (reference)
- `.streamlit/config.toml` — Dark theme

---

## Features at a glance

- Overview: portfolio hero (holdings, Net APY, 7d/30d projection)
- Actions: side‑by‑side deposit and redeem
- Reallocate: evaluate candidates with a progress bar and CSV‑like Top Options table
- Quick Reallocate: evaluate + switch if better APY is found
- Copy buttons on pool/token addresses

---

## Cost‑aware APY (intuition)

We compare net benefit of switching (growth over a horizon minus costs) to your current APY. If the best candidate’s cost‑aware APY beats current, we allow reallocation and can generate GlueX Router calldata for execution.

---

## Troubleshooting

- “command not found: streamlit”: install with `pip install streamlit` and re‑run from `submissions/OptiX`.
- API errors: ensure `X_API_KEY` and `uniquePID` are set and valid.
- No options found: add/select vaults on the Wallet/Vaults page first.

---

## License

MIT
