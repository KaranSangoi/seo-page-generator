# Setup Instructions

## Prerequisites

✅ Node.js 18+ installed
✅ VS Code installed
✅ Claude Code CLI installed (`brew install anthropic/tap/claude`)
✅ Claude Pro subscription
✅ Git installed

---

## Step 1: Clone Repository

```bash
cd ~/Desktop
git clone https://github.com/KaranSangoi/seo-page-generator.git
cd seo-page-generator
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages (~2-3 minutes).

---

## Step 3: Setup Environment Variables

### A. Create Neon Database (FREE)

1. Go to: https://neon.tech
2. Sign up (no credit card needed)
3. Click "Create Project"
4. Project name: "seo-page-generator"
5. Region: Choose closest to you
6. Click "Create"
7. Copy the connection string (starts with `postgresql://`)

### B. Setup Clerk Authentication (FREE)

1. Go to: https://clerk.com
2. Sign up
3. Create new application
4. Name: "SEO Page Generator"
5. Choose authentication methods: Email + Password
6. Copy:
   - Publishable Key (starts with `pk_test_`)
   - Secret Key (starts with `sk_test_`)

### C. Create .env File

```bash
cp .env.example .env
```

Then edit `.env` file:

```env
DATABASE_URL="postgresql://YOUR_NEON_CONNECTION_STRING"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_YOUR_KEY"
CLERK_SECRET_KEY="sk_test_YOUR_KEY"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Step 4: Setup Database

```bash
npx prisma db push
```

This creates all tables in your Neon database.

To view database:

```bash
npx prisma studio
```

Opens browser at http://localhost:5555 to see your data.

---

## Step 5: Start Development Server

```bash
npm run dev
```

Open browser: http://localhost:3000

You should see the login page!

---

## Step 6: Authenticate Claude Code

```bash
claude auth login
```

This opens browser to authenticate with your Claude Pro account.

Test it:

```bash
claude chat "Hello!"
```

Should respond using your Claude Pro.

---

## Project Structure

```
seo-page-generator/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── page.tsx     # Home/Dashboard
│   │   ├── login/       # Auth pages
│   │   └── clients/     # Client management
│   ├── lib/              # Core logic
│   ├── components/       # UI components
│   └── prompts/          # SOP prompt for Claude
├── prisma/
│   └── schema.prisma    # Database schema
├── docs/                 # All documentation
└── public/              # Static assets
```

---

## Development Workflow with Claude Code

### In VS Code Terminal:

```bash
# Start Claude Code
claude chat

# Then give instructions:
> @docs/CONVERSATION_CONTEXT.md
  @docs/REQUIREMENTS.md
  Build the client dashboard page at src/app/clients/page.tsx
  Show all clients from database in a grid layout
  Add "Add Client" button
  Use Tailwind for styling
```

Claude Code will:

- Read context files
- Generate code
- Create/update files automatically
- You just review and test

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma db push       # Update database schema
npx prisma studio        # View database
npx prisma generate      # Regenerate Prisma client

# Linting
npm run lint             # Check code quality
```

---

## Troubleshooting

### Port 3000 already in use?

```bash
lsof -ti:3000 | xargs kill
# Or use different port:
npm run dev -- -p 3001
```

### Prisma errors?

```bash
# Reset and regenerate
rm -rf node_modules .next
npm install
npx prisma generate
npx prisma db push
```

### Clerk not working?

- Check `.env` keys are correct
- Make sure keys start with `pk_test_` and `sk_test_`
- Reload VS Code

### Claude Code not responding?

```bash
# Re-authenticate
claude auth logout
claude auth login
```

---

## Next Steps

1. ✅ Setup complete - server running
2. 📖 Read: `docs/REQUIREMENTS.md`
3. 🎯 Start building with Claude Code
4. 📋 Follow: `docs/TIMELINE.md` (7-day plan)

---

## Deploy to Vercel (When Ready)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, add environment variables when asked
```

---

## Getting Help

- **Context Files:** All requirements in `docs/`
- **Sample Content:** `docs/sample-content/`
- **Claude Code:** Ask it to read context files
- **Troubleshooting:** See above section

Ready to build! 🚀
