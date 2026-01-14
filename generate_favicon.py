
from PIL import Image

def generate_favicon():
    try:
        # Load the padded icon we made (better for square favicons)
        img = Image.open('public/icon-pwa.png')
        
        # Save as ICO (containing multiple sizes)
        img.save('app/favicon.ico', format='ICO', sizes=[(32, 32), (16, 16), (48, 48), (64, 64)])
        print("Successfully created app/favicon.ico")
        
    except Exception as e:
        print(f"Error generating favicon: {e}")

if __name__ == "__main__":
    generate_favicon()
