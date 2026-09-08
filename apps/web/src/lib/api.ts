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
  customerOrganizationId?: string;
  serviceCode?: string;
  customerNote?: string | null;
  estimatedVolume?: number | string | null;
  volumeUnit?: string | null;
  version?: number;
  createdAt?: string;
  driverUserId?: string | null;
  source?: string;
  createdByUserId?: string;
  createdBy?: { id: string; displayName: string; role?: string } | null;
  updatedByUserId?: string | null;
  updatedBy?: { id: string; displayName: string } | null;
  responsibleUserId?: string | null;
  responsibleUser?: { id: string; displayName: string } | null;
  lastChangeReason?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  tasks?: ApiTask[];
  revisions?: ApiBookingRevision[];
};

export type ApiBookingRevision = {
  id: string;
  version: number;
  actorUserId: string;
  action: string;
  reason?: string | null;
  changedFields: Record<string, { before: unknown; after: unknown }> | Record<string, unknown>;
  beforeJson: Record<string, unknown>;
  afterJson: Record<string, unknown>;
  occurredAt: string;
};

export type ApiBookingDetail = ApiBooking & {
  history?: Array<{ id: string; statusType: string; fromValue?: string | null; toValue: string; actorUserId?: string; note?: string | null; occurredAt: string }>;
  events?: Array<{ id: string; eventType: string; actorUserId?: string; note?: string | null; occurredAt: string }>;
};

export type ApiTask = {
  id: string;
  bookingId: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigneeUserId?: string | null;
  assignee?: { id: string; displayName: string } | null;
  dueAt?: string | null;
  isRequired: boolean;
  version: number;
  completedAt?: string | null;
  createdBy?: { id: string; displayName: string } | null;
  updatedBy?: { id: string; displayName: string } | null;
  createdAt: string;
  updatedAt: string;
  activities?: Array<{ id: string; action: string; reason?: string | null; note?: string | null; actorUserId: string; occurredAt: string }>;
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
export type ApiCustomersResponse = { items: Array<{ id: string; name: string; bookingCount: number; siteCount: number }> };
export type ApiSitesResponse = { items: Array<{ id: string; name: string; addressLine: string; district?: string | null; province?: string | null; contactName?: string | null; contactPhone?: string | null }> };
export type ApiUsersResponse = { items: Array<{ id: string; displayName: string; email: string; role?: string }> };
export type ApiTasksResponse = { items: ApiTask[]; total: number };
export type ApiAuditLog = { id: string; actorUserId?: string | null; organizationId?: string | null; action: string; entityType: string; entityId: string; beforeJson?: Record<string, unknown> | null; afterJson?: Record<string, unknown> | null; createdAt: string; actorUser?: { id: string; displayName: string; email: string } | null };
export type ApiAuditResponse = { items: ApiAuditLog[]; total: number; page: number; pageSize: number };

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

export function fetchOperationBooking(id: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBookingDetail>(`/api/v1/ops/bookings/${id}`);
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

export function fetchOperationsCustomers() {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiCustomersResponse>('/api/v1/ops/customers');
}

export function fetchOperationsCustomerSites(customerOrganizationId: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiSitesResponse>(`/api/v1/ops/customers/${customerOrganizationId}/sites`);
}

export function fetchOperationsUsers(role?: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return request<ApiUsersResponse>(`/api/v1/ops/users${query}`);
}

export type OpsBookingPayload = {
  customerOrganizationId: string;
  customerSiteId: string;
  serviceCode: string;
  requestedDate: string;
  requestedStart: string;
  requestedEnd: string;
  estimatedVolume?: number;
  volumeUnit?: string;
  customerNote?: string;
  internalNote?: string;
  responsibleUserId?: string;
  contactName?: string;
  contactPhone?: string;
  source?: 'ADMIN_PHONE' | 'ADMIN_MANUAL';
  confirmImmediately?: boolean;
};

export function createOperationsBooking(payload: OpsBookingPayload) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>('/api/v1/ops/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export type OpsBookingUpdatePayload = {
  version: number;
  customerSiteId?: string;
  serviceCode?: string;
  requestedDate?: string;
  requestedStart?: string;
  requestedEnd?: string;
  estimatedVolume?: number;
  volumeUnit?: string;
  customerNote?: string;
  internalNote?: string;
  responsibleUserId?: string;
  changeReason: string;
  assignmentResolution?: 'UNASSIGN_IF_INVALID' | 'CANCEL_EDIT';
  override?: boolean;
};

export function updateOperationsBooking(id: string, payload: OpsBookingUpdatePayload) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>(`/api/v1/ops/bookings/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export function cancelOperationsBooking(id: string, reason: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiBooking>(`/api/v1/ops/bookings/${id}/cancel`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) });
}

export function fetchBookingTasks(bookingId: string) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiTasksResponse>(`/api/v1/ops/bookings/${bookingId}/tasks`);
}

export function fetchOwnerAudit(params?: { page?: number; pageSize?: number; action?: string; entityType?: string }) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.action) query.set('action', params.action);
  if (params?.entityType) query.set('entityType', params.entityType);
  return request<ApiAuditResponse>(`/api/v1/owner/audit${query.toString() ? `?${query.toString()}` : ''}`);
}

export function createBookingTask(bookingId: string, payload: { title: string; assigneeUserId?: string; priority?: string; dueAt?: string; isRequired?: boolean }) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiTask>(`/api/v1/ops/bookings/${bookingId}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export function updateBookingTaskStatus(taskId: string, payload: { status: string; reason?: string }) {
  if (!enabled) return Promise.reject(new Error('API disabled for demo mode'));
  return request<ApiTask>(`/api/v1/ops/tasks/${taskId}/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
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
  ['booking.created', 'booking.updated', 'booking.confirmed', 'booking.rejected', 'booking.cancelled', 'booking.responsible.changed', 'booking.assignment.changed', 'job.stage.changed', 'task.created', 'task.updated', 'task.assigned', 'task.status.changed'].forEach((eventName) => source.addEventListener(eventName, onEvent));
  // EventSource automatically retries transient connection failures. Keeping the
  // connection open lets the UI catch up after the API restarts.
  return () => source.close();
}
