# **AI-Enable**

A full-stack web app built entirely with **opencode**

Blockchain wallet integration · Passkey auth · Admin panel · WalletConnect mobile · Vercel deployment

---

# **What is AI-Enable?**

A server-side rendered web application that combines:

- **Authentication** — Email/password, Google OAuth, WebAuthn passkeys
- **Blockchain Wallet** — MetaMask + Abstract Global Wallet (AGW)
- **Token Management** — Deploy and transfer ERC-20 tokens on Abstract chain
- **Admin Panel** — Manage users and passkey credentials
- **Checkout** — E-commerce cart and payment flow

Built with **Astro**, **React**, **Tailwind CSS**, **DaisyUI**, deployed on **Vercel** with **Turso** database.

---

# **Architecture**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │ ◄──► │  Vercel SSR  │ ◄──► │  Turso DB    │
│  (React SFC) │     │  (Astro)     │     │  (SQLite)    │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────┴───────┐
                     │  Abstract    │
                     │  Testnet RPC │
                     └──────────────┘
```

- **Frontend**: Astro (SSR) + React islands
- **Styling**: Tailwind v4 + DaisyUI v5
- **Database**: Turso (edge SQLite) via Drizzle ORM
- **Blockchain**: viem + Abstract Global Wallet SDK
- **Runtime**: Bun

---

# **Authentication System**

Five auth methods, one JWT session:

| Method | Type | How it works |
|--------|------|-------------|
| **Email/Password** | Form | bcryptjs hash, JWT cookie |
| **Google OAuth** | One Tap | Google Identity Services + OAuth2Client |
| **Passkey Login** | Biometric | WebAuthn via @simplewebauthn |
| **Passkey Register** | Dashboard | Register device passkey for future login |
| **Email Verification** | Link | Resend API + verification token |

JWT payload: `{ userId, email, verified, isAdmin }` — 7-day expiry, httpOnly cookie.

---

# **Passkey (WebAuthn) Flow**

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ Browser  │         │  Server  │         │   DB     │
│          │         │          │         │          │
│ 1. Begin │────────►│ Generate │         │          │
│          │◄────────│ options  │         │          │
│ 2. Auth  │         │          │         │          │
│  (biom.) │         │          │         │          │
│ 3. Compl │────────►│ Verify   │────────►│ Store /  │
│          │◄────────│ response │         │ Update   │
│ 4. JWT!  │         │          │         │          │
└──────────┘         └──────────┘         └──────────┘
```

Challenges stored in-memory Map. Credentials linked to user via FK.

---

# **Blockchain Wallet**

**MetaMask + Abstract Global Wallet (AGW) + WalletConnect mobile**

Desktop uses the MetaMask browser extension. On iPhone (Safari/Chrome), **WalletConnect** deep-links to the MetaMask app — no browser extension needed.

1. **Connect** → MetaMask (desktop) or WalletConnect modal (mobile) → switch to Abstract chain
2. **Counterfactual AA** → Compute smart account address without deploying
3. **Deploy Account** → `deployAccount()` sends tx to on-chain
4. **Demo UserOp** → Send 0.01 ETH from AA back to EOA
5. **Create Token** → Deploy ERC-20, mint 1,000 AIE to AA
6. **Transfer Token** → Send AIE via UserOp bundler

Contract: `AIEnableToken.sol` — constructor takes name, symbol, to, amount.

---

