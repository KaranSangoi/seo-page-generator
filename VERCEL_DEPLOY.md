# Vercel Deployment Guide

This guide will help you deploy the SEO Page Generator to Vercel successfully.

## Prerequisites

Before deploying to Vercel, you need:

1. **Neon PostgreSQL Database** (free tier available at [neon.tech](https://neon.tech))
2. **Anthropic API Key** (get from [console.anthropic.com](https://console.anthropic.com/settings/keys))
3. **Vercel Account** (free at [vercel.com](https://vercel.com))

## Step 1: Set Up Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project/database
3. Copy your connection string (it looks like `postgresql://username:password@host/database?sslmode=require`)
4. Keep this handy for Step 3

## Step 2: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. **DO NOT CLICK DEPLOY YET** - you need to set environment variables first

## Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Random secret for session tokens (32+ chars) | Generate with: `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Claude API key for content generation | `sk-ant-xxxxx` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL | `https://your-app.vercel.app` |
| `ADMIN_EMAILS` | Comma-separated admin email addresses | `admin@example.com` |

### How to Add Variables in Vercel

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add each variable:
   - **Key**: Variable name (e.g., `DATABASE_URL`)
   - **Value**: Your actual value
   - **Environments**: Select all (Production, Preview, Development)
3. Click "Save" for each variable

### Generating JWT_SECRET

You can generate a secure JWT_SECRET using one of these methods:

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Online (if you don't have openssl):**
```
Go to https://generate-random.org/api-key-generator
Select "256-bit" and click Generate
```

## Step 4: Initialize Database Schema

After setting environment variables, you need to push the database schema:

1. Install Vercel CLI (if not already installed):
```bash
npm i -g vercel
```

2. Link your local project to Vercel:
```bash
vercel link
```

3. Pull environment variables locally:
```bash
vercel env pull .env.local
```

4. Push database schema:
```bash
npx prisma db push
```

5. Verify schema was created:
```bash
npx prisma studio
```

## Step 5: Deploy

1. In Vercel dashboard, click **Deployments** → **Redeploy**
2. Or push to GitHub - Vercel will auto-deploy

## Step 6: Create Your First User

After successful deployment:

1. Go to your deployed URL (e.g., `https://your-app.vercel.app`)
2. Click **Sign Up**
3. Create your admin account using one of the emails you added to `ADMIN_EMAILS`
4. Login and start using the app!

## Troubleshooting

### Error: "Prisma Client Initialization Error"

**Cause:** DATABASE_URL not set or Prisma Client not generated during build

**Fix:**
1. Verify `DATABASE_URL` is set in Vercel environment variables
2. Verify `postinstall` script exists in `package.json`:
   ```json
   "scripts": {
     "postinstall": "prisma generate"
   }
   ```
3. Redeploy

### Error: "JWT_SECRET environment variable is not set"

**Cause:** JWT_SECRET not configured

**Fix:**
1. Generate a secret: `openssl rand -base64 32`
2. Add it to Vercel environment variables as `JWT_SECRET`
3. Redeploy

### Error: 500 Internal Server Error

**Cause:** Missing required environment variables

**Fix:**
1. Check Vercel logs: **Deployments** → Click deployment → **Function Logs**
2. Verify all required environment variables are set
3. Ensure DATABASE_URL is correct and database is accessible
4. Redeploy after fixing

### Error: "Cannot connect to database"

**Cause:** DATABASE_URL is incorrect or database is not accessible

**Fix:**
1. Verify DATABASE_URL in Neon dashboard
2. Ensure `?sslmode=require` is at the end of connection string
3. Test connection locally: `npx prisma db push`
4. Update DATABASE_URL in Vercel if needed

### Pages Won't Load After Deployment

**Cause:** Database schema not initialized

**Fix:**
```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Push schema to database
npx prisma db push

# Redeploy
vercel --prod
```

## Environment Variables Checklist

Before deploying, make sure you have:

- [ ] `DATABASE_URL` - Neon PostgreSQL connection string
- [ ] `JWT_SECRET` - Random 32+ character string
- [ ] `ANTHROPIC_API_KEY` - Claude API key
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel app URL
- [ ] `ADMIN_EMAILS` - Your admin email(s)
- [ ] Database schema pushed (`npx prisma db push`)

## Security Notes

1. **Never commit `.env` files** - they're already in `.gitignore`
2. **Use strong JWT_SECRET** - minimum 32 characters, random
3. **Rotate API keys** if exposed
4. **Use Neon's connection pooling** for better performance (optional)
5. **Enable Vercel's authentication** for additional security (optional)

## Performance Tips

1. **Use Vercel's Edge Functions** for faster response times (already configured)
2. **Enable caching** for static assets (automatic on Vercel)
3. **Monitor usage** in Vercel dashboard to avoid unexpected costs
4. **Use Neon's autoscaling** for better database performance

## Support

If you encounter issues:

1. Check Vercel function logs: **Deployments** → **Function Logs**
2. Check Prisma Client errors: Look for database connection issues
3. Verify all environment variables are set correctly
4. Test locally first: `npm run dev`
5. Check the [Vercel Documentation](https://vercel.com/docs)
6. Check the [Neon Documentation](https://neon.tech/docs)

## Next Steps

After successful deployment:

1. Add your first client in the dashboard
2. Upload a CSV with service/location combinations
3. Generate your first batch of SEO pages
4. Monitor generation progress in the History tab
5. Check admin stats at `/admin` (if you're an admin user)

---

**Congratulations!** 🎉 Your SEO Page Generator is now live on Vercel!
