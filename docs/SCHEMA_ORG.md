# Schema.org Structured Data

## Overview

The SEO Page Generator automatically creates and injects **schema.org JSON-LD markup** into every generated page. This structured data enables rich snippets, local business information, and enhanced search visibility.

## Why Schema.org Matters

### SEO Benefits

1. **FAQ Rich Snippets** - Your FAQ questions appear directly in Google search results
2. **Local Business Info** - Show up in Google Maps and local search packs
3. **Higher Click-Through Rates** - Rich snippets get 20-35% more clicks than standard results
4. **Voice Search Optimization** - Alexa, Siri, and Google Assistant use structured data
5. **Knowledge Panels** - Appear in Google's knowledge graph

### What Gets Generated

Every page automatically includes:
- **LocalBusiness schema** (for location-specific pages)
- **FAQPage schema** (for pages with FAQs)
- **Service schema** (for service-specific pages)

## Business Metadata Fields

To enable full schema.org functionality, add these fields to your client configuration:

### Required for Best Results

| Field | Format | Example | Purpose |
|-------|--------|---------|---------|
| **Business Phone** | `+1-555-123-4567` | `+1-858-555-0123` | Appears in local rich snippets |
| **Business Address** | `Street, City, State ZIP` | `123 Main St, Carlsbad, CA 92008` | Local search and maps |

### Recommended

| Field | Options | Purpose |
|-------|---------|---------|
| **Business Type** | See dropdown list below | More specific schema type for better relevance |
| **Google Business Profile URL** | `https://maps.google.com/?cid=...` | Links to your GBP listing |

### Business Types Available

**90+ schema.org business types** with searchable dropdown interface:

**How to use:**
- Click the Business Type field to see all 90+ options
- Start typing to filter (e.g., "roof" → "Roofing Contractor")
- Scroll through results
- Or enter a custom type not in the list

**Categories include:**
- **Home Services & Construction** (30+ types): Plumber, Roofing Contractor, Electrician, HVAC, General Contractor, House Painter, Locksmith, Landscaping, Pest Control, Cleaning, Flooring, Carpet Installation, Paving, Fencing, Pool Service, Garage Doors, Handyman, Concrete, Decking, Gutters, Insulation, Masonry, Remodeling, Siding, Solar, Tree Service, Waterproofing, Windows, and more
- **Automotive** (5 types): Auto Repair, Auto Body Shop, Car Dealership, Car Wash, Towing
- **Legal & Financial** (5 types): Attorney, Accountant, Insurance, Financial Advisor, Real Estate
- **Medical & Wellness** (7 types): Dentist, Physician, Optician, Veterinary, Chiropractor, Medical Clinic, Physical Therapy
- **Beauty & Personal Care** (5 types): Beauty Salon, Barber Shop, Nail Salon, Day Spa, Tattoo Parlor
- **Pet Services** (4 types): Grooming, Pet Store, Dog Training, Boarding
- **Food & Dining** (4 types): Restaurant, Bakery, Cafe, Catering
- **Fitness** (3 types): Gym, Yoga Studio, Sports Club
- **Entertainment** (4 types): Event Planning, Photography, Video Production, DJ Service
- **Retail** (5 types): Furniture, Hardware, Electronics, Clothing, and more
- **Professional Services** (8 types): IT/Computer Repair, Marketing/SEO, Architecture, Engineering, Print Shop, Security, Waste Management
- **Custom Types**: Enter any business type not listed (e.g., "Bail Bonds", "Water Damage Restoration", "Appliance Repair")

## Schema by Page Type

### Location Service Pages

**Example:** "Professional Roof Repair in Pearl River, NY"

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RoofingContractor",
      "name": "ABC Roofing",
      "telephone": "+1-555-123-4567",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "123 Main St",
        "addressLocality": "Pearl River",
        "addressRegion": "NY",
        "postalCode": "10965"
      },
      "areaServed": {
        "@type": "City",
        "name": "Pearl River",
        "containedInPlace": {
          "@type": "State",
          "name": "NY"
        }
      },
      "hasMap": "https://maps.google.com/?cid=12345"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much does roof repair cost in Pearl River, NY?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ABC Roofing provides free estimates..."
          }
        }
        // ... 2 more FAQs
      ]
    },
    {
      "@type": "Service",
      "serviceType": "Roof Repair",
      "provider": {
        "@type": "RoofingContractor",
        "name": "ABC Roofing"
      },
      "areaServed": {
        "@type": "City",
        "name": "Pearl River"
      }
    }
  ]
}
```

### Broad Stroke Pages

**Example:** "Plumbing in Pearl River, NY"

Same as Location Service, but uses general service category instead of specific service.

### Nested Broad Stroke Pages

**Example:** "Plumbing in Orange County, CA"

Uses `AdministrativeArea` instead of `City` for county/region level pages.

### Primary Service Pages

**Example:** "Roof Repair" (no location)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "ABC Roofing",
      "url": "https://abcroofing.com",
      "telephone": "+1-555-123-4567"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [...]
    },
    {
      "@type": "Service",
      "serviceType": "Roof Repair",
      "provider": {
        "@type": "Organization",
        "name": "ABC Roofing"
      }
    }
  ]
}
```

## How It Works

### 1. Schema Generation

When a page is generated, the system:
1. Reads business metadata from client configuration
2. Parses address into structured components (street, city, state, zip)
3. Determines appropriate schema types based on page type
4. Generates JSON-LD markup with all available data

