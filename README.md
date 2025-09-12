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

### Lokale Entwicklung

1. Repository klonen:
```bash
git clone <your-repo>
cd ai-chatbot
```

## Environment Variables

| Variable | Description |
| --- | --- |
| OPENAI_API_KEY | OpenAI API key for accessing the language model |
| SECRET_KEY | Secret key used for JWT token signing |
| FRONTEND_URL | Allowed CORS origin for the frontend |
| ACCESS_TOKEN_EXPIRE_MINUTES | (Optional) JWT lifetime in minutes, default is 60 |
| RATE_LIMIT | (Optional) Rate limit for chat endpoints, e.g. `5/minute` |
| ADMIN_USERNAME / ADMIN_PASSWORD | (Optional) Credentials for the default admin user |
| USER_USERNAME / USER_PASSWORD | (Optional) Credentials for a default regular user |
