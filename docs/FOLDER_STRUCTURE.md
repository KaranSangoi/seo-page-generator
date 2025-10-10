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
│   ├── CONVERSATION_CONTEXT.md     ← Download and place here
│   ├── REQUIREMENTS.md             ← Download and place here
│   ├── SOP.md                      ← Download and place here
│   ├── TIMELINE.md                 ← You'll create with Claude Code
│   ├── CLAUDE_CODE_GUIDE.md        ← You'll create with Claude Code
│   └── sample-content/
│       └── commercial-glass-sumner-wa.md  ← Download and place here
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← You'll create with Claude Code
│   │   ├── page.tsx                ← You'll create with Claude Code
│   │   ├── globals.css             ← You'll create with Claude Code
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── clients/
│   │       ├── page.tsx
│   │       ├── [id]/
│   │       │   └── page.tsx
│   │       └── new/
│   │           └── page.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                   ← Database client
│   │   ├── claude.ts               ← Claude Code integration
│   │   ├── wordpress.ts            ← WordPress API
│   │   ├── elementor.ts            ← Elementor JSON builder
│   │   ├── validation.ts           ← Content validation
│   │   └── utils.ts                ← Utility functions
│   │
│   ├── components/
│   │   ├── InfoIcon.tsx            ← (ⓘ) icon with tooltip
│   │   ├── ClientCard.tsx          ← Client display card
│   │   ├── ProgressBar.tsx         ← Generation progress
│   │   ├── FileUpload.tsx          ← CSV upload component
│   │   └── ...
│   │
│   ├── prompts/
│   │   └── sop-prompt.ts           ← SOP as prompt template
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
