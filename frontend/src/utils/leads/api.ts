import { useAuthStore } from '../../store/authStore';

const BASE_URL = (import.meta as any).env?.VITE_LEADS_API_URL || '';

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

const requestCache = new Map<string, Promise<any>>();
const CACHE_TTL = 100;

export const api = {
  async request(endpoint: string, options: RequestOptions = {}) {
    const authState = useAuthStore.getState();
    const token = authState.token || localStorage.getItem('token') || localStorage.getItem('leadflow_token');
    const logout = authState.logout || (() => {});

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (options.bodyData) {
      config.body = JSON.stringify(options.bodyData);
    }

    const method = options.method || 'GET';
    if (method === 'GET') {
      const cacheKey = `${method}:${endpoint}`;
      if (requestCache.has(cacheKey)) {
        return requestCache.get(cacheKey);
      }

      const promise = this._makeRequest(endpoint, config, token, logout);
      requestCache.set(cacheKey, promise);

      setTimeout(() => requestCache.delete(cacheKey), CACHE_TTL);

      return promise;
    }

    return this._makeRequest(endpoint, config, token, logout);
  },

  async _makeRequest(endpoint: string, config: RequestInit, token: string | null, logout: () => void) {
    try {
      let targetUrl = endpoint;
      if (endpoint.startsWith('/api/company/') || endpoint.startsWith('/api/employees') || endpoint.startsWith('/api/users')) {
        targetUrl = `${BASE_URL}${endpoint}`;
      } else if (endpoint.startsWith('/api/leads-engine')) {
        targetUrl = `${BASE_URL}${endpoint}`;
      } else if (endpoint.startsWith('/api/')) {
        targetUrl = `${BASE_URL}/api/leads-engine${endpoint.substring(4)}`;
      } else {
        targetUrl = `${BASE_URL}${endpoint}`;
      }

      const response = await fetch(targetUrl, config);

      if (response.status === 401) {
        console.warn('Leads API 401 Unauthorized for endpoint:', endpoint);
        throw new Error('Unauthorized access to Lead Engine.');
      }

      if (!response.ok) {
        if (response.status === 502 || response.status === 503 || response.status === 504 || response.status === 404) {
          console.warn(`Leads API returned status ${response.status} for endpoint ${endpoint}. Returning safe fallback.`);
          if (endpoint.includes('/statuses')) return [];
          if (endpoint.includes('/leads')) return [];
          if (endpoint.includes('/analytics') || endpoint.includes('/dashboard')) return { leads: [], total: 0 };
        }

        let errMsg = 'An error occurred';
        const clonedResponse = response.clone();
        try {
          const errData = await response.json();
          errMsg = errData.message || errData.error || errMsg;
        } catch (_) {
          try {
            errMsg = await clonedResponse.text();
          } catch (textErr) {
            errMsg = response.statusText || errMsg;
          }
        }
        throw new Error(errMsg);
      }

      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error: any) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },

  get(endpoint: string, options: Omit<RequestOptions, 'method' | 'bodyData'> = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, bodyData?: any, options: Omit<RequestOptions, 'method' | 'bodyData'> = {}) {
    return this.request(endpoint, { ...options, method: 'POST', bodyData });
  },

  patch(endpoint: string, bodyData?: any, options: Omit<RequestOptions, 'method' | 'bodyData'> = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', bodyData });
  },

  put(endpoint: string, bodyData?: any, options: Omit<RequestOptions, 'method' | 'bodyData'> = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', bodyData });
  },

  delete(endpoint: string, options: Omit<RequestOptions, 'method' | 'bodyData'> = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};
