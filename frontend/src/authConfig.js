import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';

const msalConfig = {
  auth: {
    clientId,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: { logLevel: LogLevel.Warning },
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};

export const managementRequest = {
  scopes: ['https://management.azure.com/user_impersonation'],
};

let _msalInstance = null;
let _initPromise = null;

/**
 * Lazily create + initialize the MSAL instance.
 * Returns null if clientId is not configured.
 */
export async function getMsalInstance() {
  if (!clientId) return null;
  if (_msalInstance) return _msalInstance;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const instance = new PublicClientApplication(msalConfig);
    await instance.initialize();
    await instance.handleRedirectPromise();
    _msalInstance = instance;
    return instance;
  })();

  return _initPromise;
}

/**
 * Get the instance synchronously (only works after getMsalInstance() resolved).
 */
export function getMsalInstanceSync() {
  return _msalInstance;
}
