/**
 * Returns fetch headers with Authorization bearer token.
 * Usage: await fetch(url, { headers: authHeaders() })
 *        await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
 */
import authService from '@/service/auth.service'

export const authHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authService.getToken()}`,
  ...extra,
})

/**
 * Wrapper for fetch that automatically adds auth headers.
 */
export const apiFetch = (url, options = {}) => {
  const { headers, ...rest } = options
  return fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authService.getToken()}`,
      ...(headers || {}),
    },
  })
}
