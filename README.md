# 💧 Vodokanal WSN — AI Dispatcher (Operator Workstation)

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)
![Gemini AI](https://img.shields.io/badge/Google_Gemini-1.5_/_2.5-4285F4.svg)
![WSN Class](https://img.shields.io/badge/WSN_Class-27772-orange.svg)

An intelligent Automated Operator Workstation (ARM) for municipal Water Supply Network (Vodokanal) dispatchers. Designed to automate call intake, transcript extraction, geocoding, duplicate checking, and ticket registration for emergency and informational requests using **Google Gemini AI** and **Forland API integration**.

---

## 🎯 Purpose

The system is designed to reduce dispatcher workload during peak call volumes. The AI agent automatically analyzes call transcripts or audio dictation from citizens, extracts structured data (incident address, ticket type, caller details, contact phone, geocoordinates), calculates field-level confidence scores, and checks for active duplicates in the WSN database.

---

## ✨ Key Features

- **🤖 AI Transcript Parsing (Google Gemini API)**:
  - Automatically structures unstructured voice or text transcripts into the official WSN schema (Classification `27772`).
  - Calculates confidence scores ($0–100\%$) for each extracted attribute and an overall score.
  - Visual color coding for field confidence (Green $\ge 85\%$, Yellow $70–84\%$, Red $< 70\%$).
  - Support for multiple Gemini models (1.5 Flash, 2.5 Flash, 1.5 Pro, etc.)

- **🧠 NLP Processing (Ukrainian Language)**:
  - Custom Ukrainian address parser with street name normalization and aliases.
  - Phone number extraction with Ukrainian format support (+38 prefix).
  - Appeal type classification using keyword-based detection.
  - Applicant name extraction with common Ukrainian name recognition.
  - Intelligent question generation based on incident type.

- **🗺️ Automated Geocoding (OpenStreetMap / Nominatim)**:
  - Converts extracted street addresses into geographical coordinates (Latitude, Longitude).
  - Supports reverse geocoding and fallback default coordinates.
  - Multiple geocoding service integration (Nominatim, custom geodata service).

- **🔗 Forland API Integration**:
  - Secure authentication with Forland system.
  - Repository data retrieval for dropdown options.
  - Object list filtering by kindUnitID, stateID, and logID.
  - CORS handling via Vite dev server proxy and Vercel serverless function.

- **🔍 Duplicate Detection**:
  - Automatically checks active database records within geographic proximity for matching incident types.
  - Interactive confirmation modal displaying duplicate details (Ticket ID, creation timestamp, status).

- **🎙️ Voice Dictation (Web Speech API)**:
  - Real-time speech-to-text dictation directly from the operator's microphone (Ukrainian `uk-UA` support).
  - Confidence-based speech recognition scoring.

- **⚡ Pre-loaded Demo Scenarios**:
  - **Scenario 1 (Pipe Burst / High Confidence)**: Complete details extracted, ready for instant registration.
  - **Scenario 2 (Duplicate Ticket)**: Detects an existing active emergency ticket at the same location.
  - **Scenario 3 (Damaged Manhole / Low Confidence)**: Vague location requiring operator clarification.
  - **Scenario 4 (Tariff Consultation)**: Informational inquiry requiring no field dispatch team.

- **🔐 Authentication & Role Management**:
  - Role-based access: `Chief Dispatcher (Admin)` and `ARM Operator`.
  - Server-side Gemini integration; API key is not exposed to the browser.
  - Forland API session management.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Language** | [TypeScript 5.4](https://www.typescriptlang.org/) (Strict Mode) |
| **Bundler & Dev Server** | [Vite 8.0](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS 3.4](https://tailwindcss.com/) + PostCSS |
| **AI Model** | [Google Gemini 1.5 / 2.5 Flash](https://ai.google.dev/) |
| **NLP Processing** | Custom Ukrainian NLP parsers & classifiers |
| **Geocoding API** | [OpenStreetMap Nominatim API](https://nominatim.openstreetmap.org/) |
| **Enterprise API** | [Forland API](https://wsn1.forland-solution.com/) |
| **Speech Recognition** | Web Speech API (`SpeechRecognition`) |
| **Deployment** | [Vercel](https://vercel.com/) + Serverless Functions |

---

## 📁 Project Structure

```
ai-agent-vodokanal/
├── api/
│   ├── forland.js                # Vercel serverless function for Forland API proxy
│   └── gemini.js                 # Server-side Gemini proxy
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
│   ├── config/                   # Configuration files
│   │   ├── ai.config.ts          # AI prompts, models, and confidence thresholds
│   │   ├── api.config.ts         # API endpoints and paths
│   │   ├── app.config.ts         # Application settings
│   │   ├── auth.config.ts        # Authentication configuration
│   │   ├── geo.config.ts         # Geocoding service settings
│   │   ├── nlp.config.ts         # NLP processing constants (Ukrainian)
│   │   ├── speech.config.ts      # Speech recognition settings
│   │   ├── ui.config.ts          # UI component configuration
│   │   ├── wsn.config.ts         # WSN domain mapping and attributes
│   │   └── index.ts              # Config exports
│   ├── mock/
│   │   └── mockData.ts           # Mock data for testing
│   ├── services/                 # Business logic and API services
│   │   ├── nlp/                  # NLP processing services
│   │   │   ├── AppealTypeClassifier.ts      # Appeal type classification
│   │   │   ├── ApplicantNameExtractor.ts   # Name extraction logic
│   │   │   ├── PhoneExtractor.ts            # Phone number extraction
│   │   │   ├── QuestionGenerator.ts         # Dynamic question generation
│   │   │   └── UkrainianAddressParser.ts    # Ukrainian address parsing
│   │   ├── DropdownDataService.ts  # Dropdown data management
│   │   ├── DuplicateFinder.ts        # Duplicate detection logic
│   │   ├── ForlandApiService.ts      # Forland API integration
│   │   ├── GeminiService.ts          # Google Gemini API integration
│   │   ├── GeocodingService.ts       # Geocoding service orchestration
│   │   ├── GeodataService.ts        # Geodata management
│   │   ├── NominatimService.ts       # OpenStreetMap Nominatim API
│   │   ├── TicketStateStore.ts       # Central reactive state store (Singleton)
│   │   └── VoiceDictationService.ts  # Speech recognition service
│   ├── types/                    # TypeScript interfaces and data models
│   │   ├── dropdown.ts           # Dropdown data types
│   │   ├── forland.ts            # Forland API types
│   │   ├── gemini.ts             # Gemini API types
│   │   ├── geocoding.ts          # Geocoding types
│   │   ├── geodata.ts            # Geodata types
│   │   ├── index.ts              # Type exports
│   │   ├── nlp.ts                # NLP processing types
│   │   ├── ticket.ts             # Ticket data models
│   │   ├── ui.ts                 # UI component types
│   │   └── wsn.ts                # WSN domain types
│   ├── utils/                    # Utility functions
│   │   ├── security.ts           # Security utilities
│   │   ├── text.ts               # Text processing utilities
│   │   └── wsn.ts                # WSN-specific utilities
│   ├── app.ts                    # Main UI controller & layout switcher
│   ├── main.ts                   # Vite application entry point
│   └── style.css                 # Custom CSS & Tailwind directives
├── .env.example                  # Environment variables template
├── index.html                    # Base HTML layout
├── package.json                  # Dependencies & npm scripts
├── tsconfig.json                 # TypeScript compiler configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── vite.config.ts                # Vite configuration
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

`npm run dev` intentionally uses **local AI mode**: it does not call Gemini and
does not require a key. With text from browser speech recognition, the local
parser extracts the appeal type, phone and address; without a transcript, the
application uses demo scenarios. The amber `Локальний AI` badge confirms this
mode in the UI.

To use real Gemini during local integration testing, set
`VITE_AI_MODE=gemini` only in an environment that also serves the server-side
`/api/gemini` function and has `GEMINI_API_KEY` configured. Do not put the key
in a `VITE_*` variable.

For that mode, run the local Vercel runtime rather than Vite and make both
routes use its serverless functions:

```powershell
# .env.development.local (gitignored), or Vercel Development environment variables
VITE_AI_MODE=gemini
VITE_FORLAND_PROXY_MODE=vercel

npx vercel dev
```

`npm run dev` uses `VITE_FORLAND_PROXY_MODE=vite`, where `/forland` is handled
by `vite.config.ts`. `vercel dev` uses `VITE_FORLAND_PROXY_MODE=vercel`, where
both Gemini and Forland are handled by `/api/*`. Restart the server after
changing either `VITE_*` variable.

In Vercel, prefer `GEMINI_API_KEY` as a **sensitive** variable for Development,
Preview and Production. The server supports the legacy `VITE_GEMINI_API_KEY`
name during migration, but it must also be present in Development for
`vercel dev` to use it. Add `VITE_FORLAND_PROXY_MODE=vercel` for Development
when using `vercel dev`.

### 4. Build for Production
```bash
npm run build
```
The compiled assets will be placed in the `dist/` directory.

### 5. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Required environment variables (configure them only in Vercel; do not expose them to Vite):
- `GEMINI_API_KEY`: Google Gemini API key used only by `/api/gemini`
- Forland credentials are entered by each operator in the application UI

---

## 🌐 Deployment & CI/CD (Vercel)

The project includes a pre-configured Vercel build setup (`vercel.json`) and a serverless function for Forland API proxy (`api/forland.js`).

### Development
- `npm run dev`: Vite proxy for Forland (`/forland` -> `https://wsn1.forland-solution.com`)
- `npx vercel dev`: local Vercel functions for both `/api/forland` and `/api/gemini`

### Production Deployment
1. Import your GitHub repository into the [Vercel Dashboard](https://vercel.com/new).
2. Vercel automatically detects Vite settings from `vercel.json` (`npm run build` -> `dist`).
3. The serverless functions handle the Forland and Gemini server-side integrations.
4. Configure environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`: Your Google Gemini API key

### GitHub Actions Workflow (Optional)
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

## 🧪 Testing & Development

### Mock Data
The project includes comprehensive mock data in `src/mock/mockData.ts` for:
- Dropdown options (appeal types, ticket types, etc.)
- Geographic data
- Sample tickets for duplicate detection
- Forland API responses

### NLP Processing Features
- **Ukrainian Address Parser**: Handles street name normalization, aliases, and vague address detection
- **Phone Number Extraction**: Supports multiple Ukrainian phone formats (+38 prefix, local formats)
- **Appeal Type Classification**: Keyword-based classification with 15+ appeal types
- **Name Extraction**: Recognizes common Ukrainian names and explicit name patterns
- **Question Generation**: Context-aware questions based on incident type

### Confidence Scoring System
- **Speech Recognition**: 96% (default), 85% (short speech)
- **Classification**: 94% (default)
- **Address Extraction**: 92% (full), 78% (street only), 62% (vague)
- **Geocoding**: 88% (full), 70% (fallback), 54% (vague)
- **Visual Indicators**: Green (≥85%), Yellow (70-84%), Red (<70%)

---

## 📄 License

Developed for municipal water supply companies. All rights reserved © 2026 WSN AI Dispatcher System.

## 🏗️ Architecture Overview

The application follows a modular architecture with clear separation of concerns:

1. **UI Layer**: React-like components built with vanilla TypeScript and Tailwind CSS
2. **State Management**: Centralized `TicketStateStore` using the Singleton pattern for reactive state
3. **Service Layer**: Dedicated services for each external API (Gemini, Forland, Nominatim, Voice)
4. **NLP Pipeline**: Custom Ukrainian language processing pipeline for text analysis
5. **Configuration**: Centralized configuration management in `src/config/`
6. **Type Safety**: Comprehensive TypeScript interfaces for all data models

## 🔧 API Integration Details

### Forland API
- **Authentication**: Session-based with secure cookie handling
- **Proxy Configuration**: 
  - Development: Vite proxy server
  - Production: Vercel serverless function with CORS headers
- **Endpoints**: Login, Logout, Repository, GetList, Dropdown Options
- **Cookie Management**: Automatic domain and path rewriting for cross-origin requests

### Gemini AI
- **Models**: Supports multiple Gemini models (1.5 Flash, 2.5 Flash, 1.5 Pro, etc.)
- **Temperature**: Low temperature (0.1) for consistent outputs
- **System Prompts**: Customized for water utility domain
- **Response Format**: Structured JSON with confidence scores

### OpenStreetMap Nominatim
- **Geocoding**: Address to coordinates conversion
- **Rate Limiting**: Respects Nominatim usage policy
- **Fallback**: Custom geodata service for improved accuracy
