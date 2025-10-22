/**
 * Schema.org Structured Data Generator
 * Generates JSON-LD markup for SEO rich snippets
 */

// Schema.org business types for dropdown
export const BUSINESS_TYPES = [
  // Generic Options
  { value: 'LocalBusiness', label: 'Local Business (Generic)' },
  { value: 'ProfessionalService', label: 'Professional Service (Generic)' },
  { value: 'HomeAndConstructionBusiness', label: 'Home & Construction Business (Generic)' },

  // Home Services & Construction
  { value: 'Plumber', label: 'Plumber' },
  { value: 'RoofingContractor', label: 'Roofing Contractor' },
  { value: 'Electrician', label: 'Electrician' },
  { value: 'GeneralContractor', label: 'General Contractor' },
  { value: 'HousePainter', label: 'House Painter / Painting Contractor' },
  { value: 'Locksmith', label: 'Locksmith' },
  { value: 'HVACBusiness', label: 'HVAC / Heating & Cooling' },
  { value: 'LandscapeContractor', label: 'Landscaping / Landscape Contractor' },
  { value: 'PestControlService', label: 'Pest Control Service' },
  { value: 'CleaningService', label: 'Cleaning Service / Maid Service' },
  { value: 'WindowCovering', label: 'Window Covering / Blinds' },
  { value: 'FlooringContractor', label: 'Flooring Contractor' },
  { value: 'CarpetInstaller', label: 'Carpet Installer' },
  { value: 'PavingContractor', label: 'Paving / Asphalt Contractor' },
  { value: 'FenceInstaller', label: 'Fence Installer / Fencing' },
  { value: 'PoolAndSpaService', label: 'Pool & Spa Service' },
  { value: 'GarageDoorService', label: 'Garage Door Service' },
  { value: 'HandymanService', label: 'Handyman Service' },
  { value: 'ConcreteContractor', label: 'Concrete Contractor' },
  { value: 'DeckAndPatioBuilder', label: 'Deck & Patio Builder' },
  { value: 'GutterService', label: 'Gutter Service / Installation' },
  { value: 'InsulationContractor', label: 'Insulation Contractor' },
  { value: 'MasonryContractor', label: 'Masonry / Brick Contractor' },
  { value: 'RemodelingContractor', label: 'Remodeling / Renovation Contractor' },
  { value: 'SidingContractor', label: 'Siding Contractor' },
  { value: 'SolarInstaller', label: 'Solar Panel Installer' },
  { value: 'TreeService', label: 'Tree Service / Arborist' },
  { value: 'WaterproofingContractor', label: 'Waterproofing Contractor' },
  { value: 'WindowInstaller', label: 'Window Installer / Replacement' },

  // Moving & Storage
  { value: 'MovingCompany', label: 'Moving Company / Movers' },
  { value: 'StorageFacility', label: 'Storage Facility / Self Storage' },

  // Automotive
  { value: 'AutoRepair', label: 'Auto Repair / Mechanic' },
  { value: 'AutoBodyShop', label: 'Auto Body Shop / Collision Repair' },
  { value: 'AutoDealer', label: 'Auto Dealer / Car Dealership' },
  { value: 'CarWash', label: 'Car Wash / Auto Detailing' },
  { value: 'TowingService', label: 'Towing Service' },

  // Legal & Financial
  { value: 'Attorney', label: 'Attorney / Law Firm' },
  { value: 'Accountant', label: 'Accountant / CPA / Tax Service' },
  { value: 'InsuranceAgency', label: 'Insurance Agency' },
  { value: 'FinancialService', label: 'Financial Service / Advisor' },
  { value: 'RealEstateAgent', label: 'Real Estate Agent / Agency' },

  // Medical & Wellness
  { value: 'Dentist', label: 'Dentist / Dental Office' },
  { value: 'Physician', label: 'Physician / Doctor / Medical Practice' },
  { value: 'Optician', label: 'Optician / Eye Care' },
  { value: 'VeterinaryCare', label: 'Veterinary Care / Vet Clinic' },
  { value: 'Chiropractor', label: 'Chiropractor' },
  { value: 'MedicalClinic', label: 'Medical Clinic / Urgent Care' },
  { value: 'PhysicalTherapy', label: 'Physical Therapy' },

  // Beauty & Personal Care
  { value: 'BeautySalon', label: 'Beauty Salon / Hair Salon' },
  { value: 'BarberShop', label: 'Barber Shop' },
  { value: 'NailSalon', label: 'Nail Salon' },
  { value: 'DaySpa', label: 'Day Spa / Spa' },
  { value: 'TattooParlor', label: 'Tattoo Parlor' },

  // Pet Services
  { value: 'PetGrooming', label: 'Pet Grooming' },
  { value: 'PetStore', label: 'Pet Store / Pet Supply' },
  { value: 'DogTraining', label: 'Dog Training' },
  { value: 'KennelBoarding', label: 'Kennel / Pet Boarding' },

  // Food & Dining
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Bakery', label: 'Bakery' },
  { value: 'FoodEstablishment', label: 'Food Establishment / Catering' },
  { value: 'CafeOrCoffeeShop', label: 'Cafe / Coffee Shop' },

  // Fitness & Recreation
  { value: 'ExerciseGym', label: 'Gym / Fitness Center' },
  { value: 'YogaStudio', label: 'Yoga Studio' },
  { value: 'SportsClub', label: 'Sports Club / Athletic Facility' },

  // Entertainment & Events
  { value: 'EventPlanning', label: 'Event Planning / Event Planner' },
  { value: 'PhotographyService', label: 'Photography Service / Photographer' },
  { value: 'VideoProductionService', label: 'Video Production Service' },
  { value: 'DJService', label: 'DJ Service' },

  // Retail & Shopping
  { value: 'Store', label: 'Store / Retail Shop (Generic)' },
  { value: 'FurnitureStore', label: 'Furniture Store' },
  { value: 'HardwareStore', label: 'Hardware Store' },
  { value: 'ElectronicsStore', label: 'Electronics Store' },
  { value: 'ClothingStore', label: 'Clothing Store / Boutique' },

  // Other Professional Services
  { value: 'ComputerRepair', label: 'Computer Repair / IT Service' },
  { value: 'PrintShop', label: 'Print Shop / Printing Service' },
  { value: 'MarketingAgency', label: 'Marketing Agency / SEO Company' },
  { value: 'ArchitectOffice', label: 'Architect / Architectural Firm' },
  { value: 'EngineeringFirm', label: 'Engineering Firm' },
  { value: 'SecurityService', label: 'Security Service / Alarm Company' },
  { value: 'WasteManagement', label: 'Waste Management / Junk Removal' },
] as const;

