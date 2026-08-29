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

const enabled = import.meta.env.VITE_API_ENABLED === 'true';

export function isApiEnabled() {
  return enabled;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

export function fetchOperationsBookings() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBookingsResponse>(getBookingControllerOpsListUrl());
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

export function submitCustomerBooking(payload: { serviceCode: string; customerSiteId: string; requestedDate: string; requestedStart: string; requestedEnd: string; estimatedVolume?: number; customerNote?: string }) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>('/api/v1/customer/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export function watchOperationEvents(onEvent: () => void) {
  if (!enabled || typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource('/api/v1/events', { withCredentials: true });
  source.onmessage = onEvent;
  source.onerror = () => source.close();
  return () => source.close();
}
