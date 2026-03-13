# Automated Prospecting Engine 🚀

A powerful, automated lead generation and branding pipeline designed for Indonesian UMKM (SMBs).

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion.
- **Backend**: Python (Scraper & AI Engine), Prisma ORM.
- **Database**: Supabase (PostgreSQL).
- **AI**: Gemini 3 Flash via Kie.ai for high-speed branding generation.

## 🏗️ Project Architecture
1. **Phase 1: Data Mining**: Scrapes Google Maps for business leads (WA, Rating, Category).
2. **Phase 2: AI Branding**: Uses Gemini to generate premium headlines, service descriptions, and optimized reviews.
3. **Phase 3: Dashboard**: Next.js UI to manage leads and preview generated websites.
4. **Phase 4: Pitching**: Automated "Value-First" WhatsApp pitching (Planned).

## 🚀 Getting Started

### Prerequisites
- Node.js & npm
- Python 3.x
- Git

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt # if exists
   ```
3. Set up your `.env` file (see `.env.example`).
4. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Running the App
- **Web Dashboard**: `npm run dev`
- **Scraper**: Check `google-maps-scraper/` directory.
- **AI Enricher**: `python enricher.py`
