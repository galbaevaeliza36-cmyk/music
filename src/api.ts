import { useSyncExternalStore } from 'react'



export const API_URL: string = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://inai-col2.fishrungames.com'
).replace(/\/+$/, '')



export interface Profile {
  first_name: string
  specialization: string // значение, например "vocals"
  specialization_display: string // подпись для показа
  bio: string
  fee: string // десятичное число строкой, например "1.75"
}

export interface User {
  id: number
  username: string
  profile: Profile
}

export interface Specialization {
  value: string
  label: string
}

export interface ProfileUpdate {
  first_name?: string
  specialization?: string
  bio?: string
  fee?: string
}

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}



let pending = 0
const listeners = new Set<() => void>()

function trackLoading(delta: number): void {
  pending = Math.max(0, pending + delta)
  listeners.forEach((l) => l())
}

/** true, пока выполняется хотя бы один запрос */
export function useLoading(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => pending > 0,
  )
}



function parseErrors(data: unknown, status: number): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {}
  let message = ''

  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const text = Array.isArray(value) ? String(value[0]) : typeof value === 'string' ? value : ''
      if (!text) continue
      if (key === 'detail' || key === 'message' || key === 'error' || key === 'non_field_errors') {
        message = message || text
      } else {
        fields[key] = text
      }
    }
  }

  if (!message) {
    if (Object.keys(fields).length) message = 'Проверьте правильность полей'
    else if (status === 401 || status === 403) message = 'Нет доступа. Войдите в систему.'
    else message = `Ошибка сервера (${status})`
  }
  return { message, fields }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  trackLoading(1)
  try {
    let res: Response
    try {
      res = await fetch(API_URL + path, {
        method,
        headers,
        credentials: 'include', // чтобы браузер хранил и отправлял cookie сессии
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError('Не удалось связаться с сервером. Проверьте интернет.', 0)
    }

    const text = await res.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
    }

    if (!res.ok) {
      const { message, fields } = parseErrors(data, res.status)
      throw new ApiError(message, res.status, fields)
    }
    return data as T
  } finally {
    trackLoading(-1)
  }
}



export const login = (username: string, password: string): Promise<User> =>
  request<User>('POST', '/api/login/', { username, password })


export async function register(username: string, password: string): Promise<User> {
  await request<User>('POST', '/api/register/', { username, password })
  return login(username, password)
}

export async function logout(): Promise<void> {
  await request<unknown>('POST', '/api/logout/')
}

export const getProfile = (): Promise<User> => request<User>('GET', '/api/profile/')

export const updateProfile = (data: ProfileUpdate): Promise<User> => request<User>('PATCH', '/api/profile/', data)

export const getSpecializations = (): Promise<Specialization[]> =>
  request<Specialization[]>('GET', '/api/specializations/')