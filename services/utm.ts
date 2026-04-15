
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

export const appendUTMParams = (url: string): string => {
  if (!url) return url;
  
  const utms = getUTMParams();
  if (Object.keys(utms).length === 0) return url;

  try {
    // Check if it's a full URL or a relative path
    const isFullUrl = url.startsWith('http://') || url.startsWith('https://');
    const urlObj = isFullUrl ? new URL(url) : new URL(url, window.location.origin);
    
    Object.entries(utms).forEach(([key, value]) => {
      // Only append if not already present in the target URL
      if (!urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, value);
      }
    });

    // If it was a relative URL, return only the path + search + hash
    if (!isFullUrl && url.startsWith('/')) {
        return urlObj.pathname + urlObj.search + urlObj.hash;
    }

    return urlObj.toString();
  } catch (e) {
    console.error('Error appending UTM params:', e);
    return url;
  }
};
