const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000/api' 
  : '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const safeFetch = async (url) => {
  try {
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

// AUTH
export const loginUser = (username, password) => fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
}).then(res => res.json());

export const changePassword = (currentPassword, newPassword) => fetch(`${BASE_URL}/auth/change-password`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify({ currentPassword, newPassword })
}).then(res => res.json());

export const updateDutyStatus = (is_active, shift, manualToken = null) => {
  const token = manualToken || localStorage.getItem('token');
  return fetch(`${BASE_URL}/auth/duty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ is_active, shift })
  }).then(res => res.json());
};

// ADMIN
export const fetchAdminUsers = () => safeFetch(`${BASE_URL}/admin/users`);
export const saveAdminUser = (data) => fetch(`${BASE_URL}/admin/users`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}).then(res => res.json());
export const deleteAdminUser = (id) => fetch(`${BASE_URL}/admin/users/${id}`, { 
  method: 'DELETE',
  headers: getAuthHeaders()
}).then(res => res.json());
export const resetUserPassword = (id) => fetch(`${BASE_URL}/admin/users/${id}/reset-password`, {
  method: 'POST',
  headers: getAuthHeaders()
}).then(res => res.json());

// WARGA
export const fetchWarga = () => safeFetch(`${BASE_URL}/warga`);
export const saveWarga = (data) => fetch(`${BASE_URL}/warga`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}).then(res => res.json()).catch(() => ({error: true}));
export const deleteWarga = (id) => fetch(`${BASE_URL}/warga/${id}`, { 
  method: 'DELETE',
  headers: getAuthHeaders()
}).then(res => res.json()).catch(() => ({error: true}));

// TRANSACTIONS
export const fetchTransactions = () => safeFetch(`${BASE_URL}/transactions`);
export const saveTransaction = (data) => fetch(`${BASE_URL}/transactions`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}).then(res => res.json()).catch(() => ({error: true}));
export const deleteTransaction = (id) => fetch(`${BASE_URL}/transactions/${id}`, { 
  method: 'DELETE',
  headers: getAuthHeaders()
}).then(res => res.json()).catch(() => ({error: true}));

// GUESTS
export const fetchGuests = () => safeFetch(`${BASE_URL}/guests`);
export const saveGuest = (data) => fetch(`${BASE_URL}/guests`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}).then(res => res.json()).catch(() => ({error: true}));
export const deleteGuest = (id) => fetch(`${BASE_URL}/guests/${id}`, { 
  method: 'DELETE',
  headers: getAuthHeaders()
}).then(res => res.json()).catch(() => ({error: true}));

// NEWS
export const fetchNews = () => safeFetch(`${BASE_URL}/news`);
export const fetchNewsById = (id) => fetch(`${BASE_URL}/news/${id}`, { headers: getAuthHeaders() }).then(res => res.json());
export const saveNews = (data) => fetch(`${BASE_URL}/news`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}).then(res => res.json()).catch(() => ({error: true}));
export const deleteNews = (id) => fetch(`${BASE_URL}/news/${id}`, { 
  method: 'DELETE',
  headers: getAuthHeaders()
}).then(res => res.json()).catch(() => ({error: true}));

// PENGURUS
export const fetchPengurus = () => safeFetch(`${BASE_URL}/pengurus`);
export const savePengurus = (data) => fetch(`${BASE_URL}/pengurus`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}).then(res => res.json()).catch(() => ({error: true}));

export const fetchPublicSatpams = () => safeFetch(`${BASE_URL}/public/satpams`);

// SECURITY
export const fetchSecurityTasks = () => safeFetch(`${BASE_URL}/security-tasks`);
export const toggleSecurityTask = (id, done) => fetch(`${BASE_URL}/security-tasks/toggle`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify({ id, done })
}).then(res => res.json()).catch(() => ({error: true}));
