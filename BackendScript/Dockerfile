# File: `Dockerfile`
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Dépendances système sans libatlas-base-dev
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc gfortran pkg-config \
    libopenblas-dev liblapack-dev libblas-dev \
    libjpeg-dev zlib1g-dev libpng-dev libtiff-dev \
    libgl1 libglib2.0-0 libx11-6 libsm6 libxext6 \
    libssl-dev libffi-dev python3-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Mettre à jour l'outillage pip/setuptools/wheel/build
RUN pip install --no-cache-dir --upgrade pip setuptools wheel build

# Préinstaller une version numpy fournissant une roue pour CPython 3.12
RUN pip install --no-cache-dir "numpy>=1.25"

# Installer le reste des dépendances
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]