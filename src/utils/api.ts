const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    let msg = `API Error: ${res.status}`
    try { const body = await res.json(); if (body?.error) msg = body.error } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(url: string, data?: unknown) =>
    request<T>(url, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
}
