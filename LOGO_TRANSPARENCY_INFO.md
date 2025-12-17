# Logo Transparency Solution

## Current Issue
The logo has a white background in the JPG file, which doesn't blend seamlessly with the page.

## Best Solution (Recommended)
Replace `assets/logo curve.jpg` with a PNG version that has a transparent background.

### How to create a transparent PNG:
1. Open the logo in an image editor (Photoshop, GIMP, Canva, etc.)
2. Remove the white background
3. Export as PNG with transparency
4. Save as `logo curve.png`
5. Update the HTML to use the PNG version

## Current CSS Workaround
I've applied `mix-blend-mode: multiply` which removes most of the white, but it's not perfect.

For best results, please provide a PNG logo with transparent background.
