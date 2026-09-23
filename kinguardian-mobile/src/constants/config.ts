export const getResolvedApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    if (hostname) {
      return `http://${hostname}:8000`;
    }
  }
  return 'http://localhost:8000';
};

export const CONFIG = {
  get apiUrl(): string {
    return getResolvedApiUrl();
  },
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development'
};

