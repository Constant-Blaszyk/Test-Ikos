import imagehash
from PIL import Image

def images_identiques(image1_path, image2_path):
    hash1 = imagehash.average_hash(Image.open(image1_path))
    hash2 = imagehash.average_hash(Image.open(image2_path))
    
    # Compare les hachages
    return hash1 == hash2

# Exemple d'utilisation
print(images_identiques("image\\Capture1.png", "image\\Capture2.png"))
