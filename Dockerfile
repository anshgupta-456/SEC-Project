# One image with the API and the built frontend.
#   docker build -t grievance-hub .
#   docker run -p 8000:8000 -e JWT_SECRET=... grievance-hub

# ---- 1. build the React app ----------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js eslint.config.js ./
COPY public ./public
COPY src ./src
# Same-origin API: the backend below serves both.
ENV VITE_API_URL=""
RUN npm run build

# ---- 2. Python runtime ---------------------------------------------------
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_ENV=production \
    STATIC_DIR=/app/dist \
    PORT=8000
WORKDIR /app/backend

# Set --build-arg INSTALL_ML=true to bundle the BART zero-shot classifier
# (adds PyTorch, ~1-2 GB). Without it the keyword classifier is used.
ARG INSTALL_ML=false
COPY backend/requirements.txt backend/requirements-ml.txt ./
RUN pip install -r requirements.txt \
 && if [ "$INSTALL_ML" = "true" ]; then pip install -r requirements-ml.txt; fi

COPY backend/ ./
COPY --from=frontend /app/dist /app/dist

RUN useradd --create-home --uid 10001 app \
 && mkdir -p /app/backend/instance \
 && chown -R app:app /app/backend/instance
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"8000\")}/api/health', timeout=4)"

# Apply migrations + seed committees, then serve.
CMD ["sh", "-c", "python manage.py init-db && exec gunicorn --bind 0.0.0.0:${PORT} --workers ${WEB_CONCURRENCY:-2} --threads 4 --timeout 120 --access-logfile - wsgi:app"]
