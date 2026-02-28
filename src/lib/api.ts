const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export type CreateSitePayload = {
  name: string
  url: string
  description: string
  tags: string[]
}

export type CreateRatingPayload = {
  score: number
  comment?: string
}

export type CreateReplyPayload = {
  comment: string
}

export async function fetchSites(query?: string, tag?: string) {
  const params = new URLSearchParams()
  if (query) params.set('search', query)
  if (tag) params.set('tag', tag)

  const response = await fetch(`${apiBaseUrl}/sites?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch sites')
  }
  return response.json()
}

export async function fetchRatings(siteId: string) {
  const response = await fetch(`${apiBaseUrl}/sites/${siteId}/ratings`)
  if (!response.ok) {
    throw new Error('Failed to fetch ratings')
  }
  return response.json()
}

export async function createSite(payload: CreateSitePayload, accessToken: string) {
  const response = await fetch(`${apiBaseUrl}/sites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorBody = await safeParseError(response)
    throw new Error(errorBody)
  }
  return response.json()
}

export async function createRating(siteId: string, payload: CreateRatingPayload, accessToken: string) {
  const response = await fetch(`${apiBaseUrl}/sites/${siteId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error('Failed to submit rating')
  }
  return response.json()
}

async function safeParseError(response: Response) {
  try {
    const body = await response.json()
    if (body?.error?.fieldErrors) {
      const fields = Object.keys(body.error.fieldErrors)
      if (fields.length) {
        return `Invalid fields: ${fields.join(', ')}`
      }
    }
    if (body?.error?.formErrors?.length) {
      return body.error.formErrors.join(', ')
    }
    if (typeof body?.error === 'string') {
      return body.error
    }
  } catch {
    // ignore
  }
  return 'Failed to create site'
}

export async function createReply(ratingId: string, payload: CreateReplyPayload, accessToken: string) {
  const response = await fetch(`${apiBaseUrl}/ratings/${ratingId}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error('Failed to submit reply')
  }
  return response.json()
}
