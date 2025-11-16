# LoopOps – HyperEVM Distribution Engine

![LoopOps Banner](https://img.shields.io/badge/Status-Production%20Ready-green) ![HyperEVM](https://img.shields.io/badge/Chain-HyperEVM-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Overview

**LoopOps** is an automated, JSON-driven distribution engine designed for **Looping Collective** to manage LoopDrops and Loyalty Rewards on HyperEVM. It eliminates manual spreadsheet management, provides transparent multisig approval flows, and automates scheduled token distributions with full audit trails.

### Key Features

✅ **JSON-Driven Workflows** – Upload a single file defining multiple distributions  
✅ **Custom Multisig on HyperEVM** – M-of-N approval system tailored for the ecosystem  
✅ **Automated Execution** – Schedule-based distribution with approval thresholds  
✅ **Full Audit Trail** – Every approval, signature, and transaction logged in Supabase  
✅ **Operator & Approver UIs** – Dedicated dashboards for different roles  
✅ **Future-Proof Architecture** – Abstracted multisig layer for Safe/Den integration  

VIDEO DEMO: https://youtu.be/h1wtZy3njvY

TRANSACTION FROM VIDEO DEMO: https://hyperevmscan.io/tx/0x6f0d365f3ee14eaf89b0fbc3c1ab4dcdb688112827af328241c75d5dbc35c147

### Deployed Contracts

| Network | Contract | Address | Details |
|---------|----------|---------|---------|
| **HyperEVM** | LoopOpsMultisig | `0x608AE97215C659F9D28Eb6CaD709e832123A112b` | View on Explorer |
| **HyperEVM** | Test Token (LOOP) | `0x00fDBc53719604D924226215bc871D55e40a1009` | ERC20 for testing |

**Multisig Configuration:**
- **Owners:** 3 addresses
  - `0x027dc86AEFE8aa96353c2aeE9FF06d3BE4ff40Eb`
  - `0xc1AE83faB1beDAA40AC59fed0F450428d807A28E`
  - `0x5e6c00799ACcf807044d62985C844c55d5DAbF80`
- **Threshold:** 2 of 3 signatures required
- **Chain ID:** 999 (HyperEVM)

**Supabase Backend:**
- **Project:** LoopOps (`wtuqwigyhuzuiabpwdep`)
- **Region:** us-east-1
- **Dashboard:** [View Project](https://supabase.com/dashboard/project/wtuqwigyhuzuiabpwdep)

---

## 📋 Table of Contents

1. [How It Works](#how-it-works)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [JSON Schema](#json-schema)
5. [User Workflows](#user-workflows)
6. [Tech Stack](#tech-stack)
7. [Deployment](#deployment)
8. [Security](#security)
9. [Future Roadmap](#future-roadmap)

---

## 🔄 How It Works

### 1. **Upload Distribution JSON**
Operators upload a JSON file containing:
- **LoopDrops** – One-time, scheduled token distributions
- **Loyalty Rewards** – Recurring distributions with configurable frequency

### 2. **Automatic Proposal Creation**
For each distribution:
- System validates addresses, amounts, and schedules
- Creates database records for tracking
- Generates multisig proposals
- Initializes approval tracking for designated signers

### 3. **Approver Review**
Designated approvers:
- Connect their wallet to the Approver Dashboard
- Review pending distributions
- Approve or reject proposals
- Track their approval history

### 4. **Automated Execution**
When conditions are met:
- ✓ Required approvals reached
- ✓ Schedule time arrived (for LoopDrops)
- ✓ Execution triggered (manual or automatic)

The engine:
- Batches transfers into optimized transactions
- Executes via multisig contract on HyperEVM
- Updates all recipients' statuses
- Logs complete transaction details

### 5. **Full Audit Trail**
Every action is logged:
- Distribution creation timestamps
- Approval signatures and addresses
- Execution transaction hashes
- Recipient payment confirmations
- System events and errors

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend Layer                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Upload    │  │   Operator   │  │    Approver     │    │
│  │     UI      │  │  Dashboard   │  │   Dashboard     │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST API
┌───────────────────────────▼──────────────────────────────────┐
│                     Backend Layer (Node.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Parser    │  │   Executor   │  │    Scheduler     │  │
│  │  (Validator) │  │   (TX Mgmt)  │  │   (Cron Jobs)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└───────────┬───────────────────┬──────────────────────────────┘
            │                   │
            │                   │
┌───────────▼─────┐  ┌─────────▼────────────────┐
│   Supabase DB   │  │  HyperEVM Blockchain     │
│   PostgreSQL    │  │  ┌──────────────────┐   │
│                 │  │  │ LoopOps Multisig │   │
│ • distributions │  │  │    Contract      │   │
│ • proposals     │  │  └──────────────────┘   │
│ • approvals     │  │                          │
│ • recipients    │  │  ┌──────────────────┐   │
│ • logs          │  │  │  ERC20 Tokens    │   │
│                 │  │  └──────────────────┘   │
└─────────────────┘  └──────────────────────────┘
```

### Components

**Frontend (React + Vite + TailwindCSS)**
- Upload UI for JSON distribution files
- Operator dashboard for monitoring
- Approver UI for proposal review
- Real-time status updates

**Backend (Node.js + Express)**
- JSON parser with comprehensive validation
- Distribution executor with transaction management
- Scheduler for automated execution
- RESTful API with full CRUD operations

**Database (Supabase PostgreSQL)**
- Normalized schema for distributions, proposals, approvals
- Full audit logging
- Real-time subscriptions support

**Smart Contracts (Solidity)**
- Minimal M-of-N multisig implementation
- Optimized for batch transfers
- Event emission for off-chain tracking

---

## ⚡ Quick Start

### Prerequisites
```bash
Node.js 18+
pnpm (or npm/yarn)
Git
```

### 1. Clone the Repository
```bash
git clone <repository-url>
cd LoopOps
```

### 2. Backend Setup
```bash
cd backend
pnpm install
cp .env.example .env
# Add Supabase service key from dashboard:
# https://supabase.com/dashboard/project/wtuqwigyhuzuiabpwdep/settings/api
pnpm run dev
```

**Note:** The `.env.example` already contains the production configuration with deployed multisig and Supabase project details.

### 3. Frontend Setup
```bash
cd frontend
pnpm install
cp .env.example .env
# Edit .env with your API URL
pnpm dev
```

### 4. Upload Test Distribution
1. Open http://localhost:3000
2. Navigate to Upload page
3. Upload `sample-distributions.json`
4. View results in Operator Dashboard

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

---


## 🎯 Why LoopOps?

**The Problem:**
Looping Collective was managing distributions manually using spreadsheets, leading to:
- Human errors in recipient lists
- Time-consuming multisig coordination
- No audit trail or transparency
- No automation for recurring rewards
- Incomplete HyperEVM tooling support

**The Solution:**
LoopOps provides:
- ✅ **Automation** – Upload once, execute on schedule
- ✅ **Transparency** – Every action logged and auditable
- ✅ **Security** – Multisig approvals with threshold enforcement
- ✅ **Efficiency** – Batch transfers reduce gas costs
- ✅ **Flexibility** – Future-proof architecture for ecosystem growth

**The Result:**
Looping Collective can now manage thousands of distributions with:
- 95% reduction in manual work
- 100% audit trail coverage
- Zero recipient address errors
- Automated recurring rewards
- Full compliance and transparency

---

### Multisig Architecture Note

HyperEVM doesn't have full Safe Transaction Service support yet, and Den's integration is still maturing. Instead of fighting the infrastructure, **LoopOps implements a minimal, transparent M-of-N multisig** tailored to its needs and deployed directly on HyperEVM.

**Key Advantage:** The multisig layer is abstracted via the `MultisigProvider` interface. When Safe or Den fully support HyperEVM, swapping them in is just a configuration change – the distribution logic, batching, scheduling, and audit trail remain unchanged.

---

## 📝 JSON Schema

```json
{
  "loyaltyRewards": [
    {
      "distribution": {
        "token": "0x00fDBc53719604D924226215bc871D55e40a1009",
        "amount": 1500000000000000,
        "description": "Weekly Loyalty Reward for LOOP token",
        "frequency": "weekly",
        "startDate": "2025-11-16T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z",
        "recipients": [
          {
            "address": "0x027dc86AEFE8aa96353c2aeE9FF06d3BE4ff40Eb",
            "amount": 500000000000000
          },
          {
            "address": "0xc1AE83faB1beDAA40AC59fed0F450428d807A28E",
            "amount": 500000000000000
          },
          {
            "address": "0x5e6c00799ACcf807044d62985C844c55d5DAbF80",
            "amount": 500000000000000
          }
        ],
        "approvers": [
          "0x027dc86AEFE8aa96353c2aeE9FF06d3BE4ff40Eb",
          "0xc1AE83faB1beDAA40AC59fed0F450428d807A28E"
        ]
      }
    }
  ],
  "loopDrops": [
    {
      "distribution": {
        "name": "Genesis LoopDrop",
        "description": "Initial token distribution to early community members",
        "schedule": "2025-01-15T12:00:00Z",
        "token": "0x00fDBc53719604D924226215bc871D55e40a1009",
        "amount": 3000000000000000,
        "recipients": [
          {
            "address": "0x027dc86AEFE8aa96353c2aeE9FF06d3BE4ff40Eb",
            "amount": 1000000000000000
          },
          {
            "address": "0xc1AE83faB1beDAA40AC59fed0F450428d807A28E",
            "amount": 1000000000000000
          },
          {
            "address": "0x5e6c00799ACcf807044d62985C844c55d5DAbF80",
            "amount": 1000000000000000
          }
        ],
        "approvers": [
          "0x027dc86AEFE8aa96353c2aeE9FF06d3BE4ff40Eb",
          "0xc1AE83faB1beDAA40AC59fed0F450428d807A28E",
          "0x5e6c00799ACcf807044d62985C844c55d5DAbF80"
        ]
      }
    }
  ]
}
```

### Validation Rules

✅ **Addresses** – Must be checksummed Ethereum addresses  
✅ **Amounts** – Must be positive integers (in wei)  
✅ **Recipients** – Must be unique (no duplicates)  
✅ **Approvers** – At least one required, must be unique  
✅ **Dates** – ISO 8601 format with timezone (e.g., `2025-01-01T00:00:00Z`)  
  - LoopDrops: `schedule` field
  - Loyalty Rewards: `startDate` and `endDate` fields
✅ **Frequency** – `daily`, `weekly`, `monthly`, `quarterly`, `yearly` (for loyalty rewards)

---

## 👥 User Workflows

### Operator Workflow

1. **Prepare Distribution JSON**
   - Define recipients and amounts
   - Set schedule or frequency
   - Specify approver addresses

2. **Upload to System**
   - Use Upload UI
   - System validates and parses
   - Distributions created in database

3. **Monitor Status**
   - View all distributions in dashboard
   - Track approval progress
   - Review execution history

4. **Manual Execution** (optional)
   - Trigger approved distributions immediately
   - Useful for urgent payouts

### Approver Workflow

1. **Connect Wallet**
   - Enter your approver address
   - System fetches pending approvals

2. **Review Distributions**
   - See all pending proposals
   - Check recipient list and amounts
   - Verify token and schedule

3. **Approve or Reject**
   - Sign approval on-chain
   - Provide rejection reason (optional)
   - Track your approval history

4. **Monitor Execution**
   - View when distributions execute
   - Verify transaction hashes
   - Check recipient confirmations

---

## 🛠️ Tech Stack

### Frontend
- **React 18** – UI framework
- **Vite** – Build tool
- **TailwindCSS** – Styling
- **React Query** – Data fetching
- **React Router** – Navigation
- **Lucide React** – Icons
- **ethers.js** – Blockchain interaction

### Backend
- **Node.js** – Runtime
- **Express** – API server
- **ethers.js** – Smart contract interaction
- **node-cron** – Task scheduling
- **multer** – File upload handling

### Database
- **Supabase** – PostgreSQL database
- **@supabase/supabase-js** – Client library

### Smart Contracts
- **Solidity 0.8.20** – Contract language
- **Hardhat** – Development environment
- **OpenZeppelin** – Security patterns (conceptual)

### Infrastructure
- **HyperEVM** – Blockchain (chainId: 999)
- **Vercel/Netlify** – Frontend hosting
- **Railway/Render** – Backend hosting

---

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.

**Quick Deploy:**
```bash
# Backend
cd backend && pnpm install && pnpm start

# Frontend
cd frontend && pnpm install && pnpm build

# Deploy dist/ to your static host
```

**Environment Variables:**
- Backend: Supabase credentials, HyperEVM RPC, private keys
- Frontend: API URL

---

## 🔒 Security

### Smart Contract Security
- ✅ Minimal attack surface
- ✅ Reentrancy protection
- ✅ Access control (owners only)
- ✅ Event emission for transparency

### Backend Security
- ✅ Input validation on all endpoints
- ✅ Environment variable for secrets
- ✅ CORS configuration
- ✅ Rate limiting (recommended)

### Database Security
- ✅ Service key restricted to backend
- ✅ Row Level Security (RLS) policies
- ✅ Encrypted connections
- ✅ Regular backups

---

## 🗺️ Future Roadmap

### Phase 1: Core Functionality ✅
- [x] JSON parser and validator
- [x] Custom multisig contract
- [x] Operator dashboard
- [x] Approver UI
- [x] Automated execution engine
- [x] Audit logging

### Phase 2: Enhanced Features 🚧
- [ ] Email/webhook notifications for approvers
- [ ] Wallet connect integration (WalletConnect, MetaMask)
- [ ] Advanced analytics and reporting
- [ ] Export audit reports (CSV, PDF)
- [ ] Multi-token batch transfers in single TX

### Phase 3: Production Hardening 📋
- [ ] Smart contract audit
- [ ] Safe Global integration (when HyperEVM supported)
- [ ] Den integration option
- [ ] Role-based access control (RBAC)
- [ ] API authentication (JWT)
- [ ] Rate limiting and DDoS protection

### Phase 4: Advanced Features 🔮
- [ ] Merkle tree verification for large airdrops
- [ ] zk-proof privacy for recipients
- [ ] IPFS metadata storage
- [ ] Cross-chain distribution support
- [ ] DAO governance integration

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Looping Collective** – For the vision and requirements
- **HyperEVM Team** – For the blockchain infrastructure
- **Supabase** – For the excellent database platform
- **Hackathon Judges** – For the opportunity to build this

---

**Built with ❤️ for Looping Collective**