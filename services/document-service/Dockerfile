FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# User creation removed to avoid volume permission issues
# RUN useradd -m -u 1000 appuser && \
# Run as root to avoid permission issues with volumes for now
# USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
