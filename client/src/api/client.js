const API_BASE = import.meta.env.VITE_API_URL || '';

export function getAuthToken() {
    return localStorage.getItem('cms_token') || '';
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('cms_token', token);
    } else {
        localStorage.removeItem('cms_token');
    }
}

export function getStoredUser() {
    const raw = localStorage.getItem('cms_user');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function setStoredUser(user) {
    if (user) {
        localStorage.setItem('cms_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('cms_user');
    }
}

export async function apiRequest(path, options = {}) {
    const token = getAuthToken();
    const headers = {
        ...(options.body instanceof FormData
            ? {}
            : { 'Content-Type': 'application/json' }),
        ...options.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    let data = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        data = await response.json();
    } else if (contentType.includes('text/csv')) {
        data = await response.text();
    }

    if (!response.ok) {
        const message =
            data?.message ||
            `Request failed (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export const authApi = {
    getMe: () => apiRequest('/api/user/me'),
    login: (identifier, password) =>
        apiRequest('/api/user/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password })
        }),
    logout: () =>
        apiRequest('/api/user/logout', { method: 'POST' }),
    changePassword: (currentPassword, newPassword) =>
        apiRequest('/api/user/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        })
};

export const complaintsApi = {
    getCategories: () => apiRequest('/api/complaints/categories'),
    create: (payload) =>
        apiRequest('/api/complaints/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(
            `/api/complaints/get${query ? `?${query}` : ''}`
        );
    },
    getById: (id) => apiRequest(`/api/complaints/get/${id}`),
    updateStatus: (id, body) =>
        apiRequest(`/api/complaints/updateComplaintStatus/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        }),
    assign: (id, body) =>
        apiRequest(`/api/complaints/assign/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        }),
    escalate: (id, body) =>
        apiRequest(`/api/complaints/escalate/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        }),
    resolve: (id, body) =>
        apiRequest(`/api/complaints/resolve/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        })
};

export const staffApi = {
    getAssignableUsers: (department) =>
        apiRequest(
            `/api/user/assignable?department=${encodeURIComponent(department)}`
        )
};

export const managementApi = {
    getStats: () => apiRequest('/api/users/stats'),
    listUsers: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/api/users${query ? `?${query}` : ''}`);
    },
    getUser: (id) => apiRequest(`/api/users/${id}`),
    updateUser: (id, payload) =>
        apiRequest(`/api/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        }),
    setUserStatus: (id, isActive) =>
        apiRequest(`/api/users/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive })
        }),
    exportCsv: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const token = getAuthToken();
        const response = await fetch(
            `${API_BASE}/api/users/export${query ? `?${query}` : ''}`,
            {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            }
        );
        if (!response.ok) {
            throw new Error('Export failed');
        }
        return response.blob();
    }
};

export const usersApi = {
    create: (payload) =>
        apiRequest('/api/users', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
    bulkUpload: (file, downloadCredentials = false) => {
        const form = new FormData();
        form.append('file', file);
        const query = downloadCredentials
            ? '?downloadCredentials=true'
            : '';
        return apiRequest(`/api/users/bulk${query}`, {
            method: 'POST',
            body: form
        });
    }
};
