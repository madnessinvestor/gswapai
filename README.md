# GojoSwapAI

> A decentralized USDC/EURC swap interface on Arc Network with optional AI-assisted interaction.

---

## What is GojoSwapAI?

**GojoSwapAI** is a decentralized swap application built on the **Arc Testnet**.  
Its main purpose is to allow users to:

- Swap **USDC ↔ EURC** manually through a clean and modern interface  
- Use an **AI assistant** (Gojo-themed) to interact with the swap using natural language  
- Execute **real onchain transactions** through their connected wallet  
- Explore how **AI agents can improve usability in Web3 applications**

The project is experimental and educational in nature, focused on combining **onchain execution + user-friendly UX + AI interaction** in a single application.

---

## Live Demo

You can access the live version of the project here:  
https://gswapai.up.railway.app/
> Note: This project runs on Arc Testnet, so only test tokens should be used.

---

## Features

- USDC ↔ EURC swaps on Arc Testnet  
- Real onchain execution using connected wallets  
- MetaMask/Rabby integration
- AI Assist tab for natural language interaction  
- AI powered by **Groq** and **Google Gemini**  
- Real-time price charts  
- Modern UI built with React + Tailwind  
- Integration with Circle Attestation API for USDC bridge experiments  

---

## Tech Stack

### Frontend
- React 19  
- TypeScript  
- Vite  
- Tailwind CSS + shadcn/ui  
- Framer Motion  
- TanStack React Query  

### Backend
- Node.js  
- Express  
- TypeScript  
- Drizzle ORM  

### Blockchain
- Arc Testnet  
- Viem (Web3 interactions)  
- MetaMask wallet integration  

### AI
- Groq API (Llama 3.3 70B)  
- Google Gemini API  

---

## Smart Contracts (Arc Testnet)

| Contract | Address |
|--------|--------|
| Pool Factory | `0x34A0b64a88BBd4Bf6Acba8a0Ff8F27c8aDD67E9C` |
| Router | `0x284C5Afc100ad14a458255075324fA0A9dfd66b1` |
| USDC/EURC Pool | `0x18eAE2e870Ec4Bc31a41B12773c4F5c40Bf19aCD` |

---

## Supported Tokens

| Token | Address |
|------|--------|
| USDC | `0x3600000000000000000000000000000000000000` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

---

## Project Structure

GswapAI/
├── client/ # React frontend
├── server/ # Express backend
├── shared/ # Shared types/schemas
└── attached_assets/

---

## Environment Variables

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key

DATABASE_URL=postgresql://... (optional)

Installation
git clone https://github.com/madnessinvestor/GswapAI.git
cd GswapAI
npm install
npm run dev


App runs at:
http://localhost:5000

How to Use
Connect Wallet

Click Connect Wallet

Approve MetaMask connection

Make sure you are on Arc Testnet

Manual Swap

Select token (USDC or EURC)

Enter amount

Confirm transaction in MetaMask

AI Assist

Open the AI Assist tab

Type commands like:

"Swap 10 USDC to EURC"

Review the suggestion

Confirm and execute onchain

The assistant shows:

Used: Groq and Google Gemini

Arc Testnet Settings
Field	Value
Network Name	Arc Testnet
RPC	https://rpc.testnet.arc.network

Chain ID	5042002
Currency	ETH
Explorer	https://testnet.arcscan.app
Why this project?

GojoSwapAI was built to explore:

How AI agents can improve UX in Web3

How users can interact with onchain apps using natural language

How swap interfaces can become more accessible and intuitive

Practical integration between frontend, blockchain, and AI

It serves as a practical prototype for agent-driven Web3 applications.

License

MIT License

Author

Developed by Mad (Madness Investor)
GitHub: https://github.com/madnessinvestor
