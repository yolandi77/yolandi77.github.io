import os

def generate_index_html():
    """
    Generates an index.html file in the current directory.
    This file contains hyperlinks to subdirectories that also
    contain an index.html file.
    """
    current_dir = os.getcwd()
    output_filename = "index.html"
    hyperlinks = []

    print(f"Scanning subdirectories in: {current_dir}")

    # Iterate through all items in the current directory
    for item_name in os.listdir(current_dir):
        item_path = os.path.join(current_dir, item_name)

        # Check if the item is a directory
        if os.path.isdir(item_path):
            # Exclude directories that start with a dot (e.g., .git, .vscode)
            if item_name.startswith('.'):
                print(f"Skipping hidden directory: {item_name}")
                continue

            # Check if this subdirectory contains an index.html
            subdir_index_html_path = os.path.join(item_path, "index.html")
            if os.path.exists(subdir_index_html_path):
                print(f"Found index.html in directory: {item_name}")
                # Create a hyperlink. The href should be relative to the current index.html
                hyperlinks.append(f'<li><a href="./{item_name}/index.html">{item_name}/</a></li>')
            else:
                print(f"No index.html found in directory: {item_name}")

    # Build the HTML content
    newline = '\n'
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Index</title>
    <style>
    </style>
</head>
<body>
    <h1>Index of {os.path.basename(current_dir)}</h1>
    {newline.join(['<ul>'] + hyperlinks + ['</ul>']) if hyperlinks else '<p>No subdirectories with index.html found.</p>'}
</body>
</html>
"""

    # Write the content to index.html
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\nSuccessfully generated {output_filename} in {current_dir}")
    except IOError as e:
        print(f"Error writing to file {output_filename}: {e}")

if __name__ == "__main__":
    generate_index_html()