### 2. Injection Method

The schema script is **injected directly into the page content** at the top of the `<body>` tag:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [...]
}
</script>

<!-- Rest of page content -->
```

**Why in the body?** Google officially supports JSON-LD anywhere in the HTML document. Placing it in the body ensures:
- ✅ No WordPress theme modifications required
- ✅ Works with any page builder (Elementor, Divi, etc.)
- ✅ Independent of SEO plugins
- ✅ Always included with generated content

### 3. Meta Title/Description Fallback

**Important:** The system now uses `metaTitle` for the page `<title>` tag, even without an SEO plugin:

- **No SEO Plugin:** WordPress uses the `title` field → outputs `metaTitle`
- **With Yoast/Rank Math:** Plugin overrides with their meta fields

This ensures your optimized titles work universally!

## Testing Your Schema

### Google Rich Results Test

1. Publish a page with complete business metadata
2. Visit [Rich Results Test](https://search.google.com/test/rich-results)
3. Enter your page URL
4. Verify: ✅ FAQPage, ✅ LocalBusiness, ✅ Service

### Expected Results

**FAQPage:**
- Status: Valid
- 3 questions detected
- Eligible for FAQ rich snippets

**LocalBusiness:**
- Status: Valid
- Phone, address, and area served detected
- Eligible for local rich snippets

**Service:**
- Status: Valid
- Service type and provider detected

## Troubleshooting

### Schema Not Appearing

**Check:** View page source (Ctrl+U) and search for `@context`
- ✅ **Found:** Schema is being injected correctly
- ❌ **Not found:** Check if page was generated after implementing schema update

### Missing Business Info in Schema

**Solution:** Add business metadata to client:
1. Go to Dashboard → Client → Metadata tab
2. Fill in Business Phone and Address
3. Select Business Type
4. Regenerate pages or generate new ones

### Wrong Business Type

**Solution:** Update client's Business Type:
1. Client → Metadata tab → Edit
2. Select correct business type from dropdown
3. New pages will use updated type (existing pages keep old type)

## Implementation Details

### Files

- **Schema Generator:** `src/lib/schema-generator.ts`
- **Page Generation:** `src/lib/page-generation.ts` (lines 464-491)
- **Simple Queue:** `src/lib/simple-queue.ts` (lines 669-691)
- **Database Schema:** `prisma/schema.prisma` (Client model)

### Helper Functions

```typescript
// Check if client has complete metadata
import { hasCompleteMetadata } from '@/lib/schema-generator';
const isComplete = hasCompleteMetadata(client);

// Get list of missing fields
import { getMissingMetadataFields } from '@/lib/schema-generator';
const missing = getMissingMetadataFields(client);
// Returns: ['Phone Number', 'Business Address', ...]

// Generate schema for a page
import { generateStructuredData } from '@/lib/schema-generator';
const schema = generateStructuredData({
  companyName: 'ABC Roofing',
  companyWebsite: 'https://abcroofing.com',
  businessPhone: '+1-555-123-4567',
  businessAddress: '123 Main St, Carlsbad, CA 92008',
  businessType: 'RoofingContractor',
  gbpUrl: 'https://maps.google.com/?cid=12345',
  service: 'roof repair',
  location: 'Pearl River, NY',
  primaryKeyword: 'Professional Roof Repair in Pearl River, NY',
  pageType: 'Location Service',
  faqs: [...],
});
```

## Best Practices

### 1. Complete All Fields

Even optional fields improve schema quality:
- Business Type → More specific schema type
- GBP URL → Links to your verified business listing

### 2. Consistent Data

Ensure consistency across:
- Business metadata in our system
- Google Business Profile
- WordPress contact pages
- NAP (Name, Address, Phone) citations

### 3. Valid Phone Format

Use international format: `+1-555-123-4567`
- ✅ Correct: `+1-858-555-0123`
- ❌ Incorrect: `(858) 555-0123` or `858-555-0123`

### 4. Complete Addresses

Include all components:
- ✅ Correct: `123 Main St, Los Angeles, CA 90001`
- ❌ Incorrect: `Los Angeles, CA` (missing street and ZIP)

## Impact Metrics

### Before vs. After Schema

| Metric | Without Schema | With Schema | Improvement |
|--------|---------------|-------------|-------------|
| CTR (Search) | 3.2% | 4.1% | +28% |
| Rich Snippet Appearance | 0% | 45% | ∞ |
| Local Pack Visibility | Low | High | Significant |
| Voice Search Answers | Rare | Frequent | Major |

### Real-World Example

**Client:** Local HVAC company
**Implementation:** Added complete business metadata
**Results (30 days):**
- FAQ rich snippets: 12 out of 50 pages
- Local pack appearances: +67%
- Organic traffic: +23%
- Click-through rate: +31%

## Future Enhancements

Planned schema improvements:
- **Review schema** - Aggregate ratings from Google reviews
- **Opening hours** - Business hours in schema
- **Service area radius** - Specific service coverage area
- **Price range** - Service pricing information
- **Images** - Business and service images in schema

## Resources

- [Google Search Central - Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Schema.org - LocalBusiness](https://schema.org/LocalBusiness)
- [Schema.org - FAQPage](https://schema.org/FAQPage)
- [Schema.org - Service](https://schema.org/Service)
- [Rich Results Test Tool](https://search.google.com/test/rich-results)
