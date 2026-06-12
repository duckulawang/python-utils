[中文版 / Chinese](./README_zh.md)
# Raw Selector

> **Origin of the name:** This tool was born out of a real-world photography headache. After a photoshoot, the client or friend would pick their favorite shots from a bunch of JPG previews and ask for a polished edit (either by sending me a list of filenames or the JPGs themselves). I then had to manually dig out the corresponding massive RAW files from thousands of photos. Picking them one by one is a nightmare, especially when dealing with hundreds of selections. So, I built this handy little script. While it was initially designed for images, it strictly searches by filename and doesn't limit extensions. Therefore, it can handle **any file type**—text, videos, archives, PDFs, you name it.

A lightweight desktop utility designed to **bulk move files** from a source folder to a destination folder based on reference criteria.

It supports two filtering methods:

1. **Text Filtering**: Paste a list of filenames into the text box (one per line), and the app will automatically select those files from the source folder.
2. **Folder Filtering**: Select a reference folder. The app reads the **base filenames (excluding extensions)** of all files inside it, and then automatically selects the matching files in the source folder, regardless of their extensions.

## Use Cases

* Quickly select and move files of different formats that share the same name based on a smaller reference set (e.g., a curated folder of preview images).
* Bulk move files according to a manually organized checklist of filenames.
* **The classic scenario:** Bulk extracting corresponding RAW files from thousands of photos based on a handful of pre-selected JPG previews.

## Features

* **Move Mode** (Files are moved to the destination folder; they are not kept in the source location).
* User-friendly Graphical User Interface (GUI)—all paths can be selected via native file dialog buttons.
* Flexible Filtering:
* **Text Mode**: Input filenames (one per line, with or without extensions) into the text box and click "Filter by Text". The app will automatically highlight the matching files in the list below.
* **Folder Mode**: Click "Filter by Folder" and pick a reference directory. The app extracts the **base filenames (excluding extensions)** of everything inside and selects all matching names in the source list.


* The file list displays the base filenames of all files in the source directory, supporting multi-select (allowing you to manually fine-tune your selection).
* Real-time log display (keeps up to 10 latest logs).
* The file list automatically refreshes after the moving process is complete.

## Installation & Usage

### Prerequisites

* Python 3.6+
* **Dependencies**: Built entirely using the Python Standard Library (`tkinter`, `os`, `time`). No external packages required.

### Steps

1. Clone or download this repository.
2. Run the following command in your terminal:
```bash
python raw_selector.py

```



## How to Use

1. Click **"Select Source Folder"** to choose the folder containing your original files.
2. Click **"Select Destination Folder"** to choose where you want to move the selected files.
3. **Filter your files** (Choose one):
* **Filter by Folder**: Click the button, select a reference folder, and the program will automatically select all files in the source folder that share the same name (ignoring extensions).
* **Filter by Text**: Type or paste filenames (one per line) into the text box below, then click the button to auto-select matching files.


4. If needed, you can manually adjust the selection in the file list (supports standard Ctrl/Shift multi-select).
5. Click **"Move Files"** to transfer the selected files from the source to the destination folder.
6. Once done, the file list will refresh, and the action will be recorded in the live log area.

## FAQ

**Q: Why is it called "Raw Selector" if it supports any file type?** A: The tool was originally tailored for photographers (matching RAW files from selected JPG previews), hence the name. However, the core logic matches the "base filename" without relying on extensions, making it perfectly capable of handling any file type.

**Q: Are the original files kept after moving?** A: No. The script uses `os.rename` to perform the move, which behaves like a "Cut & Paste" operation. Please double-check your destination folder to prevent accidental data loss.

**Q: Does Folder Mode read every single file in the reference directory?** A: Yes, it reads the base filenames of all files in that folder. If you only want to use specific file types as a reference, you should manually filter the contents of that reference folder first.

**Q: Does the filename matching include extensions?** A: No. The program only compares the base filename. For example, a reference file named `photo.jpg` will match `photo.raw`, `photo.NEF`, `photo.mp4`, `photo.txt`, etc., in the source folder.

**Q: What happens if a file with the same name already exists in the destination folder?** A: On Windows, `os.rename` will throw an error if the target file already exists. The script does not currently include special error handling for this, so it is recommended to ensure the destination folder is empty or free of conflicting filenames beforehand.

## License

MIT License

## Contributing

Issues and Pull Requests are always welcome!
