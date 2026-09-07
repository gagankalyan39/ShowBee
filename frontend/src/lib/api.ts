// ============================================================
// API CLIENT FOR SHOWBEE
// Centralizes all REST communications with backend services
// ============================================================

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('showbee_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `API error: ${res.status}`);
  }

  return data;
}

// ── AUTH API (Member 3) ──────────────────────────────────
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    request<{ success: boolean; data: { user: any; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (userData: { name: string; email: string; password: string; phone?: string }) =>
    request<{ success: boolean; data: { user: any; token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  getMe: () => request<{ success: boolean; data: any }>('/auth/me'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

// ── MOVIES API (Member 2) ─────────────────────────────────
export const movieAPI = {
  getAll: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: any[]; pagination: any }>(`/movies?${query}`);
  },
  getById: (id: string) => request<{ success: boolean; data: any }>(`/movies/${id}`),
  getShows: (movieId: string, city?: string, date?: string) => {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (date) params.append('date', date);
    return request<{ success: boolean; data: any[] }>(`/shows/movie/${movieId}?${params.toString()}`);
  },
};

// ── THEATRES API (Member 2) ───────────────────────────────
export const theatreAPI = {
  getAll: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: any[] }>(`/theatres?${query}`);
  },
  getCities: () => request<{ success: boolean; data: string[] }>('/theatres/cities'),
  getById: (id: string) => request<{ success: boolean; data: any }>(`/theatres/${id}`),
};

// ── SHOWS & SEAT LOCKING API (Member 3) ───────────────────
export const showAPI = {
  getById: (id: string) => request<{ success: boolean; data: any }>(`/shows/${id}`),
  getSeats: (showId: string) =>
    request<{ success: boolean; data: { show: any; rows: Record<string, any[]>; seats: any[] } }>(
      `/shows/${showId}/seats`
    ),
  // PESSIMISTIC LOCK
  holdSeats: (showId: string, seatIds: string[]) =>
    request<{ success: boolean; message: string; data: { heldSeats: string[]; expiresAt: string } }>(
      `/shows/${showId}/seats/hold`,
      {
        method: 'POST',
        body: JSON.stringify({ seatIds }),
      }
    ),
  releaseSeats: (showId: string, seatIds: string[]) =>
    request<{ success: boolean; message: string }>(`/shows/${showId}/seats/release`, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    }),
};

// ── BOOKINGS API (Member 3) ───────────────────────────────
export const bookingAPI = {
  create: (data: { showId: string; seatIds: string[]; offerCode?: string }) =>
    request<{ success: boolean; data: any }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyBookings: () => request<{ success: boolean; data: any[] }>('/bookings/my-bookings'),
  getById: (id: string) => request<{ success: boolean; data: any }>(`/bookings/${id}`),
  cancel: (id: string) => request<{ success: boolean; message: string }>(`/bookings/${id}/cancel`, { method: 'POST' }),
};

// ── PAYMENTS API (Member 3) ───────────────────────────────
export const paymentAPI = {
  process: (data: { bookingId: string; method: string; simulateResult?: string; paymentDetails?: any }) =>
    request<{ success: boolean; message: string; data: any }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── NOTIFICATIONS API (Member 4) ──────────────────────────
export const notificationAPI = {
  getMy: () => request<{ success: boolean; data: any[]; unreadCount: number }>('/notifications'),
  markRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' }),
};

// ── ADMIN API (Member 4) ──────────────────────────────────
export const adminAPI = {
  getDashboard: () => request<{ success: boolean; data: any }>('/admin/dashboard'),
  getUsers: () => request<{ success: boolean; data: any[] }>('/admin/users'),
  toggleUserStatus: (id: string, isActive: boolean) =>
    request<{ success: boolean; data: any }>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    }),
  getAuditLogs: () => request<{ success: boolean; data: any[] }>('/admin/audit-logs'),
  getRevenueReport: () => request<{ success: boolean; data: any[] }>('/admin/reports/revenue'),
};

// ── SYSTEM & 4-MEMBER TEAM API ────────────────────────────
export const systemAPI = {
  getTeamInfo: () =>
    request<{
      success: boolean;
      project: string;
      architecture: string;
      architect: string;
      timestamp: string;
      counts: any;
      activeShow: any;
      members: any[];
    }>('/system/team'),
  getDbTables: () =>
    request<{
      success: boolean;
      database: string;
      schemaOwner: string;
      tables: Array<{ tableName: string; columns: number; rowCount: number }>;
    }>('/system/db-tables'),
  runConcurrencyTest: () =>
    request<{
      success: boolean;
      message: string;
      seat: string;
      logs: string[];
    }>('/system/test-concurrency', { method: 'POST' }),
};
