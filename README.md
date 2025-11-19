# Audit Management System (Microservices)

Ein modernes, skalierbares Audit-Management-System mit AI-gestützter Dokumentenanalyse (RAG).

## Architektur

Das System basiert auf einer Microservices-Architektur:

- **Frontend**: React (Vite) SPA mit TailwindCSS.
- **Audit Service**: FastAPI Service für Audit-Verwaltung (CRUD).
- **Document Service**: FastAPI Service für Dokumenten-Upload und Vektorisierung (Weaviate).
- **AI Service**: FastAPI Service für RAG-Chat (OpenAI Integration).
- **Datenbanken**: PostgreSQL (Audits), Weaviate (Vektoren).

## Deployment (Dokploy)

Das Projekt ist für das Deployment mit Dokploy optimiert.

### Voraussetzungen

- Ein Dokploy Server.
- OpenAI API Key.

### Setup

1.  Repository in Dokploy verbinden.
2.  `docker-compose.yml` als Deployment-Methode wählen.
3.  Environment Variables in Dokploy setzen:
    ```
    OPENAI_API_KEY=sk-...
    ```
4.  Deployen!

## Lokale Entwicklung

1.  Repository klonen.
2.  `.env` Datei erstellen (siehe `.env.example`).
3.  Starten:
    ```bash
    docker-compose up --build
    ```
4.  Frontend: http://localhost:3000
