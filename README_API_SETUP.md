# SEO Page Generator - API Setup Guide

## Overview

The SEO Page Generator uses the **Claude API** with a **simple in-memory queue** for reliable page generation. This guide will help you set up the system.

**No Redis Required!** Simple setup with just Node.js and PostgreSQL.

---

## Architecture

```
User Upload CSV → API Endpoint → Simple Queue → Claude API → WordPress
                                      ↓
                              Database (Postgres)
```

**Key Features:**
- **Rate Limiting:** 3 pages/min (20 seconds between API calls)
- **Sequential Generation:** One page at a time to respect rate limits
- **Parallel Validation/Publishing:** Don't wait for previous page
- **Error Tracking:** Comprehensive error logs
- **Database Polling:** Real-time progress updates

---

## Prerequisites

1. **Node.js** 18+ installed
2. **PostgreSQL** database (Neon or local)
3. **Anthropic API Key** (from https://console.anthropic.com)

That's it! No Redis or other infrastructure required.

---

## Setup Instructions

### 1. Get Anthropic API Key

1. Go to https://console.anthropic.com/settings/keys
2. Create new API key
3. Copy the key (starts with `sk-ant-...`)

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Database
DATABASE_URL="your-postgresql-url"

# Authentication
JWT_SECRET="your-secret-key"

# Claude API
ANTHROPIC_API_KEY="sk-ant-your-key-here"

# Admin Access (optional)
ADMIN_EMAILS="your-email@example.com"
```

### 3. Update Database Schema

```bash
npx prisma db push
```

This will add:
- `ErrorLog` table for tracking errors
- New fields in `GeneratedPage` for content storage
- Indexes for performance

### 4. Start the Application

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at http://localhost:3000

---

## Usage

### For Regular Users

1. **Login** to your account
2. **Add a client** with WordPress credentials
3. **Go to Generate Pages tab**
4. **Upload CSV** with page data
5. **Click "Start Generation"**
6. Watch real-time progress as pages are generated

### For Admins (Future Feature)

Admin dashboard coming in Part 2! Will include:
- System health monitoring
- Real-time job tracking
- Error logs with filtering
- Usage statistics and cost estimates
- User activity tracking

---

## API Endpoints

### `POST /api/generate`
Queue a batch of pages for generation.

**Request:**
```json
{
  "clientId": "client_xxx",
  "pages": [
    {
      "pageType": "Location Service",
      "pageName": "Roof Repair in Phoenix AZ",
      "externalLinkSection": "benefits-1",
      "omitSections": ["FAQ"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "batchId": "batch_1234_abcd",
  "message": "Batch queued successfully. 5 pages will be generated."
}
```

### `GET /api/generate?batchId=xxx`
Get status of a batch.

**Response:**
```json
{
  "success": true,
  "batch": {
    "id": "batch_1234_abcd",
    "status": "processing",
    "totalPages": 5,
    "successfulPages": 3,
    "failedPages": 0,
    "pages": [
      {
        "pageName": "Roof Repair in Phoenix AZ",
        "status": "success",
        "publishedUrl": "https://example.com/roof-repair-phoenix",
        "timeElapsed": 45000
      }
    ]
  }
}
```

### `GET /api/admin/stats`
Get system statistics (admin only).

---

## Rate Limiting

The system limits page generation to **3 pages per minute** (20 seconds between API calls) to comply with Claude API rate limits.

**To adjust:**
Edit `src/lib/simple-queue.ts`:
```typescript
const MIN_INTERVAL_MS = 20000; // Change this (milliseconds)
```

---

## Troubleshooting

### Claude API Errors

**Error:** `Invalid API key`

**Solutions:**
1. Verify `ANTHROPIC_API_KEY` in `.env`
2. Check key is active at https://console.anthropic.com
3. Ensure key starts with `sk-ant-`

**Error:** `Rate limit exceeded`

**Solutions:**
1. Increase delay in `src/lib/simple-queue.ts` (MIN_INTERVAL_MS)
2. Wait between batch submissions
3. Upgrade Claude API plan for higher limits

### Database Errors

**Error:** `Table does not exist`

**Solution:**
```bash
npx prisma db push
npx prisma generate
```

### Admin Dashboard Access Denied

**Error:** `403 Forbidden: Admin access required`

**Solution:**
Add your email to `.env`:
```env
ADMIN_EMAILS="youremail@example.com"
```

---

## Production Deployment

### Vercel Deployment

1. **Deploy to Vercel:**
   ```bash
   vercel
   ```

2. **Add environment variables** in Vercel dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `ADMIN_EMAILS` (optional)

That's it! No additional infrastructure needed.

### Alternative: Railway/Render

1. **Create project** on Railway or Render
2. **Connect GitHub repository**
3. **Add environment variables:**
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ANTHROPIC_API_KEY`
   - `ADMIN_EMAILS`

4. **Deploy** - Your app will be live!

---

## Monitoring & Scaling

### Current Setup (MVP)
- Simple in-memory queue
- Sequential generation with parallel validation/publishing
- Database-based progress tracking
- Error logging to database

### Recommended for Scale

**Monitoring:**
- **DataDog** or **New Relic** for APM
- **Sentry** for error tracking
- **LogDNA** or **Papertrail** for log aggregation

**Alerting:**
- **PagerDuty** for on-call alerts
- **Opsgenie** for incident management

**Scaling Options:**
- Add dedicated worker processes
- Implement job queue (Redis/BullMQ) for distributed processing
- Horizontal scaling with load balancer

**Database:**
- Connection pooling (PgBouncer)
- Read replicas for analytics
- Regular backups

---

## Cost Estimates

**Claude API:**
- ~$0.06 per page (4K tokens input + output)
- 1,000 pages/month = ~$60
- 10,000 pages/month = ~$600

**Database:**
- Neon: Free tier sufficient for MVP
- Paid: $19+/month for production

**Hosting:**
- Vercel: Free tier sufficient for MVP
- Pro: $20/month for production features

**Total MVP:** Free (just Claude API usage costs)
**Total at Scale:** $50-700/month depending on volume

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review error logs in database (`ErrorLog` table)
3. Check Claude API status at https://status.anthropic.com
4. Verify environment variables are set correctly
5. Check dev server console output for errors

---

## Future Enhancements

- [ ] Scheduled generation (cron jobs)
- [ ] Webhook notifications
- [ ] Batch prioritization
- [ ] Multi-tenant worker pools
- [ ] GraphQL API
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics dashboard
- [ ] A/B testing for content variations

---

**Version:** 2.0.0
**Last Updated:** 2025-01-13
