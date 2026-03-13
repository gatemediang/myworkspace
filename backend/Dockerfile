FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libpq-dev curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY . .
# NOTE: google-credentials.json must exist at build time for Calendar integration.
# If it is not present, calendar features are silently skipped (no crash).
# On Railway, mount it via a secret file or set GOOGLE_CREDENTIALS_PATH to a
# volume-backed path and copy the file there at deploy time.

RUN mkdir -p \
    uploads/projects \
    uploads/tutorials \
    uploads/product_images \
    uploads/products \
    uploads/freebies \
    uploads/freebie_images \
    uploads/about \
    uploads/settings \
    uploads/hero_slides \
    uploads/project_sourcecode \
    uploads/certifications \
    uploads/education \
    uploads/clients

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
