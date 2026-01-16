
import os
import re

directory = r'c:\Users\ASUS\OneDrive\curve'
files = [f for f in os.listdir(directory) if f.endswith('.html')]

replacements = [
    (r'X3D DENTAL', 'X3DENTAL'),
    (r'x3d dental', 'x3dental'),
]

for filename in files:
    path = os.path.join(directory, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, new_content)
    
    if new_content != content:
        print(f"Updating {filename}")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    else:
        print(f"No changes for {filename}")
