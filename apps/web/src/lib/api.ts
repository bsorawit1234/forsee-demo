import { getBookingControllerOpsListUrl } from '@forsee/api-client';

export type ApiBooking = {
  id: string;
  bookingNumber: string;
  customer?: string;
  service?: string;
  site?: string;
  requestedStartAt: string;
  requestedEndAt: string;
  bookingStatus: string;
  assignmentStatus: string;
  jobStage: string;
  slaHealth: string;
  vehicle?: string | null;
  vehicleId?: string | null;
  vehicleRegistrationNumber?: string | null;
  vehicleType?: string | null;
  customerSiteId?: string;
  serviceCode?: string;
  customerNote?: string | null;
  estimatedVolume?: number | string | null;
  volumeUnit?: string | null;
  version?: number;
  createdAt?: string;
  driverUserId?: string | null;
};

export type ApiBookingsResponse = { items: ApiBooking[]; total: number };

export type ApiVehicle = {
  id: string;
  registrationNumber: string;
  displayName: string;
  type: string;
  status: string;
  bookingId?: string | null;
};

export type ApiVehiclesResponse = { items: ApiVehicle[] };

export type ApiSessionUser = {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
  organizationType: 'OPERATOR' | 'CUSTOMER';
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
};

export type ApiSessionResponse = { user: ApiSessionUser };
export type ApiCustomerSitesResponse = { items: Array<{ id: string; name: string; addressLine: string; district?: string | null; province?: string | null }> };
export type ApiServicesResponse = Array<{ code: string; name: string; description?: string | null; durationMinutes: number; vehicleType: string }>;

export type ApiAvailabilitySlot = {
  start: string;
  end: string;
  capacity: number;
  available: boolean;
  remaining: number;
};

export type ApiAvailabilityResponse = {
  date: string;
  serviceCode: string;
  vehicleType?: string;
  fleetSize: number;
  capacity: number;
  slots: ApiAvailabilitySlot[];
};

// Live API is the default for local development. Set VITE_API_ENABLED=false for the
// fixture-only showcase mode when PostgreSQL is not available.
const enabled = import.meta.env.VITE_API_ENABLED !== 'false';

export function isApiEnabled() {
  return enabled;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init });
  const body = await response.json().catch(() => null) as { message?: string | string[]; error?: string } | null;
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? body?.error;
    throw new Error(message ? String(message) : `API ${response.status}`);
  }
  return body as T;
}

export function fetchOperationsBookings() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBookingsResponse>(getBookingControllerOpsListUrl());
}

export function login(email: string, password: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiSessionResponse>('/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
}

export function loginDemo(portal: 'company' | 'customer') {
  return login(portal === 'company' ? 'owner@forsee.example' : 'customer@thairung.example', 'demo1234');
}

export function fetchSession() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiSessionResponse>('/api/v1/auth/me');
}

export function logout() {
  if (!enabled) return Promise.resolve({ ok: true });
  return request<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST' });
}

export function fetchCustomerBookings() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBookingsResponse>('/api/v1/customer/bookings');
}

export function fetchCustomerBooking(id: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>(`/api/v1/customer/bookings/${id}`);
}

export function fetchCustomerSites() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiCustomerSitesResponse>('/api/v1/catalog/customer/sites');
}

export function fetchServices() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiServicesResponse>('/api/v1/catalog/services');
}

export function confirmOperationBooking(id: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>(`/api/v1/ops/bookings/${id}/confirm`, { method: 'POST' });
}

export function assignOperationBooking(id: string, payload: { vehicleId: string; driverUserId?: string; reason?: string }) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>(`/api/v1/ops/bookings/${id}/assign`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export function advanceOperationBooking(id: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>(`/api/v1/ops/bookings/${id}/advance`, { method: 'POST' });
}

export function fetchOperationsVehicles() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiVehiclesResponse>('/api/v1/ops/vehicles');
}

export function fetchCustomerAvailability(serviceCode: string, date: string, customerSiteId?: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  const params = new URLSearchParams({ serviceCode, date });
  if (customerSiteId) params.set('customerSiteId', customerSiteId);
  return request<ApiAvailabilityResponse>(`/api/v1/catalog/customer/availability?${params.toString()}`);
}

export function submitCustomerBooking(payload: { serviceCode: string; customerSiteId: string; requestedDate: string; requestedStart: string; requestedEnd: string; estimatedVolume?: number; volumeUnit?: string; customerNote?: string }) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>('/api/v1/customer/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export function watchOperationEvents(onEvent: () => void) {
  if (!enabled || typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource('/api/v1/events', { withCredentials: true });
  source.onmessage = onEvent;
  ['booking.created', 'booking.confirmed', 'booking.assignment.changed', 'job.stage.changed'].forEach((eventName) => source.addEventListener(eventName, onEvent));
  // EventSource automatically retries transient connection failures. Keeping the
  // connection open lets the UI catch up after the API restarts.
  return () => source.close();
}
