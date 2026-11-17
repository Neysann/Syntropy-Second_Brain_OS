<div align="center">

  <img src="public/logo.png" alt="Syntropy OS Logo" width="96" height="96" style="border-radius: 22px;" />

  <h1>Syntropy OS</h1>
  <p><strong>All-in-One Personal Productivity Operating System &amp; Second Brain</strong></p>
  <p><em>Engineered with the PARA Method, Hybrid Markdown/Stylus Notes, and a Native Windows Desktop Runtime.</em></p>

  <p>
    <a href="https://second-brain-os-e6a83.web.app"><img src="https://img.shields.io/badge/Live_Web_App-Syntropy_OS-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" /></a>
    <a href="https://github.com/Neysann/second-brain-os/releases/latest"><img src="https://img.shields.io/badge/Desktop_App-Windows_x64-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows Desktop App" /></a>
    <a href="https://github.com/Neysann/second-brain-os/releases/latest"><img src="https://img.shields.io/badge/Release-v2.7.5-10b981?style=for-the-badge" alt="Version" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19.2-149eca?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Electron-44-47848f?style=flat-square&logo=electron&logoColor=white" alt="Electron 44" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Firebase-12-ffca28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" />
    <a href="#-license"><img src="https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square" alt="MIT License" /></a>
  </p>

  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-core-modules">Core Modules</a> •
    <a href="#-visual-engines--themes">Visual Engines</a> •
    <a href="#%EF%B8%8F-windows-desktop-engine">Desktop Engine</a> •
    <a href="#%EF%B8%8F-architecture--tech-stack">Architecture</a> •
    <a href="#-getting-started">Getting Started</a>
  </p>

</div>

---

## 🌟 Overview

**Syntropy OS** is a unified personal productivity operating system designed to centralize knowledge management, task execution, calendar scheduling, habit tracking, reading progress, and personal finance into a single, high-performance workspace.

Grounded in Tiago Forte's **Second Brain** methodology and the **PARA framework** (*Projects, Areas, Resources, Archives*), Syntropy OS replaces fragmented tools with a cohesive Cloud + Local-First architecture available both on the Web and as a native Windows desktop application.

