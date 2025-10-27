# File: `Dockerfile`
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Installer outils de compilation nécessaires
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libssl-dev libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Mettre à jour pip/setuptools/wheel (résout les erreurs 'Cannot import setuptools.build_meta')
RUN pip install --no-cache-dir --upgrade pip setuptools wheel build

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]