export interface SchemaGenerationParams {
  // Company info
  companyName: string;
  companyWebsite: string;
  businessPhone?: string;
  businessAddress?: string;
  businessType?: string;
  gbpUrl?: string;

  // Page-specific info
  service: string;
  location: string;
  primaryKeyword: string;
  pageType: string;

  // Content
  faqs?: Array<{ question: string; answer: string }>;
}

/**
 * Parse address into structured components
 */
function parseAddress(address?: string): {
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
} {
  if (!address) return {};

  // Expected format: "123 Main St, City, State 12345"
  // or: "123 Main St, City, ST 12345"
  const parts = address.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    const streetAddress = parts[0];
    const city = parts[1];
    const stateZip = parts[2];

    // Extract state and zip from "CA 92008" or "California 92008"
    const stateZipMatch = stateZip.match(/^(.+?)\s+(\d{5})$/);
    if (stateZipMatch) {
      return {
        streetAddress,
        city,
        state: stateZipMatch[1],
        postalCode: stateZipMatch[2],
      };
    }

    return { streetAddress, city, state: stateZip };
  }

  return {};
}

/**
 * Parse location into city and state
 */
function parseLocation(location: string): { city: string; state?: string } {
  const parts = location.split(',').map(p => p.trim());
  return {
    city: parts[0],
    state: parts[1],
  };
}

/**
 * Get area served type based on page type
 */
function getAreaServedType(pageType: string): 'City' | 'AdministrativeArea' {
  return pageType === 'Nested Broad Stroke' ? 'AdministrativeArea' : 'City';
}

/**
 * Generate LocalBusiness schema
 */
