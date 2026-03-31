# Changelog

All notable changes to **BankOffer AI** are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [BETA_RC_1.0.0] — 2026-03-31

This release marks the first runnable end-to-end milestone of the BankOffer AI platform.  
The entire stack (API, worker, frontend, infra services) is deployable locally with a single script or via the self-hosted GitHub Actions runner.

### Breaking Changes

> Upgrading from any prior commit requires the following manual steps.

#### Frontend — Complete redesign (agent-facing tool)
- The application is now the **Customer Offer Center**, an **internal banking agent tool**, not a customer-facing app.
- `Dashboard.tsx` — full rewrite. Previous single-page layout is replaced by a **two-panel layout** (220 px customer sidebar + content area). If you have custom overrides of the old dashboard, they are incompatible.
- `login.tsx` — auth is now branded as **Agent Sign In**. The `customer_id` field is relabelled "Agent ID". The underlying `/api/auth/token?customer_id=` endpoint is unchanged.
- `_app.tsx` — now imports `src/styles/globals.css` which defines all CSS custom properties (`--color-primary`, `--color-accent`, etc.). Removing this import will break the visual theme entirely.
- Old Tailwind utility classes for brand colours (e.g. `bg-blue-600`) have been replaced by inline `style` props referencing CSS variables. Tailwind is now used for layout only.

#### Services — Network aliases mandatory
- The `api` container **must** be started with `--hostname api --network-alias api`.  
  The `worker` container **must** be started with `--hostname worker --network-alias worker`.  
  Without these aliases, inter-service DNS resolution fails. `docker-compose up` (v2) handles this automatically; `docker run` requires the flags explicitly.

#### Database — `customer_profiles` schema mismatch
- The SQL query `SELECT data FROM customer_profiles WHERE customer_id = :cid` in `routers/offers.py` is **not compatible** with the current `init.sql` schema (the table has no `data` column).  
  **Workaround for local dev:** seed customer profiles directly into Redis. The `_fetch_customer_profile` function checks Redis first. Demo seed command is in the Quick Start section of README.md.

#### Worker — Scoring fallback changed
- When the Anthropic API is unavailable or returns an error, the fallback now uses **rule-based signal matching** instead of returning zero scores.  
  Zero scores caused the ranker to return 0 offers (all products were below the `MIN_RELEVANCE_THRESHOLD = 0.10` filter). The new fallback assigns a base relevance of `0.30` + `0.20` per matching signal, ensuring at least 5 offers are always returned.

#### API — New models added
- `WebhookPayload` and `Transaction` Pydantic models added to `services/api/models/__init__.py`.  
  Previously missing, which caused `ImportError` on startup and prevented the API from running.

#### Docker — Build context must be repo root
- All service `Dockerfile`s (`services/api`, `services/worker`, `services/notification`) use `COPY . /app/` and reference paths like `COPY services/api/requirements.txt .`.  
  The build context **must be the repository root**, not the service subdirectory.  
  Correct: `docker build -f services/api/Dockerfile .`  
  Incorrect: `docker build services/api/`  
  The CI `docker-build` job has been updated accordingly.

---

### Added

- **`GET /health`** — health endpoint on both API (`:8000`) and Worker (`:8001`).
- **`POST /auth/token?customer_id=`** — demo JWT endpoint for local development.
- **`POST /score-and-rank`** — Worker HTTP endpoint; previously the worker ran as a Kafka consumer only.
- **Rule-based offer scoring fallback** in `services/worker/scorer.py`.
- **CSS design token system** (`src/styles/globals.css`) — all brand colours as CSS custom properties.
- **Customer sidebar** with 5 mock profiles (avatars, segment badge, match score).
- **Spending pattern panel** — horizontal bar chart with signal-proportional bar widths and decreasing blue opacity by rank.
- **Offer recommendation cards** — TOP PICK / GOOD FIT / CONSIDER quality badges, 2 × 2 grid, Send button per card.
- **`.env.example`** — documents all required environment variables.
- **`.github/runner-image/Dockerfile`** — reproducible CI/CD runner image with Docker, Python 3.11, Node.js 20.
- **`.github/workflows/build-runner-image.yaml`** — builds and pushes the runner image to GHCR on changes.
- **`.github/workflows/local-deploy.yaml`** — self-hosted runner workflow: builds all images and re-deploys the full stack on every push to `main`.

### Fixed

- `docker-compose` v1.29.2 `ContainerConfig` KeyError when recreating containers — worked around by using `docker run` with explicit network aliases in the local deploy script.
- Frontend proxy (`/api/*` → `http://api:8000`) — `API_URL` env var is now passed to the frontend container so rewrites resolve correctly inside Docker.
- Kafka `depends_on` for `api`, `worker`, `notification` changed from `service_healthy` to `service_started` to avoid indefinite startup hangs when Kafka health-check script is unavailable.
- Worker container now starts as an HTTP server (`uvicorn … --port 8001`) rather than as a bare Kafka consumer.

### Known Limitations

- The `customer_profiles` DB table schema does not match the `CustomerProfile` Pydantic model. Profiles must be seeded via Redis for the demo to work (see Quick Start).
- Anthropic API calls in the worker require a funded API key. Without credits, the rule-based fallback is used automatically.
- `docker-compose` v1.29.2 on Ubuntu cannot recreate containers after image updates. The `local-deploy.yaml` workflow uses `docker run` directly to work around this.
- The `notification` service currently restarts on startup due to missing Kafka topic bootstrap. This does not affect the offer API or frontend.
