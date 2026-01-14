
from PIL import Image

def generate_optimized_favicon():
    try:
        # Load the original logo
        logo = Image.open('public/logo.png').convert("RGBA")
        
        # We want to create a favicon that uses the maximum available space
        # Since standard favicons are square, but our logo is rectangular,
        # we will fit it by width (or height) to be as large as possible.
        
        # Create a generic large square canvas first to do the resizing cleanly
        base_size = 256
        icon = Image.new("RGBA", (base_size, base_size), (0, 0, 0, 0))
        
        # Calculate resize dimensions to maximize size (no padding like PWA)
        # We leave a tiny 5% margin just so it doesn't touch the absolute edge, 
        # or we can go 100% if the user wants "bigger". Let's do 95%.
        target_width = int(base_size * 0.95)
        aspect_ratio = logo.height / logo.width
        target_height = int(target_width * aspect_ratio)
        
        # Resize logo
        logo_resized = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Center it
        x_pos = (base_size - target_width) // 2
        y_pos = (base_size - target_height) // 2
        
        icon.paste(logo_resized, (x_pos, y_pos), logo_resized)
        
        # Save as ICO with multiple sizes
        # 16, 32, 48 are standard. 64 and 128 for higher DPI.
        icon.save('app/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        print("Successfully created optimized app/favicon.ico")
        
    except Exception as e:
        print(f"Error generating favicon: {e}")

if __name__ == "__main__":
    generate_optimized_favicon()
