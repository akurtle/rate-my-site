const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export type CreateSitePayload = {
  name: string
  url: string
  description: string
  tags: string[]
  skipAutoScreenshot?: boolean
}

export type CreateRatingPayload = {
  score: number
  comment?: string
}

export type CreateReplyPayload = {
  comment: string
  parentReplyId?: string | null
}

export class ApiError extends Error {
  fields?: string[]

  constructor(message: string, fields?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.fields = fields
  }
}

export async function fetchSites(
  query?: string,
  tag?: string,
  options?: { signal?: AbortSignal },
) {
  const params = new URLSearchParams()
  if (query) params.set('search', query)
  if (tag) params.set('tag', tag)

  const response = await fetch(`${apiBaseUrl}/sites?${params.toString()}`, {
    signal: options?.signal,
  })
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
    throw new ApiError(errorBody.message, errorBody.fields)
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
    const errorBody = await safeParseError(response)
    throw new ApiError(errorBody.message, errorBody.fields)
  }
  return response.json()
}

async function safeParseError(response: Response): Promise<{ message: string; fields?: string[] }> {
  try {
    const body = await response.json()
    if (body?.error?.fieldErrors) {
      const fields = Object.keys(body.error.fieldErrors)
      if (fields.length) {
        return { message: `Invalid fields: ${fields.join(', ')}`, fields }
      }
    }
    if (body?.error?.formErrors?.length) {
      return { message: body.error.formErrors.join(', ') }
    }
    if (typeof body?.error === 'string') {
      return { message: body.error }
    }
  } catch {
    // ignore
  }
  return { message: 'Failed to create site' }
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
    const errorBody = await safeParseError(response)
    throw new ApiError(errorBody.message, errorBody.fields)
  }
  return response.json()
}

export async function uploadScreenshots(
  siteId: string,
  files: File[],
  accessToken: string,
) {
  const formData = new FormData()
  files.forEach((file) => formData.append('screenshots', file))

  const response = await fetch(`${apiBaseUrl}/sites/${siteId}/screenshots`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await safeParseError(response)
    throw new ApiError(errorBody.message, errorBody.fields)
  }
  return response.json()
}
