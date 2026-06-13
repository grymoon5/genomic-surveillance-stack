# Genomic Surveillance Stack

A working prototype for live genomic surveillance alerts on a map.

The stack has three services:

- `backend-service`: Express + WebSocket + DuckDB API for case ingestion and logs
- `raster-service`: FastAPI mock raster tile server for map overlay tiles
- `frontend`: MapLibre GL JS interface with live alerts, case points, heatmap, and demo controls

## What The Prototype Does

- Shows a Singapore-centered MapLibre map
- Loads recent case records from the backend
- Displays case locations as points and a heatmap
- Shows a mock raster overlay from the raster tile service
- Connects to the backend over WebSocket for live updates
- Lets you add simulated cases from the browser with the `Add case` button
- Stores alert records in a local DuckDB database

## Local Quick Start

Run each service in a separate PowerShell terminal.

### 1. Start The Raster Service

```powershell
cd "c:\Users\aishwarya\OneDrive\Documents\genomic surveillance\genomic-surveillance-stack\raster-service"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Start The Backend Service

```powershell
cd "c:\Users\aishwarya\OneDrive\Documents\genomic surveillance\genomic-surveillance-stack\backend-service"
npm install
npm run dev
```

### 3. Serve The Frontend

```powershell
cd "c:\Users\aishwarya\OneDrive\Documents\genomic surveillance\genomic-surveillance-stack\frontend"
python -m http.server 8080
```

### 4. Open The App

Open:

```text
http://localhost:8080
```

The status indicator should change to `Live backend connected`. Choose a case type and click `Add case` to create a new simulated alert.

## Service URLs

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:3000/`
- Backend logs: `http://localhost:3000/api/logs`
- Backend alert ingestion: `POST http://localhost:3000/api/alerts`
- Raster health: `http://localhost:8000/`
- Raster tile example: `http://localhost:8000/tiles/11/1614/1012.png`

## API Examples

Create a case:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:3000/api/alerts `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"id":"demo-1","case_type":"dengue","lng":103.8298,"lat":1.3621}'
```

Read recent cases:

```powershell
Invoke-RestMethod http://localhost:3000/api/logs
```

Check backend health:

```powershell
Invoke-RestMethod http://localhost:3000/
```

## Vercel Deployment

The frontend can be deployed directly to Vercel, but the backend and raster services are stateful and require separate hosting.

1. Install the Vercel CLI or use the Vercel dashboard.
2. Create a new Vercel project from this repository.
3. Use the project root as the source and keep the default settings.
4. The `vercel.json` file routes the site from `frontend/` to the root URL.
5. After deployment, update `frontend/index.html`/`app.js` to point `API_BASE`, `WS_URL`, and `RASTER_TILE_URL` at your hosted backend and raster services.

> Note: Vercel does not support this repository’s backend WebSocket server or Python raster service as a single multi-container app. Those services must be hosted elsewhere and then referenced by the frontend.

## Render Deployment (backend + raster)

You can host both the `backend-service` and `raster-service` on Render using Docker. This repository includes a `render.yaml` manifest that describes two web services (Docker-based). To deploy:

1. Push your repository to GitHub (see the `scripts/push-to-github.sh` helper).
2. Open the Render dashboard and create a new service by connecting your GitHub repo. Choose "Deploy from render.yaml" (Render will detect `render.yaml`).
3. If you prefer the UI, create two services:
  - Service `genomic-backend`: Docker, build from `backend-service/`, port `3000`, start command `node dist/index.js`.
  - Service `genomic-raster`: Docker, build from `raster-service/`, port `8000`, start command `uvicorn main:app --host 0.0.0.0 --port 8000`.
4. After services are live, note their public URLs and update `frontend/index.html` or runtime `APP_CONFIG` with `API_BASE`, `WS_URL`, and `RASTER_TILE_URL` pointing to those URLs.

Security note: If you expose the DuckDB file (`backend-service/data.duckdb`) make sure you understand data persistence and backups. Consider using a managed database if you need durability across deployments.


## Docker Compose

If Docker is available, run from the project root:

```powershell
cd "c:\Users\aishwarya\OneDrive\Documents\genomic surveillance\genomic-surveillance-stack"
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

## Project Structure

```text
genomic-surveillance-stack/
  backend-service/
    src/
      db.ts
      index.ts
    Dockerfile
    package.json
    tsconfig.json
  frontend/
    index.html
    app.js
  raster-service/
    main.py
    requirements.txt
    Dockerfile
  docker-compose.yml
```

## Troubleshooting

If the frontend loads but says the backend is disconnected, check that the backend is running on port `3000`.

```powershell
Invoke-RestMethod http://localhost:3000/
```

If the map loads but the raster overlay is missing, check the raster service on port `8000`.

```powershell
Invoke-RestMethod http://localhost:8000/
```

If a port is already in use, find the process:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Get-NetTCPConnection -LocalPort 8000 -State Listen
Get-NetTCPConnection -LocalPort 8080 -State Listen
```

## Notes

- The frontend currently expects the backend at `localhost:3000` and raster service at `localhost:8000`.
- If you change ports, update `frontend/app.js`.
- Case data is stored in `backend-service/data.duckdb`.
- The raster service generates mock PNG tiles dynamically; it does not require a real COG file for the current prototype.
