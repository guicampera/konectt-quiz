
export interface UserContext {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
  language?: string;
  screenResolution?: string;
  pageUrl?: string;
  referrer?: string;
  timezone?: string;
  platform?: string;
  city?: string;
  region?: string;
  country?: string;
}

const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
};

export const getUTMParams = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  const utms: Record<string, string> = {};
  
  const utmKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'ttclid'
  ];

  utmKeys.forEach(key => {
    const value = params.get(key);
    if (value) {
      utms[key] = value;
    }
  });

  return utms;
};

export const getUserContext = async (): Promise<UserContext> => {
  const utms = getUTMParams();
  const fbp = getCookie('_fbp');
  const fbc = getCookie('_fbc');
  
  let geoData: any = {};
  try {
    // ipapi.co provides IP + City + Region + Country in one request
    const response = await fetch('https://ipapi.co/json/', { priority: 'low' });
    geoData = await response.json();
  } catch (e) {
    console.warn('Could not fetch geolocation data:', e);
    // Fallback to ipify if ipapi fails (just for IP)
    try {
      const resp = await fetch('https://api.ipify.org?format=json', { priority: 'low' });
      const data = await resp.json();
      geoData.ip = data.ip;
    } catch (e2) {}
  }

  return {
    ...utms,
    fbp,
    fbc,
    ip: geoData.ip || '',
    city: geoData.city,
    region: geoData.region, // This is the state
    country: geoData.country_name,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    pageUrl: window.location.href,
    referrer: document.referrer,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: (navigator as any).platform || 'unknown'
  };
};
