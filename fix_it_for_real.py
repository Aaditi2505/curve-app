
import os
import re

directory = r'c:\Users\ASUS\OneDrive\curve'
files = [f for f in os.listdir(directory) if f.endswith('.html')]

target = "x3dental"

# Use case-insensitive search for these strings
# and replace with "x3dental"
patterns = [
    r'X3D\s+DENTAL', # match X3D DENTAL with any amount of whitespace
    r'X3DENTAL',
    r'CURVE'
]

for filename in files:
    path = os.path.join(directory, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for p in patterns:
        new_content = re.sub(p, target, new_content, flags=re.IGNORECASE)
    
    if new_content != content:
        print(f"Updating {filename}")
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(new_content)
    else:
        print(f"No changes for {filename}")
