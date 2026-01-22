# Arc Swap - DeFi Token Swap Interface

## Overview

Arc Swap is a decentralized exchange (DEX) frontend application built for the Arc Testnet blockchain. It provides a modern, user-friendly interface for token swapping, liquidity pool interactions, and cross-chain bridging functionality. The application features real-time price charts, an AI-powered swap assistant (themed as Gojo Satoru), and integration with MetaMask for wallet connectivity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for smooth UI transitions
- **Charts**: Lightweight Charts (TradingView) for real-time price visualization, Recharts for additional charting needs

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api` prefix
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: Static file serving with SPA fallback

### Blockchain Integration
- **Web3 Library**: Viem for Ethereum interactions (modern alternative to ethers.js)
- **Network**: Arc Testnet (Chain ID: 5042002)
- **RPC Endpoint**: https://rpc.testnet.arc.network
- **Wallet Connection**: MetaMask via EIP-1193 provider

### Smart Contract Integration
The application interacts with several deployed contracts on Arc Testnet:
- **Pool Factory**: `0x34A0b64a88BBd4Bf6Acba8a0Ff8F27c8aDD67E9C` - Creates and manages liquidity pools
- **Router**: `0x284C5Afc100ad14a458255075324fA0A9dfd66b1` - Handles multi-hop swaps and optimal routing
- **Native USDC**: `0x3600000000000000000000000000000000000000` - Native USDC token (6 decimals)

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with push-based schema sync
- **Current Storage**: In-memory storage implementation (can be upgraded to PostgreSQL)

### Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components including swap interface
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and query client
│   │   └── pages/         # Route components
├── server/                 # Express backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   └── storage.ts         # Data storage abstraction
├── shared/                 # Shared code between client and server
│   └── schema.ts          # Database schema definitions
└── attached_assets/        # Static assets and documentation
```

## External Dependencies

### AI Integration
- **Groq API**: Powers the AI swap assistant using Llama 3.3 70B model
- **Environment Variable**: `GROQ_API_KEY` required for AI functionality

### Blockchain Services
- **Arc Testnet RPC**: Primary blockchain data source
- **Circle Attestation API**: Used for cross-chain bridging (USDC bridge to Ethereum Sepolia)
- **Block Explorer**: https://testnet.arcscan.app for transaction verification

### Database
- **PostgreSQL**: Required for production (DATABASE_URL environment variable)
- **connect-pg-simple**: Session storage for Express sessions

### UI Component Dependencies
- **Radix UI**: Headless UI primitives for accessible components
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management
- **cmdk**: Command palette functionality

### Development Tools
- **Replit Plugins**: Dev banner, cartographer, and runtime error overlay for Replit environment
- **TypeScript**: Full type safety across the stack
- **ESBuild**: Server-side bundling for production