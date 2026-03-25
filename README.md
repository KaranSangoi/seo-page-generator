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

### Core Functionality (v3.0 - Current)
- ✅ User authentication (Clerk)
- ✅ Multi-client management (CRUD)
- ✅ CSV upload & parsing with validation
- ✅ AI content generation (Claude/OpenAI)
- ✅ WordPress publishing (Elementor, Divi, WPBakery, Avada Fusion Builder, Classic Editor)
- ✅ Real-time progress tracking
- ✅ Generation history & reports
- ✅ Time tracking per page

### Content Quality
- ✅ **Deterministic adjective system** - 100% consistency from preview to generation
- ✅ Smart validation with auto-fix
- ✅ Selective retry for FAQs and map sections
- ✅ Strict SOP enforcement
- ✅ Primary keyword consistency guaranteed

### Developer Experience
- ✅ Page builder auto-detection
- ✅ Sample page generation for template testing
- ✅ Comprehensive error logging
- ✅ Dark mode support

### V2 Features (Ready, Commented Out)
- 🚀 **Preview & Publish Mode** - Generate content, review in modal, regenerate sections, then publish
- 🚀 **Section-level Regeneration** - Regenerate specific sections (hero, benefits, why, FAQs, map)
- 🚀 **Dual Generation Modes** - Choose between direct publishing or review workflow
- 🚀 **Content Review Modal** - Full-featured UI for reviewing and editing content before publishing

> **Note**: V2 features are fully implemented and tested but disabled by default. See [V2 Activation Guide](docs/V2_ACTIVATION_GUIDE.md) for easy activation instructions.

## Tech Stack

- **Framework:** Next.js 14 + React + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Neon PostgreSQL (FREE tier)
- **Auth:** Clerk (FREE tier)
- **AI:** Claude Code (uses Claude Pro subscription)
- **WordPress:** REST API + Elementor, Divi, WPBakery, Fusion Builder, Classic Editor
- **Hosting:** Vercel (FREE tier)

## Cost

**Monthly:** $20 (just your Claude Pro subscription)

- No OpenAI API costs
- No additional database costs
- No hosting costs

## Documentation

> 📚 **Complete documentation available in [docs/](docs/) directory**
> - **Quick Start:** [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) - 5 min overview
> - **Full Index:** [docs/INDEX.md](docs/INDEX.md) - Navigate all documentation
> - **Current State:** [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) - Complete project snapshot

### Getting Started
- 📖 [Setup Guide](SETUP.md) - Installation and configuration
- 📋 [Complete Requirements](docs/REQUIREMENTS.md) - Full feature specifications
- 🚀 **[V2 Activation Guide](docs/V2_ACTIVATION_GUIDE.md)** - Enable preview & publish mode

### Content Guidelines
- 📄 [SOP Document](docs/SOP.md) - Content structure and requirements
- 📝 [Template Elements](docs/TEMPLATE_ELEMENTS.md) - Template element CSS IDs
- 🎯 [Adjective System](docs/ADJECTIVE_SYSTEM.md) - How keyword adjectives work

### Technical Reference
- 🔧 [Builder Auto-Detection](docs/BUILDER_AUTO_DETECTION.md) - Page builder detection
- ✅ [Smart Validation](docs/SMART_VALIDATION.md) - Auto-fix and selective retry
- 📂 [Folder Structure](docs/FOLDER_STRUCTURE.md) - Project organization

### Project History
- 📜 [Changelog](docs/CHANGELOG.md) - Version history and updates
- 📊 **[Project Status](docs/PROJECT_STATUS.md)** - Complete current state snapshot
- ⚡ **[Quick Reference](docs/QUICK_REFERENCE.md)** - Fast context for new sessions
- 💬 [Full Context](docs/CONVERSATION_CONTEXT.md) - Development conversation
- ⏱️ [Development Timeline](docs/TIMELINE.md) - Build history

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
