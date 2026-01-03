# Repose - Your Serene Journaling Space

A peaceful, private journaling app built with Next.js that stores your reflections locally on your computer using the File System Access API. No backend server or database needed - your thoughts stay safe and under your control.

## ✨ Philosophy

**Repose** embodies the art of mindful reflection. With calming colors, gentle animations, and thoughtful design, every interaction is crafted to create a serene space where your thoughts can breathe.

## 🌿 Features

- 🔒 **Private & Local**: All entries stored directly on your device
- 🎨 **Serene Design**: Calming sage, sky, and lavender color palette
- 📅 **Peaceful Calendar**: Visualize your journey with mood-enhanced dates
- 😊 **Mood Tracking**: Track your emotional landscape
- 📊 **Mindful Stats**: View streaks and patterns in your practice
- ✍️ **Beautiful Editor**: Serif typography and rich formatting
- 💾 **Auto-Save**: Seamless preservation of your thoughts
- 👁️ **Reading Mode**: Book-like view for reflection
- 🔍 **Smart Search**: Find entries by title or content
- 🌸 **No Cloud**: Your words stay with you, always

## 🖥️ Browser Requirements

Repose requires the **File System Access API**, available in:
- Google Chrome (version 86+)
- Microsoft Edge (version 86+)

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge

### First Time Setup

1. Click "Select Your Journal Folder"
2. Choose a peaceful location for your entries
3. Enter your name
4. Click "Begin Your Journey"
5. Start your first reflection

### Returning to Repose

When you return:
1. Click "Select Your Journal Folder"
2. Choose your existing journal folder
3. Your name and all entries load automatically

This one-click process ensures your privacy through browser security.

## 🎨 Design Philosophy

### Visual Language
- **Soft Sage**: Primary brand color for growth and calm
- **Gentle Sky**: Peaceful blue for serenity
- **Warm Sand**: Natural, grounding accent
- **Misty Lavender**: Mindful purple for reflection

### Typography
- **Display**: Playfair Display for elegance
- **Interface**: Inter for clarity
- **Content**: Merriweather for readability

### Motion
- Gentle floating animations (6s)
- Soft transitions (300-600ms)
- Subtle breathing effects
- Peaceful, never jarring

## 📂 How It Works

### File Structure

When you select a folder, Repose creates:

```
your-journal-folder/
├── config.json                 # Your name
├── 2024-01-15.json            # Entry metadata
├── 2024-01-15.html            # Entry content
├── 2024-01-16.json
├── 2024-01-16.html
└── ...
```

### Data Storage

- **Local Files**: Each entry creates two files (JSON + HTML)
- **No Cloud**: Nothing ever sent to any server
- **Portable**: Sync your folder with Dropbox/Google Drive if desired
- **Simple**: Plain text files you can always access

## 💫 Usage

### Creating an Entry

1. Click "Create Today's Entry" or any calendar date
2. Write your title
3. Compose your thoughts in the beautiful editor
4. Select your mood
5. Your entry auto-saves every 2.5 seconds
6. Click "Done" when finished

### Reading Mode

- Existing entries open in peaceful reading mode
- Click "Edit" to make changes
- Click "Preview" to return to reading
- Book-like layout for comfortable reflection

### Finding Entries

1. Use the search bar on the dashboard
2. Search titles and full content
3. Fuzzy search handles typos gracefully
4. Click any result to open

### Deleting an Entry

1. Open the entry
2. Switch to edit mode
3. Click "Delete this entry"
4. Confirm deletion

### Your Statistics

The dashboard shows:
- **Total Entries**: Days of journaling
- **Current Streak**: Consecutive days
- **Mood Patterns**: Emotional trends
- **This Week**: Recent activity

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: React 19, TypeScript, Tailwind CSS 4
- **Editor**: Tiptap with rich formatting
- **Calendar**: react-calendar with custom styling
- **Search**: Fuse.js for fuzzy matching
- **Dates**: date-fns for formatting
- **Storage**: File System Access API

## 🎯 Design Features

- **Serene Palette**: Sage, sky, sand, and lavender
- **Gentle Animations**: Floating, breathing effects
- **Generous Spacing**: Ample whitespace for peace
- **Soft Shadows**: Subtle depth without harshness
- **Book Typography**: Serif fonts for reading comfort
- **Responsive**: Works beautifully on all screens

## 📖 Journaling Tips

### Make It a Practice
- Write at the same time each day
- Create a peaceful environment
- Take three deep breaths before beginning
- Let your thoughts flow without judgment

### Prompts for Reflection
- What am I grateful for today?
- What did I learn?
- How did I grow?
- What brought me peace?
- What challenged me?

## 🔒 Privacy & Security

- ✅ All data stored locally on your device
- ✅ No analytics or tracking
- ✅ No cloud synchronization
- ✅ No data sent to any server
- ✅ Complete control over your files
- ✅ Browser security requires folder re-selection (intentional)

## ⌨️ Keyboard Shortcuts

- **Cmd/Ctrl + S**: Manual save (while editing)
- **Cmd/Ctrl + K**: Return to dashboard
- **Enter**: Submit on input fields

## 💡 Tips

- **Backup**: Your folder contains plain files - copy anywhere
- **Sync**: Place folder in Dropbox/Google Drive for automatic backup
- **Export**: Entries are JSON and HTML - readable anywhere
- **Themes**: Light, serene colors promote peaceful reflection
- **Search**: Fuzzy search finds entries even with typos
- **Preview**: Read mode is perfect for reflection without editing

## 🌟 The Repose Experience

### For Morning Pages
- Gentle colors don't strain tired eyes
- Auto-save means no lost thoughts
- Calendar shows your consistency
- Reading mode for reviewing past mornings

### For Evening Reflection
- Peaceful interface promotes calm
- Mood tracking reveals patterns
- Search helps find related thoughts
- Week view shows your journey

### For Mindful Journaling
- No distractions - just you and your thoughts
- Beautiful typography invites deep writing
- Privacy guaranteed - nothing shared
- Serene design supports your practice

## 🏗️ Building for Production

```bash
npm run build
npm start
```

## 📝 Notes

- Folder selection required each visit (browser security)
- Same folder? Everything loads automatically
- All formatting and content preserved exactly
- Your journal folder can be anywhere on your computer
- Manual sync with cloud services supported

## 🌸 About Repose

**Repose** (noun): A state of rest, peace, or calm reflection.

This app was created with the belief that journaling should be:
- **Private**: Your thoughts are yours alone
- **Beautiful**: Design that invites reflection
- **Simple**: No complexity, just writing
- **Peaceful**: Every detail supports calm

## 📄 License

This project is open source and available under the MIT License.

---

**Repose** - Where your thoughts find peace. 🌿