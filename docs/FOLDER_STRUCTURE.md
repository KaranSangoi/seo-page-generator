# Complete Folder Structure

Save downloaded files in this exact structure:

```
seo-page-generator/
│
├── package.json                    ← Download and place here
├── .env.example                    ← Download and place here
├── .gitignore                      ← Create (see below)
├── next.config.js                  ← Create (see below)
├── tailwind.config.js              ← Create (see below)
├── tsconfig.json                   ← Create (see below)
├── postcss.config.js               ← Create (see below)
│
├── README.md                       ← Download and place here
├── SETUP.md                        ← Download and place here
│
├── prisma/
│   └── schema.prisma               ← Download and place here
│
├── docs/
│   ├── REQUIREMENTS.md                 ← Complete requirements (includes v2)
│   ├── SOP.md                          ← Content structure and guidelines
│   ├── TEMPLATE_ELEMENTS.md            ← Elementor element IDs
│   ├── FOLDER_STRUCTURE.md             ← This file
│   ├── CHANGELOG.md                    ← Version history (includes v2.0)
│   ├── ADJECTIVE_SYSTEM.md             ← Deterministic adjectives explained
│   ├── SMART_VALIDATION.md             ← Auto-fix and retry system
│   ├── BUILDER_AUTO_DETECTION.md       ← Page builder detection logic
│   ├── MULTI_BUILDER_FEASIBILITY.md    ← Multi-builder analysis
│   ├── SEO_INDEXING_EXPLAINED.md       ← SEO plugin details
│   ├── SEO_UI_LIMITATION.md            ← SEO plugin UI limitations
│   ├── ELEMENTOR_TEMPLATE_SETUP.md     ← Template setup guide
│   ├── TEMPLATE_SEO_SETUP.md           ← SEO meta setup guide
│   ├── V2_ACTIVATION_GUIDE.md          🚀 V2: How to enable preview mode
│   ├── PROJECT_STATUS.md               📊 Complete project state
│   ├── QUICK_REFERENCE.md              ⚡ Fast context for new sessions
│   ├── SESSION_SUMMARY.md              📝 Latest session summary
│   └── sample-content/
│       └── commercial-glass-sumner-wa.md  ← Sample content example
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← Main app layout
│   │   ├── page.tsx                ← Dashboard/home page
│   │   ├── globals.css             ← Global styles
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   └── page.tsx            ← Admin dashboard
│   │   ├── api/
│   │   │   ├── generate/route.ts           ← Main generation API
│   │   │   ├── regenerate/route.ts         ← Page regeneration
│   │   │   ├── sample-page/route.ts        ← Sample page generation
│   │   │   ├── admin/
│   │   │   │   └── stats/route.ts          ← Admin stats
│   │   │   ├── generate-preview/           🚀 V2: Generate without publishing
│   │   │   │   └── route.ts
│   │   │   ├── publish-reviewed/           🚀 V2: Publish reviewed content
│   │   │   │   └── route.ts
│   │   │   └── regenerate-section/         🚀 V2: Regenerate sections
│   │   │       └── route.ts
│   │   └── clients/
│   │       ├── page.tsx
│   │       ├── [id]/
│   │       │   ├── page.tsx                ← Client detail page
│   │       │   ├── ClientTabs.tsx          ← Tab navigation
│   │       │   ├── MetadataTab.tsx         ← Client metadata
│   │       │   ├── GeneratePagesTab.tsx    ← Page generation (has v2 code commented)
│   │       │   ├── HistoryTab.tsx          ← Generation history
│   │       │   ├── BatchDetailModal.tsx    ← Batch details modal
│   │       │   ├── ContentPreviewModal.tsx 🚀 V2: Content review modal
│   │       │   └── actions.ts              ← Server actions
│   │       └── new/
│   │           └── page.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts               ← Prisma database client
│   │   ├── auth.ts                 ← Clerk authentication
│   │   ├── claude-api.ts           ← Claude AI integration
│   │   ├── simple-queue.ts         ← Batch processing queue
│   │   ├── adjectives.ts           ← Deterministic adjective system
│   │   ├── elementor-replacer.ts   🚀 V2: Reusable content replacement
│   │   ├── builders/               ← Page builder detection
│   │   │   ├── base.ts
│   │   │   ├── elementor.ts
│   │   │   ├── divi.ts
│   │   │   ├── wpbakery.ts
│   │   │   └── detector.ts
│   │   └── utils.ts                ← Utility functions
│   │
│   ├── components/
│   │   └── (UI components)
│   │
│   ├── prompts/
│   │   └── (AI prompt templates)
│   │
│   └── types/
│       └── index.ts                ← TypeScript types
│
├── public/
│   └── (images, icons, etc)
│
└── node_modules/                   ← Created by npm install
```

---

## Files to Create Manually

### .gitignore

```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
/prisma/migrations
```

### next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### postcss.config.js

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Setup Steps

1. **Create project folder:**

   ```bash
   mkdir seo-page-generator
   cd seo-page-generator
   ```

2. **Download artifacts and place in correct locations**

3. **Create config files** (listed above)

4. **Initialize git:**

   ```bash
   git init
   git add .
   git commit -m "Initial project setup"
   git remote add origin https://github.com/KaranSangoi/seo-page-generator.git
   git push -u origin main
   ```

5. **Install dependencies:**

   ```bash
   npm install
   ```

6. **Setup environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

7. **Setup database:**

   ```bash
   npx prisma db push
   ```

8. **Start development:**
   ```bash
   npm run dev
   ```

---

## Next Steps with Claude Code

Once structure is ready:

```bash
claude chat

> @docs/CONVERSATION_CONTEXT.md
  @docs/REQUIREMENTS.md
  Create the Next.js app structure:
  - src/app/layout.tsx with Clerk provider
  - src/app/page.tsx as dashboard
  - src/app/globals.css with Tailwind
  - src/lib/db.ts with Prisma client
```

Claude Code will create all the code files for you!
