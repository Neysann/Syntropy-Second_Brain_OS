<div align="center">

  <img src="public/logo.png" alt="Syntropy OS Logo" width="96" height="96" style="border-radius: 22px;" />

  <h1>Syntropy OS</h1>
  <p><strong>All-in-One Personal Productivity Operating System &amp; Second Brain</strong></p>
  <p><em>Engineered with the PARA Method, Hybrid Markdown/Stylus Notes, Universal Calendar Sync, and a Native Windows Desktop Runtime.</em></p>

  <p>
    <a href="https://second-brain-os-e6a83.web.app"><img src="https://img.shields.io/badge/Live_Web_App-Syntropy_OS-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" /></a>
    <a href="https://github.com/Neysann/second-brain-os/releases/latest"><img src="https://img.shields.io/badge/Desktop_App-Windows_x64-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows Desktop App" /></a>
    <a href="https://github.com/Neysann/second-brain-os/releases/latest"><img src="https://img.shields.io/badge/Release-v3.0.0-10b981?style=for-the-badge" alt="Version" /></a>
    <img src="https://img.shields.io/badge/E.V.R.I.S._AI-Integration_in_Progress-22d7e8?style=for-the-badge" alt="EVRIS AI" />
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
    <a href="#-core-features--modules">Core Features</a> •
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
- 💻 **Windows Desktop Installer (`.exe`) — Open to Everyone**: [Download v3.0.0 from GitHub Releases](https://github.com/Neysann/second-brain-os/releases/latest) *(no administrator account required)*
- 🤖 **What's New in v3.0.0**: Syntropy OS enters **v3.0** with the ongoing integration of **E.V.R.I.S.** — our local AI companion powered by a live 25×25 ARC LED Matrix Core, manual startup control, and a direct bridge to your tasks, notes, and system tools.

---

## ⚡ Core Features & Modules

### 1. 🧠 Cognitive Dashboard & Deep Work Station
- **Modular Bento Workspace**: Customizable multi-size widgets (`1×1`, `2×1`, `2×2`, `4×1`) with real-time metrics, daily priority focus, and weather integration.
- **Pomodoro & Focus Timer**: Configurable focus/break intervals, quick session presets (*Sprint 15m*, *Classic 25m*, *Deep Work 45m*, *Master 60m*), daily cycle tracking, and Web Audio completion alerts.
- **Hybrid Focus Audio Player**: Built-in ambient soundscapes and YouTube stream integration for deep work sessions.
- **Universal Command Palette (`Ctrl + K`)**: Instant keyboard-driven navigation, global search across tasks/notes/projects, and quick actions.

### 2. 🎯 PARA Projects & Task Engine
- **Complete PARA Organization**: Structure every item into **Projects** (active goals with deadlines), **Areas** (long-term responsibilities), **Resources** (reference material), and **Archives** (completed/inactive work).
- **Dual Execution Views**: Switch seamlessly between an interactive **3-column Kanban Board** (*To Do*, *In Progress*, *Done*) and a clean tabular **List View**.
- **Granular Task Control**: Hierarchical subtasks, 4-tier priority matrix (`Low`, `Medium`, `High`, `Urgent`), due dates, custom tags, and automatic project completion percentages.

### 3. 📝 Hybrid Knowledge Vault (Markdown + LaTeX + Stylus Ink)
- **2-Pane Explorer**: Permanent hierarchical folder/subfolder tree, tag filters, and smart views (*All Notes*, *Pinned*, *Handwritten*, *Unfiled*).
- **Scientific Markdown & KaTeX**: Live split/preview Markdown editor with a dedicated **LaTeX Math Toolbar (`∑ Math`)** for equations, matrices, integrals, and scientific notation, plus `.md` and `.tex` export.
- **Vector Stylus Ink Canvas**: Native pressure-sensitive handwriting engine supporting Pen, Fountain Pen, Highlighter, Pixel/Stroke Eraser, and Lasso selection, backed by compact `g1:` gzip/base64 encoding and automatic Firestore subcollection chunking for large canvases.
- **Multi-Source Image & File Embedding**: Paste screenshots directly from the clipboard (`Ctrl + V`) or drag-and-drop images/PDFs into any note with clean `![Title](attachment:id)` references and local `IndexedDB` caching.

### 4. 📅 Universal Calendar & Direct iCal Sync
- **Multi-Scale Time Blocking**: Month, week, and day views with event creation, category color-coding, and task deadline overlays.
- **Google & Apple Calendar Synchronization**: Real-time iCal / WebCal feed subscriptions powered by a native CORS-free Electron HTTP bridge, plus `.ics` file drag-and-drop import/export.

### 5. 🔥 Habit Tracker & Streak Analytics
- **Daily Rituals & Streaks**: One-click daily check-ins, active streak counters, and adherence percentages.
- **Annual Consistency Heatmap**: GitHub-inspired 365-day visual contribution grid to monitor long-term consistency.

### 6. 📚 Reading & Media Tracker
- **Library Management**: Track books, mangas, and technical readings by status (*Reading*, *To Read*, *Completed*, *Paused*).
- **Quick Progress Controls**: Instant `+1 chap`, `+5 p.`, and `+10 p.` increment buttons, progress bars, personal ratings, and reading notes.

### 7. 💰 Personal Finance & Budget Manager
- **Income & Expense Ledger**: Categorized transaction logging with monthly cashflow summaries.
- **Budget Caps & Alerts**: Set monthly spending thresholds per category with real-time visual consumption gauges and recurring subscription tracking.

### 8. 🤖 E.V.R.I.S. — Local AI Companion *(v3.0 — Integration in Progress)*
- **Interactive 25×25 ARC Core**: Live 625-LED matrix reacting dynamically to 8 states (`idle`, `listening`, `thinking`, `speaking`, `happy`, `alert`, `error`, `sleep`).
- **Companion-First Workspace**: Dedicated `/evris` interface with manual connection control (**Démarrer EVRIS**), multi-tier local model routing (`AUTO`, `FAST 4B`, `PRO 9B`, `LIMITLESS`), long-term memory drawer, and direct Syntropy OS task/note commands.

---

## 🖥️ Windows Desktop Engine

Packaged as a standalone 64-bit Windows application (`Syntropy-OS-Setup-x.x.x.exe`) via **Electron 44** and **NSIS**, the desktop runtime unlocks native OS capabilities:

- ⚡ **Global Quick Capture (`Alt + Space`)**: Summon a frameless, always-on-top floating capture window from anywhere in Windows to record a task or Markdown note (with Web Speech API voice dictation) without leaving your active application.
- 📌 **System Tray Integration**: Continues running silently in the background when closed (`Close to Tray`), providing right-click shortcuts for Pomodoro control, Top 3 daily tasks, and instant note capture.
- 🔔 **Interactive Windows Toast Notifications**: Native OS reminders with actionable buttons (*"Complete"* / *"Snooze 15m"*).
- 💾 **Local Filesystem Backup & Markdown Export**: One-click full JSON database backups (manual or scheduled on close/daily) and bulk `.md` note exports directly to a local directory on disk.
- 🔄 **Automated Updates**: Integrated `electron-updater` connected to GitHub Releases with direct browser download fallback.

---

## 🏗️ Architecture & Tech Stack

### Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16.3](https://nextjs.org/) (App Router, Static Export, Turbopack), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS 4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
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
│   │   └── settings/            # System Preferences, Desktop Controls & Admin Console
│   ├── components/              # Reusable UI components, modals & dashboard widgets
│   ├── context/                 # React contexts (Auth, Data, Settings, DailyLife, Reading)
│   ├── lib/                     # Firebase config, Firestore services, LaTeX & Ink encoders
│   └── types/                   # TypeScript interfaces & data models
├── public/                      # Static assets & application icons
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
