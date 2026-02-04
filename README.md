# ORBIT

A personal cognitive operating system that helps you think less and act better.

## Overview

ORBIT manages attention, intent, and progress through intelligent behavior modeling. It learns how you work and helps you focus on what matters.

## Core Principles

- **Never spams** - No notifications unless critical
- **Never overwhelms** - Information revealed progressively
- **Prefers silence over noise** - Absence of action is valid
- **Optimizes attention, not engagement** - Less screen time, more focus
- **Learns passively** - Observation over interrogation

## What ORBIT Does

- Understands intent through voice or text
- Models your cognitive patterns over time
- Suggests when to reduce scope or pause
- Maintains memory of what matters to you
- Presents a calm, focused interface
- Respects silence as a valid state

## What ORBIT Does NOT Do

- Gamify productivity with streaks or badges
- Send push notifications for engagement
- Create dashboards with vanity metrics
- Chat endlessly like a companion bot
- Require manual data entry
- Overwhelm with options or features

## Architecture

```
Client (Web/PWA)
    Voice Interface (Web Speech API)
    Cognitive Canvas UI (React + Framer Motion)
    Real-time Updates (WebSocket)
        |
Backend (FastAPI)
    Intent Engine
    Planner Agent
    Executor Agent
    Evaluator Agent
    Memory System
    Voice Processing
    Event Stream
        |
AI Layer
    LLM (Claude for reasoning)
    RAG (Personal Memory)
    Cognitive Profile Engine
        |
Data Layer
    PostgreSQL (structured data)
    Vector DB (semantic memory)
    Redis (real-time state)
```

## Tech Stack

**Frontend**
- React 18 with TypeScript
- Tailwind CSS with custom design system
- Framer Motion for animations
- Web Audio API for voice interface
- WebSockets for real-time updates

**Backend**
- FastAPI (Python 3.11+)
- Async/await architecture
- Event-driven design
- Pydantic for validation

**AI and Data**
- Claude (reasoning engine)
- FAISS (vector similarity)
- PostgreSQL (persistent storage)
- Redis (session state)

## Project Structure

```
orbit/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── agents/        # AI agent implementations
│   │   ├── core/          # Configuration, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── main.py        # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── canvas/        # Cognitive Canvas components
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API clients
│   │   ├── states/        # UI state components
│   │   ├── stores/        # State management
│   │   └── styles/        # CSS and Tailwind
│   └── package.json
├── docker-compose.yml
├── start.bat              # Windows startup script
└── README.md
```

## Quick Start

### Windows

Double-click `start.bat` or run:
```batch
start.bat
```

### Manual Setup

**Prerequisites**
- Node.js 18+
- Python 3.11+
- Docker (optional, for databases)

**Start Infrastructure**
```bash
docker-compose up -d
```

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## The Cognitive Profile

ORBIT builds a structured model of how you work:

| Attribute | Description |
|-----------|-------------|
| `preferred_hours` | When you do your best work |
| `focus_window` | How long you can sustain deep focus |
| `abandonment_patterns` | What causes you to give up on tasks |
| `overcommitment_score` | Tendency to take on too much |
| `consistency_score` | How well you follow through |

This is structured behavioral intelligence, not just embeddings.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /intent` | Submit natural language intent |
| `GET /planner/tasks` | Get current task breakdown |
| `POST /executor/complete` | Mark task complete |
| `GET /memory/search` | Search semantic memory |
| `GET /events` | SSE stream for real-time updates |
| `POST /voice/transcribe` | Convert speech to text |

## Environment Variables

Create `.env` files from the examples:

**Backend** (`backend/.env`)
```
DATABASE_URL=postgresql://user:pass@localhost/orbit
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=your_key_here
JWT_SECRET=your_secret_here
```

**Frontend** (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## Philosophy

ORBIT is built on the belief that the best productivity tool helps you do less, better.

Modern productivity tools fail because they:
1. Add cognitive load instead of removing it
2. Optimize for engagement, not outcomes
3. Treat all tasks as equal
4. Ignore human behavioral patterns

ORBIT succeeds by:
1. Reducing decisions through intelligent defaults
2. Modeling your behavior to predict needs
3. Using AI selectively, not gratuitously
4. Prioritizing calm over dopamine

## License

MIT