function generateLocalBusinessSchema(params: SchemaGenerationParams): any {
  const { companyName, companyWebsite, businessPhone, businessAddress, businessType, gbpUrl, location } = params;

  const parsedAddress = parseAddress(businessAddress);
  const parsedLocation = parseLocation(location);
  const areaServedType = getAreaServedType(params.pageType);

  const schema: any = {
    '@type': businessType || 'LocalBusiness',
    name: companyName,
    url: companyWebsite,
  };

  // Add phone if provided
  if (businessPhone) {
    schema.telephone = businessPhone;
  }

  // Add address if provided
  if (parsedAddress.streetAddress || parsedAddress.city) {
    schema.address = {
      '@type': 'PostalAddress',
    };
    if (parsedAddress.streetAddress) schema.address.streetAddress = parsedAddress.streetAddress;
    if (parsedAddress.city) schema.address.addressLocality = parsedAddress.city;
    if (parsedAddress.state) schema.address.addressRegion = parsedAddress.state;
    if (parsedAddress.postalCode) schema.address.postalCode = parsedAddress.postalCode;
  }

  // Add area served
  schema.areaServed = {
    '@type': areaServedType,
    name: parsedLocation.city,
  };
  if (parsedLocation.state) {
    schema.areaServed.containedInPlace = {
      '@type': 'State',
      name: parsedLocation.state,
    };
  }

  // Add Google Business Profile link if provided
  if (gbpUrl) {
    schema.hasMap = gbpUrl;
  }

  return schema;
}

/**
 * Generate Organization schema (for pages without location)
 */
function generateOrganizationSchema(params: SchemaGenerationParams): any {
  const { companyName, companyWebsite, businessPhone } = params;

  const schema: any = {
    '@type': 'Organization',
    name: companyName,
    url: companyWebsite,
  };

  if (businessPhone) {
    schema.telephone = businessPhone;
  }

  return schema;
}

/**
 * Generate FAQPage schema
 */
function generateFAQSchema(faqs: Array<{ question: string; answer: string }>): any {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate Service schema
 */
function generateServiceSchema(params: SchemaGenerationParams): any {
  const { service, companyName, businessType, location } = params;
  const parsedLocation = parseLocation(location);

  const schema: any = {
    '@type': 'Service',
    serviceType: service,
    provider: {
      '@type': businessType || 'LocalBusiness',
      name: companyName,
    },
  };

  // Add area served if location-specific page
  if (location) {
    schema.areaServed = {
      '@type': getAreaServedType(params.pageType),
      name: parsedLocation.city,
    };
    if (parsedLocation.state) {
      schema.areaServed.containedInPlace = {
        '@type': 'State',
        name: parsedLocation.state,
      };
    }
  }

  return schema;
}

/**
 * Main function: Generate complete structured data for a page
 */
export function generateStructuredData(params: SchemaGenerationParams): any {
  const { pageType, faqs } = params;
  const schemaGraph: any[] = [];

  // Determine if page has location
  const hasLocation = pageType === 'Location Service' || pageType === 'Broad Stroke' || pageType === 'Nested Broad Stroke';

  // 1. Business/Organization Schema (ALWAYS)
  if (hasLocation) {
    schemaGraph.push(generateLocalBusinessSchema(params));
  } else {
    schemaGraph.push(generateOrganizationSchema(params));
  }

  // 2. FAQPage Schema (if FAQs provided)
  if (faqs && faqs.length > 0) {
    schemaGraph.push(generateFAQSchema(faqs));
  }

  // 3. Service Schema (for service-specific pages)
  if (pageType === 'Location Service' || pageType === 'Primary Service') {
    schemaGraph.push(generateServiceSchema(params));
  }

  return {
    '@context': 'https://schema.org',
    '@graph': schemaGraph,
  };
}

/**
 * Helper: Check if client has complete metadata for schema generation
 */
export function hasCompleteMetadata(client: {
  businessPhone?: string | null;
  businessAddress?: string | null;
  businessType?: string | null;
  gbpUrl?: string | null;
}): boolean {
  // At minimum, should have phone and address for good schema
  return !!(client.businessPhone && client.businessAddress);
}

/**
 * Helper: Get missing metadata fields
 */
export function getMissingMetadataFields(client: {
  businessPhone?: string | null;
  businessAddress?: string | null;
  businessType?: string | null;
  gbpUrl?: string | null;
}): string[] {
  const missing: string[] = [];

  if (!client.businessPhone) missing.push('Phone Number');
  if (!client.businessAddress) missing.push('Business Address');
  if (!client.businessType) missing.push('Business Type');
  if (!client.gbpUrl) missing.push('Google Business Profile URL');

  return missing;
}
