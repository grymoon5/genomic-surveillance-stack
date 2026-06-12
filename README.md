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
