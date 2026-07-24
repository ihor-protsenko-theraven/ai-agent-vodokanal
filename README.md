# 💧 Vodokanal WSN — AI Dispatcher (Operator Workstation)

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)
![Vite](https://img.shields.io/badge/Vite-5.2-646CFF.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)
![Gemini AI](https://img.shields.io/badge/Google_Gemini-1.5_/_2.5-4285F4.svg)
![WSN Class](https://img.shields.io/badge/WSN_Class-27772-orange.svg)

An intelligent Automated Operator Workstation (ARM) for municipal Water Supply Network (Vodokanal) dispatchers. Designed to automate call intake, transcript extraction, geocoding, duplicate checking, and ticket registration for emergency and informational requests using **Google Gemini AI**.

---

## 🎯 Purpose

The system is designed to reduce dispatcher workload during peak call volumes. The AI agent automatically analyzes call transcripts or audio dictation from citizens, extracts structured data (incident address, ticket type, caller details, contact phone, geocoordinates), calculates field-level confidence scores, and checks for active duplicates in the WSN database.

---

## ✨ Key Features

- **🤖 AI Transcript Parsing (Google Gemini API)**:
  - Automatically structures unstructured voice or text transcripts into the official WSN schema (Classification `27772`).
  - Calculates confidence scores ($0–100\%$) for each extracted attribute and an overall score.
  - Visual color coding for field confidence (Green $\ge 85\%$, Yellow $70–84\%$, Red $< 70\%$).

- **🗺️ Automated Geocoding (OpenStreetMap / Nominatim)**:
  - Converts extracted street addresses into geographical coordinates (Latitude, Longitude).
  - Supports reverse geocoding and fallback default coordinates.

- **🔍 Duplicate Detection**:
  - Automatically checks active database records within geographic proximity for matching incident types.
  - Interactive confirmation modal displaying duplicate details (Ticket ID, creation timestamp, status).

- **🎙️ Voice Dictation (Web Speech API)**:
  - Real-time speech-to-text dictation directly from the operator's microphone (Ukrainian `uk-UA` support).

- **⚡ Pre-loaded Demo Scenarios**:
  - **Scenario 1 (Pipe Burst / High Confidence)**: Complete details extracted, ready for instant registration.
  - **Scenario 2 (Duplicate Ticket)**: Detects an existing active emergency ticket at the same location.
  - **Scenario 3 (Damaged Manhole / Low Confidence)**: Vague location requiring operator clarification.
  - **Scenario 4 (Tariff Consultation)**: Informational inquiry requiring no field dispatch team.

- **🔐 Authentication & Role Management**:
  - Role-based access: `Chief Dispatcher (Admin)` and `ARM Operator`.
  - Dynamic in-app Gemini API Key configuration.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Language** | [TypeScript 5.4](https://www.typescriptlang.org/) (Strict Mode) |
| **Bundler & Dev Server** | [Vite 5.2](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS 3.4](https://tailwindcss.com/) + PostCSS |
| **AI Model** | [Google Gemini 1.5 / 2.5 Flash](https://ai.google.dev/) |
| **Geocoding API** | [OpenStreetMap Nominatim API](https://nominatim.openstreetmap.org/) |
| **Speech Recognition** | Web Speech API (`SpeechRecognition`) |

---

## 📁 Project Structure

```
ai-agent-vodokanal/
├── public/
│   └── assets/
│       └── scenarios/            # Text files for test call scenarios
├── src/
│   ├── components/               # Modular UI components
│   │   ├── DuplicateModal.ts     # Duplicate ticket warning modal
│   │   ├── Header.ts             # Application header (status, scenarios, API key)
│   │   ├── LoginPage.ts          # Operator login form
│   │   ├── SubmissionToast.ts    # Success/cancellation toast notifications
│   │   ├── TicketFormPanel.ts    # WSN Class 27772 ticket creation form
│   │   └── TranscriptPanel.ts    # Audio transcript & voice dictation panel
│   ├── config/
│   │   └── constants.ts          # WSN attributes, thresholds, and configuration
│   ├── services/
│   │   ├── GeminiService.ts      # Google Gemini API integration service
│   │   ├── TicketStateStore.ts   # Central reactive state store (Singleton)
│   │   └── VoiceDictationService.ts # Speech recognition service
│   ├── types/                    # TypeScript interfaces and data models
│   ├── app.ts                    # Main UI controller & layout switcher
│   ├── main.ts                   # Vite application entry point
│   └── style.css                 # Custom CSS & Tailwind directives
├── index.html                    # Base HTML layout
├── package.json                  # Dependencies & npm scripts
├── tsconfig.json                 # TypeScript compiler configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── vercel.json                   # Vercel deployment configuration
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/ihor-protsenko-theraven/vinwolves-landing.git
cd ai-agent-vodokanal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for Production
```bash
npm run build
```
The compiled assets will be placed in the `dist/` directory.

---

## 🌐 Deployment & CI/CD (Vercel)

The project includes a pre-configured Vercel build setup (`vercel.json`) and an automated GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`).

### Option A: Automatic Git Integration (Recommended)
1. Import your GitHub repository into the [Vercel Dashboard](https://vercel.com/new).
2. Vercel automatically detects Vite settings from `vercel.json` (`npm run build` -> `dist`).
3. Every `git push` or Pull Request will automatically generate Preview and Production deployments.

### Option B: GitHub Actions Workflow
If using the included `.github/workflows/deploy.yml`, configure the following Repository Secrets in GitHub (`Settings > Secrets and variables > Actions`):
- `VERCEL_TOKEN`: Personal Access Token generated in Vercel Account Settings.
- `VERCEL_ORG_ID`: Found in `.vercel/project.json` or Vercel Team settings.
- `VERCEL_PROJECT_ID`: Found in Vercel Project Settings.

---

## 🔑 Demo Login Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Chief Dispatcher** | `admin` | `admin` |
| **ARM Operator** | `operator` | `operator` |

---

## ⚙️ WSN Domain Mapping (Water Supply Network)

- **Class ID**: `27772`
- **Default Status**: `5996` (In Progress)
- **Attribute Mapping**:
  - `1958` — Inquiry / Appeal Type
  - `1972` — Ticket Type (Emergency / Scheduled / Informational)
  - `1961` — Applicant Name
  - `1960` — Applicant Address
  - `-389` — Incident Location Text
  - `-420` — Geocoordinates (Latitude, Longitude)
  - `1981` — Contact Phone Number
  - `1258` — Incident Timestamp
  - `328` — Notes / Additional Details

---

## 📄 License

Developed for municipal water supply companies. All rights reserved © 2026 WSN AI Dispatcher System.
