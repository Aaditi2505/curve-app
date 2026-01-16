
import os
import re

directory = r'c:\Users\ASUS\OneDrive\curve'
files = [f for f in os.listdir(directory) if f.endswith('.html')]

# We want "x3dental" (lowercase) everywhere as per user's last message
target = "x3dental"

# Patterns to find and replace
patterns = [
    r'X3D DENTAL',
    r'X3D DENTAL',
    r'X3DENTAL',
    r'CURVE',
    r'Curve'
]

for filename in files:
    path = os.path.join(directory, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    # Replace the title specifically to be exactly what user wants or similar
    # If the user says "it is x3dental", maybe he wants lowercase?
    # Usually titles are capitalized, but I will go with exactly what he typed if he insists.
    # However, "x3dental" looks like a brand ID. 
    # Let's try replacing all these variations with "x3dental".
    
    for p in patterns:
        new_content = re.sub(p, target, new_content, flags=re.IGNORECASE)
    
    if new_content != content:
        print(f"Updating {filename}")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    else:
        print(f"No changes for {filename}")
