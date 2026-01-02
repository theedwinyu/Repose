# My Journal - Personal Journal App

A sleek, dark-mode journal application built with Next.js that stores entries locally on your computer using the File System Access API. No backend server or database needed - your data stays private and under your control.

## Features

- 📔 **Local Storage**: All journal entries are stored directly on your computer
- 🎨 **Dark Mode**: Beautiful, easy-on-the-eyes dark interface
- 📅 **Calendar View**: Visualize your journaling journey with a mood-enhanced calendar
- 😊 **Mood Tracking**: Track your emotional state with each entry
- 📊 **Statistics**: View your journaling stats including streaks and mood counts
- ✍️ **Rich Text Editor**: Full-featured editor with formatting options
- 🔒 **Privacy-First**: No cloud sync, no data collection - everything stays on your device

## Browser Requirements

This app requires the **File System Access API**, which is currently only available in:
- Google Chrome (version 86+)
- Microsoft Edge (version 86+)

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge

### First Time Setup

1. Click "Select Journal Folder" to choose where your journal entries will be stored
2. Enter your name
3. Click "Start Journaling"
4. Begin writing your first entry!

## How It Works

### File Structure

When you select a folder, the app creates the following files:
```
your-journal-folder/
├── config.json                 # Stores your name
├── 2024-01-15.json            # Entry metadata (title, mood, timestamp)
├── 2024-01-15.html            # Entry content (rich text HTML)
├── 2024-01-16.json
├── 2024-01-16.html
└── ...
```

### Data Storage

- **Local Files**: Each journal entry creates two files - a JSON file for metadata and an HTML file for content
- **IndexedDB**: The folder handle is stored in your browser's IndexedDB so you don't have to re-select the folder each time
- **No Cloud**: Nothing is sent to any server - everything stays on your device

## Usage

### Writing an Entry

1. From the dashboard, click "Write Today's Entry" or click any date on the calendar
2. Enter a title for your entry
3. Write your thoughts in the rich text editor
4. Select your mood (Happy, Neutral, or Sad)
5. Click "Save Entry"

### Editing an Entry

1. Click on any existing entry from the calendar or recent entries list
2. Make your changes
3. Click "Save Entry"

### Deleting an Entry

1. Open the entry you want to delete
2. Click "Delete this entry" at the bottom
3. Confirm the deletion

### Statistics

The dashboard shows:
- **Days Journaled**: Total number of entries
- **Day Streak**: Consecutive days you've journaled
- **Mood Counts**: Distribution of your moods (Happy, Neutral, Sad)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: React 19, TypeScript, Tailwind CSS 4
- **Rich Text**: Tiptap with StarterKit
- **Calendar**: react-calendar
- **Dates**: date-fns
- **Storage**: File System Access API + idb-keyval

## Building for Production
```bash
npm run build
npm start
```

## Notes

- The app requires permission to read and write files in your selected folder
- Permissions are requested each time you open the app (browser security feature)
- Your journal folder can be anywhere on your computer
- You can sync your journal folder with cloud storage services (Dropbox, Google Drive, etc.) if desired

## Privacy & Security

- ✅ All data stored locally on your device
- ✅ No analytics or tracking
- ✅ No cloud synchronization
- ✅ No data sent to any server
- ✅ You have complete control over your journal files

## License

This project is open source and available under the MIT License.