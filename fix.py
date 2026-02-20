import os
import re

directories_to_ignore = ['.git', 'node_modules', 'dist', '__pycache__']
files_to_ignore = ['package-lock.json', 'rename2.py', 'spider-logo.png', 'spider-bg-logo.png', 'fix.py'] # Don't touch binary images

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
            
        new_content = re.sub(r'(?i)\bthe\s+thewebspider\b', 'TheWebspider', content)
        new_content = re.sub(r'\bThethewebspider\b', 'TheWebspider', new_content)
        new_content = re.sub(r'\bthethewebspider\b', 'thewebspider', new_content)
        new_content = re.sub(r'\bTheTheWebspider\b', 'TheWebspider', new_content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f"Fixed {filepath}")
    except Exception as e:
        pass 

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__)))
    print(f"Scanning {root_dir}...")
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prevent searching in ignored directories
        dirnames[:] = [d for d in dirnames if d not in directories_to_ignore]
        
        for filename in filenames:
            if filename in files_to_ignore or filename.endswith('.png') or filename.endswith('.jpg') or filename.endswith('.ico') or filename.endswith('.pyc'):
                continue
            filepath = os.path.join(dirpath, filename)
            replace_in_file(filepath)

if __name__ == "__main__":
    main()
