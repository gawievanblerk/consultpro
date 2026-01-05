/**
 * Geo-detection Utility
 * Determines user's region for currency selection
 * Supports USD, ZAR (South Africa), and NGN (Nigeria)
 */

// Countries that should use ZAR (South African Rand)
const ZAR_COUNTRIES = [
  'ZA', // South Africa
  'ZW', // Zimbabwe
  'NA', // Namibia
  'BW', // Botswana
  'LS', // Lesotho
  'SZ', // Eswatini (Swaziland)
  'MZ', // Mozambique
];

// Countries that should use NGN (Nigerian Naira)
const NGN_COUNTRIES = [
  'NG', // Nigeria
];

// Map of country codes to currency
const COUNTRY_CURRENCY_MAP = {
  // African Rand region
  'ZA': 'ZAR',
  'ZW': 'ZAR',
  'NA': 'ZAR',
  'BW': 'ZAR',
  'LS': 'ZAR',
  'SZ': 'ZAR',
  'MZ': 'ZAR',
  // Nigeria
  'NG': 'NGN',
  // Default USD for all others
};

// Currency symbols and formatting
const CURRENCY_CONFIG = {
  USD: {
    symbol: '$',
    code: 'USD',
    name: 'US Dollar',
    locale: 'en-US',
    position: 'before',
  },
  ZAR: {
    symbol: 'R',
    code: 'ZAR',
    name: 'South African Rand',
    locale: 'en-ZA',
    position: 'before',
  },
  NGN: {
    symbol: '\u20A6',
    code: 'NGN',
    name: 'Nigerian Naira',
    locale: 'en-NG',
    position: 'before',
  },
};

/**
 * Get country code from IP address
 * Uses ip-api.com (free service)
 */
async function getCountryFromIP(ip) {
  // Skip for local/private IPs
  if (isPrivateIP(ip)) {
    return null;
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,country`, {
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        return {
          code: data.countryCode,
          name: data.country
        };
      }
    }
  } catch (error) {
    console.error('IP geolocation failed:', error.message);
  }

  return null;
}

/**
 * Check if IP is private/local
 */
function isPrivateIP(ip) {
  if (!ip) return true;

  // Localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true;
  }

  // Private ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^fc00:/,
    /^fe80:/
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Extract client IP from request
 */
function getClientIP(req) {
  // Check various headers set by proxies
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }

  return req.connection?.remoteAddress || req.socket?.remoteAddress || null;
}

/**
 * Determine currency based on country
 */
function getCurrencyForCountry(countryCode) {
  if (!countryCode) {
    return 'USD';
  }

  const code = countryCode.toUpperCase();
  return COUNTRY_CURRENCY_MAP[code] || 'USD';
}

/**
 * Get geo info from request
 */
async function getGeoInfo(req) {
  const clientIP = getClientIP(req);
  const country = await getCountryFromIP(clientIP);

  // Check Accept-Language header for hints
  const acceptLanguage = req.headers['accept-language'] || '';
  const suggestsZA = acceptLanguage.includes('en-ZA') || acceptLanguage.includes('af-ZA');
  const suggestsNG = acceptLanguage.includes('en-NG');

  // Determine currency
  let currency = 'USD';
  let detectedCountry = null;

  if (country) {
    currency = getCurrencyForCountry(country.code);
    detectedCountry = country;
  } else if (suggestsNG) {
    currency = 'NGN';
    detectedCountry = { code: 'NG', name: 'Nigeria' };
  } else if (suggestsZA) {
    currency = 'ZAR';
    detectedCountry = { code: 'ZA', name: 'South Africa' };
  }

  return {
    ip: clientIP,
    country: detectedCountry,
    currency,
    currencies: ['USD', 'ZAR', 'NGN'],
    config: CURRENCY_CONFIG[currency]
  };
}

/**
 * Express middleware to attach geo info
 */
async function geoMiddleware(req, res, next) {
  try {
    req.geo = await getGeoInfo(req);
  } catch (error) {
    console.error('Geo middleware error:', error);
    req.geo = {
      ip: null,
      country: null,
      currency: 'USD',
      currencies: ['USD', 'ZAR', 'NGN'],
      config: CURRENCY_CONFIG['USD']
    };
  }
  next();
}

/**
 * Format price for display
 */
function formatPrice(amount, currency) {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['USD'];
  const formatted = amount.toLocaleString(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return `${config.symbol}${formatted}`;
}

module.exports = {
  getCountryFromIP,
  getClientIP,
  getCurrencyForCountry,
  getGeoInfo,
  geoMiddleware,
  formatPrice,
  CURRENCY_CONFIG,
  ZAR_COUNTRIES,
  NGN_COUNTRIES
};
