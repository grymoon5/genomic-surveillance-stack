from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "ok", "service": "raster-tiles"}

@app.get("/tiles/{z}/{x}/{y}.png")
def get_tile(z: int, x: int, y: int):
    """Generate a simple mock heatmap tile without rasterio."""
    # Create a tile with a diagonal gradient from cool to hot colors
    tile_data = np.zeros((256, 256, 3), dtype=np.uint8)
    
    for i in range(256):
        for j in range(256):
            # Create gradient based on position
            value = int((i + j) / 2)
            # Blue to Red gradient
            tile_data[i, j] = [value, 100, 255 - value]
    
    # Encode as PNG
    _, img_png = cv2.imencode('.png', tile_data)
    return Response(content=img_png.tobytes(), media_type="image/png")
