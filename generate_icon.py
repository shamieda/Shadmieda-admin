
from PIL import Image

def create_centered_icon():
    # Settings
    CANVAS_SIZE = (512, 512)
    BACKGROUND_COLOR = (0, 0, 0, 0) # Transparent
    LOGO_PATH = 'public/logo.png'
    OUTPUT_PATH = 'public/icon-pwa.png'
    PADDING_PERCENT = 0.25 # 25% padding on each side effective (50% total usage?) no, just resize logic

    try:
        # Load Logo
        logo = Image.open(LOGO_PATH).convert("RGBA")
        
        # Create Canvas
        icon = Image.new("RGBA", CANVAS_SIZE, BACKGROUND_COLOR)
        
        # Calculate target size for logo to fit nicely in center
        # We want the logo to be about 60-70% of the canvas width to be safe from rounded corners
        target_width = int(CANVAS_SIZE[0] * 0.65)
        
        # Maintain aspect ratio
        aspect_ratio = logo.height / logo.width
        target_height = int(target_width * aspect_ratio)
        
        # Resize logo
        logo_resized = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Calculate position to paste (center)
        x_pos = (CANVAS_SIZE[0] - target_width) // 2
        y_pos = (CANVAS_SIZE[1] - target_height) // 2
        
        # Paste logo onto canvas (using itself as mask for transparency)
        icon.paste(logo_resized, (x_pos, y_pos), logo_resized)
        
        # Save
        icon.save(OUTPUT_PATH)
        print(f"Successfully created {OUTPUT_PATH}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_centered_icon()
