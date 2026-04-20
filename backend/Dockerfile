FROM python:3.12-slim

WORKDIR /app

# Install system deps for WeasyPrint + build tools
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libffi-dev \
    libcairo2 \
    libcairo2-dev \
    pkg-config \
    libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Remove build tools to shrink image
RUN apt-get purge -y --auto-remove build-essential python3-dev libcairo2-dev pkg-config

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
