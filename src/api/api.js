const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:5000/api' 
  : '/api';

export const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  // Parse date from "D MMMM YYYY" format to Date object if needed
  // But wait, it's better if we store ISO string in the DB.
  // Currently we store formatted string. Let's handle both.
  let date;
  if (dateString.includes('T')) {
    date = new Date(dateString);
  } else {
    // Basic fallback for old format
    return dateString;
  }

  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInDays > 2) {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const diffInHours = diffInMs / (1000 * 60 * 60);
  if (diffInHours >= 1) {
    return `${Math.floor(diffInHours)} jam yang lalu`;
  }

  const diffInMinutes = diffInMs / (1000 * 60);
  if (diffInMinutes >= 1) {
    return `${Math.floor(diffInMinutes)} menit yang lalu`;
  }

  return 'Baru saja';
};

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
export const incrementNewsView = (id) => fetch(`${BASE_URL}/news/${id}/view`, {
  method: 'POST',
  headers: getAuthHeaders()
}).then(res => res.json()).catch(() => ({error: true}));
export const incrementNewsLike = (id) => fetch(`${BASE_URL}/news/${id}/like`, {
  method: 'POST',
  headers: getAuthHeaders()
}).then(res => res.json()).catch(() => ({error: true}));
export const fetchComments = (id) => safeFetch(`${BASE_URL}/news/${id}/comments`);
export const postComment = (id, data) => fetch(`${BASE_URL}/news/${id}/comments`, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
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
