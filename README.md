# 🌱 Agrigrow — AI-Powered Farmer Community & Knowledge Platform

> 📄 **Important:** One of the team members, **Zagade Atharva**, did his summer internship at the Department of Entrepreneurship and Management, where he conducted research on the topic and proposed the idea of this platform. The research paper is currently under final review, but it has been presented at two conferences:
> - **IEEE ICTMOD 2025** — International Conference on Technology Management, Operations and Decisions, held in Glasgow, Scotland
> - **IMRC 2025** — Indian Management Research Conference, Annual Conference of IIM Ahmedabad
>
> Certificates from both conferences are available in the `conferences/` folder.

> ⚠️ **Network Notice:** The site is hosted on Vercel and may not work properly on **IITGN SSO** or **IITGN GUEST** networks as Vercel is blocked on those networks. For the best experience, please use the website on **mobile data** or any other network.

Agrigrow is a farmer-centric, AI-powered digital platform designed to empower Indian farmers through trusted knowledge access, peer-to-peer learning, and intelligent crop advisory. Built with a mobile-first approach, it bridges the gap between modern technology and on-ground farming needs.

> **Vision:** Help farmers decide *what to grow, what's going wrong, and what to do next* — using AI and trusted farmer communities.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Internationalization](#-internationalization)
- [Database Models](#-database-models)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🤖 Crop AI Assistant
- **Image-Based Crop Diagnosis** — Upload a crop image, get AI-powered disease/deficiency detection with actionable steps
- **AI Chat** — Ask anything about crops, fertilizers, irrigation, and farming practices
- **Crop Planning & Recommendations** — Get personalized crop suggestions based on location, season, water availability, and previous crops
- **Analysis History** — Track all past diagnoses and recommendations

### 🏠 Community Feed
- Personalized, crop-aware home feed with post creation (text, images, voice notes)
- Like, comment, share, and mark solutions as "Helpful"
- Trending posts, category filters, and post insights
- Pull-to-refresh and infinite scroll
- Content reporting and user muting

### 👥 Community Groups
- Create and join crop-based, region-based, or topic-based communities
- Group posts with moderation (approve, pin, ban members)
- Group rules, settings, and invite system (link + QR code)
- Member management with roles (admin, moderator, member)

### 📚 Knowledge Hub
- Structured crop-wise video guides with language-specific content (English/Hindi)
- Pest & disease library, fertilizer & irrigation schedules
- Curated from agricultural universities and KVK sources

### 👤 User Profile & Social
- OTP-based phone authentication (no passwords)
- Follow/unfollow system with follow requests
- Trust badges and community-based trust scores
- Profile customization with crop interests and experience level

### 🔔 Notifications
- Real-time notifications for likes, comments, follows, group activity
- Mark as read / mark all read

### 🌤️ Weather Integration
- Location-based weather data on the home feed
- Rain forecasting with multi-day outlook

### 🌐 Multi-Language Support
- English and Hindi (with extensible architecture)
- Type-safe translation system with 1700+ translation keys

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5.9 |
| **Styling** | Tailwind CSS 4 + shadcn/ui + CSS Variables |
| **State Management** | Redux Toolkit + React Hooks |
| **Database** | MongoDB (Mongoose 9) |
| **AI Engine** | Google Gemini API (`gemini-2.5-flash`) |
| **Icons** | Tabler Icons (`@tabler/icons-react`) |
| **Forms** | React Hook Form |
| **HTTP Client** | Axios |
| **Package Manager** | Yarn |
| **Deployment** | Vercel (Mumbai region) |

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────┐
│                   Next.js App Router               │
│  ┌──────────────┐  ┌───────────┐  ┌─────────────┐ │
│  │  Pages/Views  │  │ API Routes│  │  Components │ │
│  │  (app/)       │  │ (app/api/)│  │  (src/)     │ │
│  └──────┬───────┘  └─────┬─────┘  └──────┬──────┘ │
│         │                │               │         │
│  ┌──────┴───────────────┴───────────────┴──────┐  │
│  │           Custom Hooks (src/hooks/)          │  │
│  │         Redux Store (src/store/)             │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │                              │
│  ┌──────────────────┴──────────────────────────┐  │
│  │              Lib / Utilities                 │  │
│  │  MongoDB │ Gemini AI │ Weather │ Auth │ Cache│  │
│  └──────────────────┬──────────────────────────┘  │
└─────────────────────┼──────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │    External Services    │
         │  MongoDB Atlas          │
         │  Google Gemini API      │
         │  Weather API            │
         └─────────────────────────┘
```

### Key Design Patterns
- **Mobile-first** — Safe area handling, bottom navigation, responsive layouts
- **OTP-based auth** — Phone number verification, no passwords
- **AI with guardrails** — Rate limiting, response caching, usage analytics
- **Server-side API** — All API routes in Next.js, direct MongoDB access
- **Feed algorithm** — Custom ranking with view tracking and trending detection
- **Trust system** — Community-based trust scores and badges

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 18.x
- **Yarn** (v1.x)
- **MongoDB** (Atlas or local instance)
- **Google Gemini API key**
- **Weather API key**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/agrigrow-website.git
cd agrigrow-website

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables section)

# Run development server
yarn dev
```

### Available Scripts

| Command | Description |
|---|---|
| `yarn dev` | Start development server (Turbopack) |
| `yarn build` | Create optimized production build |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint |

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
# ─── Required ────────────────────────────────────
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=your-google-gemini-api-key
WEATHER_API_KEY=your-weather-api-key

# ─── Optional ────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Model Configuration
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MODEL_PLANNING=gemini-2.0-flash
GEMINI_TEMPERATURE_CHAT=0.7
GEMINI_TEMPERATURE_DIAGNOSIS=0.3
GEMINI_TEMPERATURE_PLANNING=0.3
GEMINI_MAX_TOKENS_CHAT=1024
GEMINI_MAX_TOKENS_DIAGNOSIS=4096
GEMINI_MAX_TOKENS_PLANNING=8192

# Rate Limiting
AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_REQUESTS_PER_HOUR=50
AI_RATE_LIMIT_REQUESTS_PER_DAY=200

# Caching
AI_CACHE_ENABLED=true
AI_CACHE_MAX_SIZE=500
AI_CACHE_TTL=3600000
AI_CACHE_CHAT_TTL=1800000
AI_CACHE_DIAGNOSIS_TTL=86400000
AI_CACHE_PLANNING_TTL=43200000
```

---

## 📁 Project Structure

```
agrigrow-website/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # OTP authentication
│   │   ├── crop-ai/              # AI diagnosis, chat, planning
│   │   ├── feed/                 # Feed preferences, muting
│   │   ├── groups/               # Community groups CRUD
│   │   ├── notifications/        # Notification management
│   │   ├── posts/                # Posts, comments, likes
│   │   ├── reports/              # Content reporting
│   │   ├── search/               # Global search
│   │   └── user/                 # User profiles, follow system
│   ├── ask-ai/                   # AI chat page
│   ├── auth/                     # Sign in / Sign up
│   ├── communities/              # Groups listing & detail
│   ├── crop-ai/                  # Crop AI main & history
│   ├── home/                     # Home feed
│   ├── knowledge/                # Knowledge hub
│   ├── notifications/            # Notifications page
│   ├── onboarding/               # User onboarding flow
│   ├── post/                     # Individual post view
│   ├── profile/                  # User profile & settings
│   ├── saved-posts/              # Saved posts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── providers.tsx             # App-level providers
│
├── src/
│   ├── components/
│   │   ├── auth/                 # Auth UI components
│   │   ├── common/               # Shared components (Navbar, PageHeader, etc.)
│   │   ├── crop-ai/              # AI feature components
│   │   ├── feed/                 # Feed & post components
│   │   ├── follow/               # Follow system UI
│   │   ├── groups/               # Community group components
│   │   ├── knowledge/            # Knowledge hub components
│   │   ├── layout-primitives/    # Layout utilities
│   │   ├── notifications/        # Notification components
│   │   ├── profile/              # Profile page components
│   │   ├── sections/             # Landing page sections
│   │   └── ui/                   # shadcn/ui primitives
│   │
│   ├── constants/                # App constants (crops, locations, etc.)
│   ├── hooks/                    # 36 custom React hooks
│   ├── lib/                      # Utilities & service clients
│   ├── locales/                  # i18n translations (en, hi)
│   ├── models/                   # 17 Mongoose models
│   ├── store/                    # Redux toolkit store & slices
│   └── types/                    # TypeScript type definitions
│
├── API/                          # API documentation (txt files)
├── public/                       # Static assets
├── tailwind.config.ts            # Tailwind theme (green primary palette)
├── next.config.ts                # Next.js configuration
└── package.json                  # Dependencies & scripts
```

---

## 📖 API Documentation

Comprehensive API documentation is available in the `API/` directory as text files:

| File | Endpoints |
|---|---|
| `user-api.txt` | User profile, onboarding, authentication |
| `feed-api.txt` | Feed preferences, muting |
| `posts-api.txt` | Post CRUD, trending |
| `comments-api.txt` | Comments, likes, helpful marks |
| `groups-api.txt` | Group CRUD, discovery, search |
| `group-posts-api.txt` | Group post management |
| `group-members-api.txt` | Member management, banning |
| `group-invitations-api.txt` | Invitation system |
| `group-comments-api.txt` | Group post comments |
| `chat-api.txt` | AI chat conversations |
| `diagnose-api.txt` | Crop disease diagnosis |
| `plan-api.txt` | Crop planning recommendations |
| `weather-api.txt` | Weather data |
| `notifications-api.txt` | Notification management |
| `reports-api.txt` | Content reporting |
| `saved-posts-api.txt` | Saved/bookmarked posts |
| `analytics-api.txt` | AI usage analytics |
| `cache-api.txt` | AI cache statistics |
| `track-views-api.txt` | Post view tracking |

---

## 🌐 Internationalization

Agrigrow supports **English** and **Hindi** with a custom type-safe translation system.

- Translation files: `src/locales/en.ts` and `src/locales/hi.ts`
- Type definitions: `src/locales/types.ts` (1700+ keys)
- Usage:
  ```tsx
  const { t, language, setLanguage } = useTranslation();
  return <span>{t('common.save')}</span>;
  ```
- Language is stored in `localStorage` and synced across tabs
- English fallback for any missing Hindi translations
- `LanguageProvider` wraps the entire app via `providers.tsx`

### Translation Coverage
All modules have translations: common UI, feed, auth, profile, crop-ai, groups, notifications, knowledge hub, onboarding, and landing page.

---

## 🗄 Database Models

| Model | Description |
|---|---|
| `User` | User profiles, preferences, crop interests |
| `Post` | Community feed posts |
| `Comment` | Post comments with replies |
| `Follow` | Follow relationships between users |
| `Group` | Community groups |
| `GroupPost` | Posts within groups |
| `GroupComment` | Comments on group posts |
| `GroupMembership` | User-group membership records |
| `GroupInvitation` | Group invitation links |
| `CropAnalysis` | AI crop analysis results |
| `CropPlan` | AI crop planning recommendations |
| `ChatConversation` | AI chat conversation history |
| `AIAnalytics` | AI feature usage analytics |
| `Notification` | User notifications |
| `Report` | Content reports |
| `Share` | Post share records |
| `UserFeedPreference` | Feed customization preferences |

---

## 🚢 Deployment

The application is configured for **Vercel** deployment (Mumbai region — `bom1`).

```bash
# Build for production
yarn build

# Start production server
yarn start
```

### Vercel Configuration
- Region: `bom1` (Mumbai, India)
- Body size limit: `10mb` (for image uploads)
- Custom cache headers configured in `next.config.ts`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Follow the coding guidelines:
   - Use **Tailwind CSS** utility classes for all styling
   - Use **shadcn/ui** for common UI components
   - Use **Tabler Icons** for all icons
   - Use **Yarn** as the package manager
   - Use **Redux Toolkit** for state management
   - Use `cn()` utility for conditional class merging
   - Keep components atomic, composable, and reusable
   - Maintain dark mode support with `dark:` variant
   - Ensure mobile-first responsive design
   - Use `useTranslation()` hook for all user-facing text
4. Commit your changes (`git commit -m 'feat: add your feature'`)
5. Push to the branch (`git push origin feature/your-feature`)
6. Open a Pull Request

---

## 📄 License

This project is private and proprietary. All rights reserved.
