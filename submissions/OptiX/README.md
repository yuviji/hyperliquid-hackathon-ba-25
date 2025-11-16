# 🚀 OptiX: Autonomous GlueX Vault Yield Optimizer

**OptiX** is the next-gen automated yield optimizer for Hyperliquid's GlueX vaults. Users deposit once, and OptiX does the rest—allocating capital to the best opportunities via real-time vault selection, operator-verified rebalances, and a world-class dashboard experience. Instantly DeFi, zero stress, maximum yield.

---

**🏆 Built for the HyperEVM Hackathon — Leverage On-Chain Automation for Real Yield.**

---

## 🔥 Elevator Pitch

- **For Users:**
    - One deposit, highest APYs, always adapted.
    - Withdraw anytime, no manual switching.
    - Zero cognitive overhead—OptiX vault picks *for* you.
- **For Protocol Operators:**
    - Secure admin panel to manage whitelists and rebalance strategies.
    - Full on-chain transparency with off-chain intelligence.
- **For Judges:**
    - Polished institutional dashboard (Morpho/Aave-style).
    - Fully integrated: Hyperliquid smart contracts, Python GlueX backend, Ethers.js, real APYs, premium UX.

## 🌈 Key Features

- **Automated vault allocation** using on-chain and backend logic—max APY, cost-aware.
- **Deposit + Withdraw UX:** Safety-first, confirmation modals, gas estimates.
- **Live GlueX APY surfacing** — shows every opportunity, not just the currently selected.
- **Operator/Admin panel** for protocol-controlled rebalances, whitelist, router calldata.
- **Beautiful, real-time DeFi dashboard** — inspired by Yearn, Morpho, Aave v3.
- **Full-stack:** React frontend, Python Flask backend, Solidity BoringVault, live contract integrations.

---

## 🏗️ Architecture Overview

**Frontend:** React (Vite), Ethers.js v6, Context API
- `/components/` — Dashboard, StrategyCard, OpportunitiesTable, operator/admin modals
- `/hooks/` — On-chain and wallet hooks, APY data, contract wrappers
- `/lib/` — API clients for backend and GlueX

**Backend:** Python Flask, interface.py abstraction
- Exposes `/apy`, `/recommend`, `/router-route` endpoints
- Integrates with GlueX API for vault data, APY, TVL, and quoting
- Runs reallocation and ranking logic securely off-chain

**Contracts:**
- OptimizerBoringVault (Solidity, upgradable, EVM-compatible)
- Integrates ERC20 asset tokens
- Supports deposit, withdraw, operator-only strategy rebalance, and whitelist control

---

## 🔌 API Endpoints

- `GET /apy`: Returns real-time APYs for all vaults
- `GET /recommend`: Returns best vault for current user holdings
- `POST /router-route`: Backend computes calldata for rebalance (used by OperatorPanel)

*All endpoints return JSON. See `/backend/app.py` for server logic.*

---

## ⚙️ Installation & Quickstart

1. **Contracts:** Deploy OptimizerBoringVault. Export ABI as `src/abi/OptimizerBoringVault.json`.
2. **Backend:**
    ```bash
    cd submissions/OptiX/backend
    pip install -r requirements.txt
    python app.py  # Flask runs on :5000
    ```
3. **Frontend:**
    ```bash
    cd submissions/OptiX/frontend
    npm install
    npm run dev  # or npm start
    ```
4. **Configure:** Add contract addresses and backend URL to `/src/lib/contractAddresses.js` and API client.

---

## ✨ Demo Flow

- **User lands on dashboard:**
    - See total assets, live APY, and all opportunities.
    - Deposit/withdraw in 2 clicks—guided, gas estimates, auto-approval if needed.
- **Operator login:**
    - Access admin dashboard to whitelist vaults, see rebalance history, preview calldata, and trigger rebalances (powered by `/router-route`).
- **Live updates:**
    - All values reactively update on contract or backend changes. No manual refreshes.

---

## 💡 What Sets OptiX Apart?
- **Truly automated yield:** Users never need to move capital on their own, ever.
- **Cost-aware logic:** Backend/APY engine ranks not just raw yield, but net returns after all costs.
- **Admin-grade ops:** Protocol operators can manage strategy via a secure UI, end-to-end.
- **Premium UX:** No DeFi clutter, premium look/feel, instant feedback, and world-class loading states.
- **Open:** Code as modular as Yearn—but with GlueX superpowers.

---

## 🧠 Tech Stack
- Solidity (BoringVault, ERC20)
- Python (Flask backend, Vault+APY engine)
- React + Ethers.js (frontend)
- Foundry (contract testing)
- Postgres/Redis for backend data (optional for production)

---

## 🦾 Team & Credits
- Backend/Contract: [authors...]
- Frontend/UX: [authors...]
- Special thanks: Hyperliquid, GlueX, Hackathon mentors, Morpho, and Aave for inspiration

---

## 📸 UX Screenshots & Demo

> **[Insert dashboard, modal, and operator-panel screenshots here! A picture is worth 10,000 APY.]

---

## 📝 License

MIT License — please see LICENSE in this folder.

---

**OptiX: The effortless yield gateway for HyperEVM. Plug in. Earn More.**
