import rasterio
# Try to import rasterio's from_bounds; provide a lightweight fallback
try:
    from rasterio.transform import from_bounds
except Exception:
    try:
        # Prefer affine if available to build a proper Affine transform
        from affine import Affine

        def from_bounds(west, south, east, north, width, height):
            xres = (east - west) / float(width)
            yres = (north - south) / float(height)
            return Affine.translation(west, north) * Affine.scale(xres, -yres)
    except Exception:
        # Minimal fallback: return a 6-tuple like (west, xres, 0, north, 0, -yres)
        def from_bounds(west, south, east, north, width, height):
            xres = (east - west) / float(width)
            yres = (north - south) / float(height)
            return (west, xres, 0, north, 0, -yres)
import numpy as np

# 1. Define geographic constraints (Singapore Bounding Box)
west, south, east, north = 103.6, 1.2, 104.1, 1.5
width, height = 512, 512  # Matrix size (keeps file size under 1MB)

# 2. Compute the affine transformation matrix (maps pixels to GPS coordinates)
transform = from_bounds(west, south, east, north, width, height)

# 3. Synthesize mock environmental temperature data using NumPy
# We create a spatial gradient to mimic an urban heat island effect (28.0°C to 36.0°C)
x = np.linspace(0, 1, width)
y = np.linspace(0, 1, height)
X, Y = np.meshgrid(x, y)
gradient = 28.0 + (X * Y * 8.0)  # Generates float array values between 28 and 36

# Convert float temperatures to unsigned 8-bit integers for lightweight storage
band1_heat = gradient.astype(np.uint8)
band2_mock = (band1_heat * 0.8).astype(np.uint8)  # Secondary index proxy
band3_mock = (band1_heat * 0.5).astype(np.uint8)  # Tertiary index proxy

# 4. Configure structural GeoTIFF metadata profile
# PathGen tracks CRS data tightly; we specify EPSG:4326 (WGS 84 longitude/latitude)
profile = {
    'driver': 'GTiff',
    'dtype': 'uint8',
    'nodata': 0,
    'width': width,
    'height': height,
    'count': 3,  # 3-band raster structure
    'crs': 'EPSG:4326',
    'transform': transform,
    'tiled': True,  # Enables internal tiling layouts characteristic of COGs
    'blockxsize': 256,
    'blockysize': 256,
    'compress': 'lzw'  # Lossless data compression
}

# 5. Write binary array blocks to disk
output_filename = "mock_cog.tif"
with rasterio.open(output_filename, 'w', **profile) as dst:
    dst.write(band1_heat, 1)
    dst.write(band2_mock, 2)
    dst.write(band3_mock, 3)

print(f"Success: Generated lightweight spatial file at './{output_filename}'")