# **Token Deployment + Auto-Verify**

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Browser  │     │  Abstract    │     │  Explorer    │
│  (viem)   │     │  RPC         │     │  Verify API  │
├──────────┤     ├──────────────┤     ├──────────────┤
│ Deploy   │────►│ sendEip712   │     │              │
│ Token    │     │ Transaction  │     │              │
│          │◄────│ receipt      │     │              │
│ Verify   │────────────────────────►│ POST Standard │
│          │◄────────────────────────│ JSON + args   │
│          │     │              │     │              │
│ ✅ Done! │     │              │     │              │
└──────────┘     └──────────────┘     └──────────────┘
```

Compiler settings: zksolc 1.5.15, zkvm-solc 0.8.24, optimizer mode 3.

---

# **Database Schema**

**users**
| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK autoincrement |
| email | text | UNIQUE |
| passwordHash | text | bcryptjs |
| verified | integer | 0/1 |
| isAdmin | integer | 0/1 |
| verificationToken | text | UUID |

**credentials**
| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| userId | integer | FK → users.id |
| credentialId | text | WebAuthn |
| publicKey | text | Serialized |
| counter | integer | Signature counter |

---

# **Admin Panel**

Protected by `requireAdmin()` middleware — checks JWT `isAdmin` flag.

**`/admin` page features:**

- **User list** — Toggle verified/admin status inline
- **Credential list** — View and delete passkey credentials
- **Promote via API** — `POST /api/admin/set-admin` with `ADMIN_SECRET`

```
// Admin middleware — 10 lines
export function requireAdmin(cookies) {
  const token = cookies.get("token")?.value;
  if (!token) return { error: "Not authenticated", status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: "Invalid token", status: 401 };
  if (!payload.isAdmin) return { error: "Admin access required", status: 403 };
  return { payload };
}
```

---

# **How opencode Built This**

Every feature was implemented through opencode chat sessions:

| Session | What was built |
|---------|---------------|
| 1 | Project scaffold, Astro + Tailwind + DaisyUI, landing page |
| 2 | Auth: JWT, email/password login/register, bcryptjs |
| 3 | Passkey: WebAuthn register + login with @simplewebauthn |
| 4 | Email verification with Resend API |
| 5 | Google OAuth One Tap integration |
| 6 | WalletConnect: MetaMask + AGW, deploy account, send ETH |
| 7 | ERC-20 token: Solidity contract, deploy, transfer |
| 8 | zkSync bytecode fix: 0003 format, Hardhat verify setup |
| 9 | Token verification: auto-verify from browser after deploy |
| 10 | Admin panel: user/credential management, set-admin API |
| 11 | WalletConnect mobile: iPhone MetaMask deep link support |

---

# **opencode Workflow**

```
┌─────────────┐
│  User ask   │  "add passkey login"
└──────┬──────┘
       │
┌──────▼──────┐
│  opencode   │  Reads codebase, plans approach
│  (explore)  │
└──────┬──────┘
       │
┌──────▼──────┐
│  opencode   │  Writes code, runs build checks
│  (build)    │
└──────┬──────┘
       │
┌──────▼──────┐
│  User test  │  "it works" or "fix this"
└──────┬──────┘
       │
┌──────▼──────┐
│  Commit +   │  git commit, tag, vercel deploy
│  Deploy     │
└─────────────┘
```

No manual coding — all implementation via natural language prompts.

---

# **Development Commands**

```bash
# Start dev server
bun run dev

# Generate DB migration
bunx drizzle-kit generate

# Apply migration
bunx drizzle-kit migrate

# Build for production
bun run build

# Deploy to Vercel
vercel --prod

# Promote admin user
node db/set-admin.mjs user@email.com

# Set WalletConnect project ID (required for mobile)
vercel env add PUBLIC_WALLETCONNECT_PROJECT_ID production
```

---

# **Tech Stack Summary**

| Category | Technology |
|----------|-----------|
| **Framework** | Astro 6 + React |
| **Styling** | Tailwind CSS 4 + DaisyUI 5 |
| **Database** | Turso (SQLite) + Drizzle ORM |
| **Runtime** | Bun |
| **Hosting** | Vercel (SSR) |
| **Auth** | JWT, bcryptjs, WebAuthn, Google OAuth |
| **Blockchain** | viem, Abstract Global Wallet SDK, WalletConnect |
| **Email** | Resend API |
| **AI Tool** | opencode (opencode.ai) |

---

# **Links**

- **Live app**: https://counter2-xi.vercel.app
- **Source code**: https://github.com/mingneedbeer/counter2
- **opencode**: https://opencode.ai
- **Abstract**: https://abs.xyz
- **Turso**: https://turso.tech
- **Astro**: https://astro.build