- 🌐 **Live Web Application**: [https://second-brain-os-e6a83.web.app](https://second-brain-os-e6a83.web.app)
- 💻 **Windows Desktop Installer (`.exe`)**: [Download from GitHub Releases](https://github.com/Neysann/second-brain-os/releases/latest)

---

## ⚡ Core Modules

| Module | Key Capabilities |
| :--- | :--- |
| **🧠 Cognitive Dashboard** | Multi-size Bento grid (`1×1`, `2×1`, `2×2`, `4×1`), adaptive greetings, daily priority matrix, **Pomodoro & Deep Work Station**, hybrid ambient/YouTube audio player, real-time weather, and productivity analytics. |
| **🎯 PARA Projects & Tasks** | Full **PARA** categorization (*Projects, Areas, Resources, Archives*), interactive **Kanban board** & tabular list views, hierarchical subtasks, priority levels (`Low` to `Urgent`), and progress tracking. |
| **📝 Hybrid Knowledge Vault** | 2-pane **Obsidian / Notion** explorer with recursive folders, **Markdown + KaTeX** scientific typesetting, **Vector Stylus Ink** canvas (pressure-sensitive pen, fountain pen, highlighter, lasso & eraser with Firestore chunking), and instant clipboard/drag-and-drop image embedding (`![Alt](attachment:id)` backed by IndexedDB). |
| **📅 Universal Calendar** | Month, week, and day time-blocking views with two-way **Google Calendar & Apple Calendar (iCal / WebCal)** synchronization powered by a native CORS-free Electron HTTP bridge and `.ics` import/export. |
| **🔥 Habit Tracker** | Daily ritual tracking, active streak counters, completion rate analytics, and a GitHub-inspired annual consistency heatmap. |
| **📚 Reading & Media Vault** | Track books, mangas, and articles with chapter/page quick-increment controls, status filters, ratings, and reading goals. |
| **💰 Personal Finance** | Income and expense ledger, customizable category breakdowns, monthly budget caps, visual alert gauges, and recurring subscription tracking. |

---

## 🎨 Visual Engines & Themes

Syntropy OS features a real-time CSS token engine with three distinct visual identities and 8 accent palettes:

### 1. Liquid Glass (iOS Glassmorphism)
- Adjustable surface translucency (`0%` to `45%`) and dynamic `backdrop-filter` blur (`0px` to `20px`) with specular borders and ambient aurora mesh gradients.
- Instant 60 FPS local preview with debounced Firestore cloud persistence.
- Supports both **Zinc Dark**, **Pure OLED Black (`#000000`)**, and **Daylight** modes.

### 2. Nothing OS Edition *(Secret Theme)*
- Inspired by Nothing Technology hardware & Glyph Interface.
- Official **NDot 57** dot-matrix typography, exposed circuit schematics, animated **Glyph LED** rings, pure OLED black surfaces, and signature Nothing crimson (`#D71920`) accents.

### 3. Cyberpunk HUD 2077 *(Secret Theme)*
- High-contrast cyberdeck interface featuring an interactive **Matrix Rain** background canvas, angled HUD corner brackets, scanline overlays, and neon `#FCEE0A` yellow / `#00F0FF` cyan telemetry styling.

---

## 🖥️ Windows Desktop Engine

Packaged as a standalone 64-bit Windows application (`Syntropy-OS-Setup-x.x.x.exe`) via **Electron 44** and **NSIS**, the desktop runtime unlocks native OS integrations:

- ⚡ **Global Quick Capture (`Alt + Space`)**: Summon a frameless, always-on-top floating capture window from anywhere in Windows (even over full-screen apps) to jot down a task or Markdown note with built-in voice dictation.
- 📌 **System Tray Integration**: Runs silently in the background when closed (`Close to Tray`), with quick context-menu actions for Pomodoro control, Top 3 daily tasks, and instant note capture.
- 🔔 **Interactive Windows Toast Notifications**: Native OS reminders with actionable buttons (*"Complete"* / *"Snooze 15m"*).
- 💾 **Local Filesystem Backup & Markdown Export**: One-click full JSON database backups and bulk `.md` file exports directly to a local directory on disk.
- 🔄 **Seamless Auto-Updates**: Built-in `electron-updater` integration connected to GitHub Releases with direct browser fallback download.

---

## 🏗️ Architecture & Tech Stack

### Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16.3](https://nextjs.org/) (App Router, Static Export, Turbopack), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS 4](https://tailwindcss.com/), CSS Custom Properties, [Lucide Icons](https://lucide.dev/) |
| **Desktop Runtime** | [Electron 44](https://www.electronjs.org/), `electron-builder` (NSIS x64), `electron-updater`, Node.js HTTP static server |
| **Backend & Sync** | [Firebase 12](https://firebase.google.com/) (Authentication, Cloud Firestore real-time sync, Firebase Hosting), IndexedDB & LocalStorage offline fallback |
| **Rich Editing** | `@uiw/react-md-editor`, [KaTeX](https://katex.org/) (LaTeX math rendering), Custom HTML5 Vector Stylus Canvas (`g1:` gzip/base64 compression), `JSZip` |

### Project Structure

```text
syntropy-os/
├── electron/
│   ├── main.js                  # Electron main process (Tray, Alt+Space shortcut, local HTTP server, IPC)
│   ├── auto-updater.js          # GitHub Releases auto-update engine
│   └── preload.js               # Context-isolated IPC bridge (window.electronAPI)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Cognitive Dashboard & Bento Grid
│   │   ├── tasks/               # PARA Projects & Tasks (Kanban & List views)
│   │   ├── notes/               # 2-Pane Hybrid Knowledge Vault (Markdown, KaTeX, Stylus Ink)
│   │   ├── calendar/            # Universal Calendar & iCal/Google sync
│   │   ├── habits/              # Habit Tracker & Annual Heatmap
│   │   ├── reading/             # Book & Manga Reading Tracker
│   │   ├── budget/              # Personal Finance & Expense Manager
│   │   ├── quick-capture/       # Frameless floating Quick Capture route (Alt+Space)
│   │   └── settings/            # System Preferences, Theme Studio & Admin Console
│   ├── components/              # Reusable UI components, modals & dashboard widgets
│   ├── context/                 # React contexts (Auth, Data, Settings, Theme, DailyLife, Reading)
│   ├── lib/                     # Firebase config, Firestore services, LaTeX & Ink encoders
│   └── types/                   # TypeScript interfaces & data models
├── public/                      # Static assets, icons & custom fonts (NDot57, NType82)
├── scripts/                     # Build, icon conversion & automated release scripts
├── electron-builder.json        # Windows NSIS installer & GitHub publish configuration
└── firebase.json                # Firebase Hosting & Cloud Firestore security rules config
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `v18.0.0` or higher
- **npm** `v9+`
- A **Firebase** project (optional — Syntropy OS automatically falls back to offline `LocalStorage` / `IndexedDB` mode if no Firebase keys are provided)

### 1. Clone the repository

```bash
git clone https://github.com/Neysann/second-brain-os.git
cd second-brain-os
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory (see `.env.example`):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run in development mode

```bash
# Web development server (http://localhost:3000)
npm run dev

# Full Desktop development (Next.js dev server + live Electron shell)
npm run dev:desktop
```

### 5. Build for production

```bash
# Build static web export into out/
npm run build

# Build standalone Windows x64 installer (.exe) into dist/
npm run build:win
```

---

## 📦 Deployment & Releases

```bash
# Deploy web build & Firestore rules to Firebase Hosting
npm run deploy

# Full automated release (Git commit, tag vX.X.X, GitHub push & Firebase deploy)
npm run release
```

---

## 📄 License

Distributed under the **MIT License**.

---

<div align="center">
  <p>Crafted by <strong>Nathan Debeaupuis</strong></p>
  <p>
    <a href="https://second-brain-os-e6a83.web.app">Live Web App</a> •
    <a href="https://github.com/Neysann/second-brain-os/releases">Desktop Releases</a> •
    <a href="https://github.com/Neysann/second-brain-os/issues">Report an Issue</a>
  </p>
</div>
