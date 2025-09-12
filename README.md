# AI Chatbot

Ein production-ready AI Chatbot mit OpenAI Integration, optimiert für Dokploy Deployment.

## Features

- 🤖 OpenAI GPT Integration (GPT-3.5/GPT-4)
- 💬 Streaming Responses
- 🔒 Sicherheits-Features (Rate Limiting, Input Validation)
- 📱 Responsive Design
- 🚀 Docker-ready für Dokploy
- ⚡ FastAPI Backend
- 🎨 Modernes UI

## Quick Start

### Entwicklung

1. Repository klonen:

```bash
git clone <your-repo>
cd ai-chatbot
```

2. OpenAI API Key setzen:

```bash
export OPENAI_API_KEY=dein_schluessel
```

3. Container mit Hot-Reload starten:

```bash
docker compose -f docker-compose.dev.yml up --build
```

### Produktion

1. Container im Hintergrund bauen und starten:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

2. Die Anwendung ist unter http://localhost:8000 erreichbar.

## Manuelles Build

Das Image kann auch ohne Compose gebaut werden:

```bash
docker build -t ai-chatbot .
docker run -p 8000:8000 -e OPENAI_API_KEY=dein_schluessel ai-chatbot
```

Die Datei `.dockerignore` sorgt dafür, dass unnötige Dateien nicht in den Build-Kontext gelangen.
