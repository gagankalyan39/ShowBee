// ============================================================
// API CLIENT FOR SHOWBEE
// Centralizes all REST communications with backend services
// ============================================================

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // If on local machine, connect to local Express backend on port 5000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5001/api';
    }
    // On Vercel or cloud deployment, use same-origin relative /api
    return '/api';
  }
  return 'http://localhost:5001/api';
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('showbee_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}, customBaseUrl?: string): Promise<T> {
  const base = customBaseUrl || getApiBaseUrl();
  const url = `${base}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401 && (data.message === 'Invalid or expired token' || data.message === 'No token provided' || data.message === 'User not found or inactive')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('showbee_token');
        localStorage.removeItem('showbee_user');
        window.dispatchEvent(new CustomEvent('showbee_auth_expired', { detail: { message: data.message } }));
      }
    }
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
  // DUAL LOCK ENGINE: PESSIMISTIC vs OPTIMISTIC
  holdSeats: (showId: string, seatIds: string[], lockMode: 'PESSIMISTIC' | 'OPTIMISTIC' = 'PESSIMISTIC') =>
    request<{ success: boolean; message: string; lockMode?: string; data: { heldSeats: string[]; expiresAt: string } }>(
      `/shows/${showId}/seats/hold`,
      {
        method: 'POST',
        body: JSON.stringify({ seatIds, lockMode }),
      },
      getBookingApiUrl()
    ),
  releaseSeats: (showId: string, seatIds: string[]) =>
    request<{ success: boolean; message: string }>(`/shows/${showId}/seats/release`, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    }, getBookingApiUrl()),
};

// ── BOOKINGS API (Member 3) ───────────────────────────────
export const bookingAPI = {
  create: (data: { showId: string; seatIds: string[]; offerCode?: string }) =>
    request<{ success: boolean; data: any }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }, getBookingApiUrl()),
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
    }, getBookingApiUrl()),
};

// ── NOTIFICATIONS API (Member 4) ──────────────────────────
export const notificationAPI = {
  getMy: () => request<{ success: boolean; data: any[]; unreadCount: number }>('/notifications'),
  markRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' }),
  clearAll: () => request<{ success: boolean }>('/notifications/clear-all', { method: 'DELETE' }),
  delete: (id: string) => request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
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

  // MOVIE & MEDIA MANAGEMENT (Member 2 / Admin)
  getMovies: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: any[]; pagination: any }>(`/movies?${query}`);
  },
  updateMovie: (id: string, data: any) =>
    request<{ success: boolean; message: string; data: any }>(`/movies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  addMovieImage: (id: string, data: { url: string; image_type?: string }) =>
    request<{ success: boolean; data: any }>(`/movies/${id}/images`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeMovieImage: (id: string, imageId: string) =>
    request<{ success: boolean; message: string }>(`/movies/${id}/images/${imageId}`, {
      method: 'DELETE',
    }),
  uploadImage: (dataUrl: string, filename?: string) =>
    request<{ success: boolean; url: string; filename?: string }>('/movies/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename }),
    }),

  // SHOWS & THEATRE SCHEDULING (Member 3 / Admin)
  getAllShows: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; data: any[] }>(`/shows/admin/all?${query}`);
  },
  createShowBatch: (data: {
    movie_id: string;
    theatre_ids: string[];
    dates: string[];
    times: string[];
    base_price: number;
    tier_prices?: Record<string, number>;
    format?: string;
    screen_type?: string;
  }) =>
    request<{ success: boolean; message: string; count: number; data: any[] }>('/shows/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteShow: (id: string) =>
    request<{ success: boolean; message: string; deactivated?: boolean }>(`/shows/${id}`, {
      method: 'DELETE',
    }),
  deleteShowsBatch: (showIds: string[]) =>
    request<{ success: boolean; message: string; count: number; deleted_ids: string[] }>('/shows/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ showIds }),
    }),

  // 10,000 USER SIMULATION & BENCHMARK SUITE
  getBenchmarkShows: () => request<{ success: boolean; data: any[] }>('/admin/benchmark/shows'),
  getBenchmarkSeatMap: (showId: string) => request<{ success: boolean; data: any[] }>(`/admin/benchmark/seat-map/${showId}`),
  startBenchmark: (data: { totalUsers: number; mode: string; contention: string; showId: string; concurrencyLimit?: number }) =>
    request<{ success: boolean; message: string; runId: string; config: any }>('/admin/benchmark/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  stopBenchmark: (runId: string) =>
    request<{ success: boolean; stopped: boolean }>('/admin/benchmark/stop', {
      method: 'POST',
      body: JSON.stringify({ runId }),
    }),
  resetBenchmarkSeats: (showId: string) =>
    request<{ success: boolean; message: string }>('/admin/benchmark/reset', {
      method: 'POST',
      body: JSON.stringify({ showId }),
    }),
  getBenchmarkHistory: () => request<{ success: boolean; data: any[] }>('/admin/benchmark/history'),
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
  getObservatory: () =>
    request<{ success: boolean; timestamp: string; services: any; metrics: any }>('/system/observatory'),
};


// -- BOOKING ARCHITECTURE HELPER ---------------------------
/**
 * Returns the correct API base URL for booking operations based on
 * the architecture toggle set in the admin dashboard.
 */
export function getBookingApiUrl(): string {
  if (typeof window !== 'undefined') {
    const archMode = localStorage.getItem('showbee_architecture') || 'monolith';
    if (archMode === 'microservice') {
      const msUrl = process.env.NEXT_PUBLIC_BOOKING_API_URL;
      if (msUrl) return msUrl;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5002/api';
      }
    }
  }
  return getApiBaseUrl();
}
