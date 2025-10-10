# SEO Page Generator

AI-powered tool for automatically generating and publishing SEO-optimized location/service pages to WordPress sites.

## Quick Start

```bash
# Clone repo
git clone https://github.com/KaranSangoi/seo-page-generator.git
cd seo-page-generator

# Install dependencies
npm install

# Setup environment (see SETUP.md)
cp .env.example .env
# Edit .env with your credentials

# Setup database
npx prisma db push

# Start development
npm run dev
```

Open http://localhost:3000

## Features

- ✅ User authentication (Clerk)
- ✅ Client management (CRUD)
- ✅ CSV upload & parsing
- ✅ AI content generation (Claude Code)
- ✅ WordPress publishing (Elementor)
- ✅ Real-time progress tracking
- ✅ Generation history & reports
- ✅ Time tracking per page
- ✅ Comprehensive validation

## Tech Stack

- **Framework:** Next.js 14 + React + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Neon PostgreSQL (FREE tier)
- **Auth:** Clerk (FREE tier)
- **AI:** Claude Code (uses Claude Pro subscription)
- **WordPress:** REST API + Elementor
- **Hosting:** Vercel (FREE tier)

## Cost

**Monthly:** $20 (just your Claude Pro subscription)

- No OpenAI API costs
- No additional database costs
- No hosting costs

## Documentation

- 📖 [Setup Guide](SETUP.md)
- 📋 [Complete Requirements](docs/REQUIREMENTS.md)
- 📄 [SOP Document](docs/SOP.md)
- 💬 [Full Context](docs/CONVERSATION_CONTEXT.md)
- ⏱️ [Development Timeline](docs/TIMELINE.md)

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npx prisma studio    # View database
```

## Deployment

```bash
vercel               # Deploy to Vercel
```

## Project Structure

```
src/
├── app/           # Next.js pages
├── lib/           # Core logic
├── components/    # UI components
└── prompts/       # Claude prompts

prisma/
└── schema.prisma  # Database schema

docs/              # Complete documentation
```

## License

Private - Internal Use Only
