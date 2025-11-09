# Deployment Guide für Dokploy

## Bad Gateway Fehler beheben

Falls du einen "Bad Gateway" Fehler siehst, überprüfe folgende Punkte:

### 1. Umgebungsvariablen in Dokploy setzen

**PFLICHT:**
- `OPENAI_API_KEY`: Dein OpenAI API Key
- `ENVIRONMENT`: Setze auf `production`

**Optional:**
- `PINECONE_API_KEY`: Falls du Pinecone für erweiterte RAG-Funktionalität nutzen möchtest
- `PINECONE_ENVIRONMENT`: Pinecone Environment
- `PINECONE_INDEX_NAME`: Name des Pinecone Index (Standard: `audit-doc-index`)

### 2. Port-Konfiguration

Die Anwendung läuft auf **Port 8000**. Stelle sicher, dass Dokploy den Container-Port 8000 exponiert.

### 3. Health Check

Die Anwendung hat einen Health Check Endpoint:
```
GET /api/health
```

Dieser sollte folgende Antwort zurückgeben:
```json
{
  "status": "ok",
  "database": "ok",
  "service": "Audit AI Chatbot"
}
```

### 4. Logs überprüfen

In Dokploy kannst du die Container-Logs einsehen. Achte auf:
- "Starting application initialization..."
- "Database initialized successfully"
- "API routes registered"
- "Frontend mounted from /frontend"
- "Application initialization completed successfully"

Falls Fehler auftreten, siehst du diese in den Logs.

### 5. Volumes

Die Anwendung benötigt ein Volume für persistente Daten:
- `/app/data` - für SQLite Datenbank und Uploads

### 6. Typische Probleme

**Problem: "Bad Gateway"**
- Lösung: Überprüfe, ob `OPENAI_API_KEY` gesetzt ist
- Lösung: Überprüfe die Logs auf Fehler beim Start
- Lösung: Stelle sicher, dass Port 8000 korrekt gemappt ist

**Problem: "CORS Error"**
- Lösung: Die App erlaubt jetzt alle Origins in Production
- Falls nötig, kann dies in `backend/app/main.py` eingeschränkt werden

**Problem: "Database Error"**
- Lösung: Stelle sicher, dass das Volume für `/app/data` gemountet ist
- Die Datenbank wird automatisch beim ersten Start erstellt

## Deployment-Schritte in Dokploy

1. **Neues Projekt erstellen** oder bestehendes auswählen
2. **GitHub Repository** verbinden
3. **Umgebungsvariablen** setzen (siehe oben)
4. **Build-Konfiguration:**
   - Dockerfile: `./Dockerfile` (im Root)
   - Context: `.`
5. **Port-Mapping:** `8000:8000`
6. **Volume:** `/app/data` mounten
7. **Deploy** starten

## Nach dem Deployment

1. Öffne die URL in deinem Browser
2. Du solltest das Frontend sehen
3. API ist verfügbar unter `https://deine-domain.com/api/`
4. Health Check: `https://deine-domain.com/api/health`

## Troubleshooting

Falls Probleme auftreten:

1. **Logs überprüfen** in Dokploy
2. **Health Check** aufrufen: `/api/health`
3. **Container neu starten**
4. **Umgebungsvariablen** nochmal überprüfen

Bei weiteren Problemen, erstelle ein Issue im Repository.
