// /packages/frontend/lib/utils.ts

export function normalizeDomain(rawDomain: string): string {
    const normalized = rawDomain.toLowerCase().replace(/\s+/g, '_');
    const domainFolderMap: { [key: string]: string } = {
      business: 'business_retail',
      crime: 'crime_chicago',
      farming: 'farming_ndvi',
      finance: 'finance_stocks',
      healthcare: 'healthcare_covid',
      social: 'social_twitter',
      space: 'space_neo',
      sports: 'sports_nba',
    };
  
    // Try matching normalized domain directly
    if (Object.keys(domainFolderMap).includes(normalized)) {
      return normalized;
    }
  
    // Try matching as a folder name (e.g., 'business_retail' -> 'business')
    const domainKey = Object.keys(domainFolderMap).find(
      (key) => domainFolderMap[key].toLowerCase() === normalized
    );
    if (domainKey) {
      return domainKey;
    }
  
    // Try partial matching for YAML domains (e.g., 'Business Retail' -> 'business')
    const rawLower = rawDomain.toLowerCase().replace(/\s+/g, '');
    for (const [key, value] of Object.entries(domainFolderMap)) {
      const keyLower = key.toLowerCase().replace(/\s+/g, '');
      const valueLower = value.toLowerCase().replace(/\s+/g, '');
      if (rawLower === keyLower || rawLower === valueLower) {
        return key;
      }
    }
  
    console.warn(`Unable to normalize domain: ${rawDomain}. Defaulting to lowercase with underscores.`);
    return normalized;
  }