# 💰 SpendWise AI

AI-powered financial assistant that parses natural language expense descriptions into structured spending data and tracks your budget.

## Demo

### Screenshots

**Main Dashboard — Quick Entry & Recent Transactions**

Enter expenses in natural language (e.g. *"Потратил 1200₽ на пиццу и напитки в Додо"*) — the AI parses it into structured data and saves to the database.

**Spending by Category — Visual Breakdown**

View your spending patterns with a Chart.js bar chart grouped by category.

*(Replace these with actual screenshots from your deployed app)*

## Context

### End Users

Individuals, students, and freelancers who want to track personal expenses without manually filling in forms or spreadsheets.

### Problem

Most expense-tracking apps require tedious form-filling — selecting categories, typing amounts, picking dates. People abandon them because it takes too long.

### Solution

SpendWise AI lets you type expenses in natural language. A self-hosted LLM (Qwen 2.5 via Ollama) parses the text into structured JSON (amount, category, vendor, date) and saves it to a PostgreSQL database. One sentence → one tracked expense.

## Features

### Implemented (Version 1 & 2)

| Feature | Description |
|---------|-------------|
| AI Natural Language Parsing | Qwen 2.5 parses free-text expense into structured data |
| Quick Manual Entry | Form with amount, vendor, category (10 with emoji), date |
| Quick-Entry Templates | Create reusable templates (e.g. "Lunch", "Metro") for one-click logging |
| Transaction History | View and delete past transactions |
| Spending by Category | Chart.js bar chart showing totals per category |
| Bilingual UI | Russian / English toggle (persisted in localStorage) |
| Vendor Autocorrect | Fixes common LLM hallucinations (e.g. "pyaterka" → "Пятёрочка") |
| Docker Deployment | Full Docker Compose setup with 4 services |

### Not Yet Implemented

| Feature | Priority |
|---------|----------|
| Receipt OCR (photo upload parsing) | High |
| Monthly budget limits with alerts | Medium |
| Multi-user auth | Medium |
| CSV / PDF export | Low |
| Spending pattern analytics | Low |

## Usage

1. Open the app in your browser (`http://localhost:5173`).
2. Type an expense in the **Quick Entry** box — e.g. *"Купил билеты на метро за 340 рублей"* — and press Enter.
3. The AI parses the expense into amount, category, vendor, and date. Click **Save** to store it.
4. Use **Quick Templates** for recurring expenses — create once, then click to log.
5. Use **Manual Entry** form to add expenses without AI.
6. View all transactions in the **Transaction History** table.
7. Check **Spending by Category** for a visual breakdown.

## Deployment

### Target OS

Ubuntu 24.04 LTS (same as university VMs).

### Prerequisites

Install on the VM:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose (usually bundled)
docker compose version
```

If using **Groq API** instead of local Ollama, you also need:
- A Groq API key from https://console.groq.com

### Step-by-Step Deployment

#### 1. Clone or copy the project to the VM

```bash
# If using git
git clone https://github.com/<your-username>/se-toolkit-hackathon.git
cd se-toolkit-hackathon

# Or copy via scp from local
# scp -r se-toolkit-hackathon/ user@<VM_IP>:/path/to/project/
```

#### 2. Configure environment

Edit `.env` for your setup:

```env
# Self-hosted Ollama (default)
USE_OLLAMA=true
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:7b

# Or Groq API
# USE_OLLAMA=false
# GROQ_API_KEY=your_key_here

DATABASE_URL=postgresql://postgres:postgres@db:5432/spendwise
```

#### 3. Build and start

```bash
docker compose up --build -d
```

#### 4. Pull the AI model (first time only, Ollama mode)

```bash
docker exec se-toolkit-hackathon-ollama-1 ollama pull qwen2.5:7b
```

#### 5. Open firewall ports

```bash
sudo ufw allow 5173/tcp
sudo ufw allow 8000/tcp
```

#### 6. Access the app

- **Frontend:** `http://<VM_IP>:5173`
- **Backend API:** `http://<VM_IP>:8000/docs`

#### 7. Switch to Groq API (no GPU needed)

If the VM has no GPU, edit `.env`:

```env
USE_OLLAMA=false
GROQ_API_KEY=gsk_your_key
```

Then restart:

```bash
docker compose down && docker compose up --build -d
```

### Service URLs

| Service | Port | Description |
|---------|------|-------------|
| Frontend (React) | 5173 | Main web interface |
| Backend (FastAPI) | 8000 | REST API + Swagger docs |
| Ollama | 11434 | Local AI inference server |
| PostgreSQL | 5432 | Persistent database |

## Version History

### Version 1 (Lab)

- Core AI expense parsing (text → JSON → DB)
- Manual entry form
- Transaction history with delete
- Spending by category chart
- Quick-entry templates
- Bilingual RU/EN UI
- Docker Compose deployment

### Version 2 (Post-lab)

- Vendor name autocorrect (fixes LLM hallucinations)
- Auto-generated default templates on first launch
- Groq API cloud fallback (no GPU needed)
- Improved UI polish and error handling
- Health checks for all services
