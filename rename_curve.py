
import os
import re

directory = r'c:\Users\ASUS\OneDrive\curve'
files = [f for f in os.listdir(directory) if f.endswith('.html')]

replacements = [
    (r'\| CURVE</title>', '| X3D DENTAL</title>'),
    (r'CURVE \|', 'X3D DENTAL |'),
    (r'CURVE -', 'X3D DENTAL -'),
    (r'alt="Curve Logo"', 'alt="X3D DENTAL Logo"'),
    (r'alt="Curve"', 'alt="X3D DENTAL"'),
    (r'>Curve</span>', '>X3D DENTAL</span>'),
    (r'At CURVE,', 'At X3D DENTAL,'),
    (r'Welcome to <span id="welcome-branch-display">Curve</span>', 'Welcome to <span id="welcome-branch-display">X3D DENTAL</span>'), # specific dashboard one
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
