import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import multer from 'multer'
import {
  cacheBumpVersion,
  cacheDel,
  cacheEnabled,
  cacheGet,
  cacheGetVersion,
  cacheSet,
} from './cache.js'
import { captureSiteScreenshot } from './screenshot.js'

const app = express()
const port = process.env.PORT || 4000

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey)
    : null
const authClient =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
  }),
)
app.use(express.json())

const normalizeUrl = (value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

const siteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  url: z.preprocess(normalizeUrl, z.string().url()),
  description: z.string().trim().min(10).max(500),
  tags: z.array(z.string().trim().min(2).max(32)).min(1).max(8),
})

const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

const replySchema = z.object({
  comment: z.string().min(1).max(500),
})

const listVersionKey = 'cache:sites:list:version'
const listTtl = Number(process.env.CACHE_SITES_TTL || 60)
const siteTtl = Number(process.env.CACHE_SITE_TTL || 120)
const ratingsTtl = Number(process.env.CACHE_RATINGS_TTL || 30)
const screenshotBucket = process.env.SCREENSHOT_BUCKET || 'site-screenshots'
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
})

const buildListCacheKey = (version, search, tag, sort) => {
  const safe = (value) => encodeURIComponent(value ?? 'all')
  return `cache:sites:list:v${version}:search:${safe(search)}:tag:${safe(tag)}:sort:${safe(sort)}`
}

const requireSupabase = (res) => {
  if (!supabase || !authClient) {
    res.status(500).json({ error: 'Supabase is not configured.' })
    return false
  }
  return true
}

const requireAuth = async (req, res, next) => {
  if (!requireSupabase(res)) return
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Missing access token.' })
  }
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid access token.' })
  }
  req.user = data.user
  return next()
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/sites', async (req, res) => {
  if (!requireSupabase(res)) return
  const search = req.query.search?.toString()
  const tag = req.query.tag?.toString()
  const sort = req.query.sort?.toString() || 'recent'

  if (cacheEnabled) {
    const version = await cacheGetVersion(listVersionKey)
    const cacheKey = buildListCacheKey(version, search, tag, sort)
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json({ data: cached })
    }
  }

  let query = supabase
    .from('sites')
    .select('id,name,url,description,tags,avg_rating,rating_count,created_at,owner_id,screenshot_url,screenshot_status,screenshot_updated_at,site_screenshots(url,source,created_at)')

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }
  if (tag) {
    query = query.contains('tags', [tag])
  }

  query = sort === 'top' ? query.order('avg_rating', { ascending: false }) : query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) {
    return res.status(500).json({ error: error.message })
  }
  if (cacheEnabled) {
    const version = await cacheGetVersion(listVersionKey)
    const cacheKey = buildListCacheKey(version, search, tag, sort)
    await cacheSet(cacheKey, data, listTtl)
    res.set('X-Cache', 'MISS')
  }
  res.json({ data })
})

app.get('/sites/:id', async (req, res) => {
  if (!requireSupabase(res)) return
  const { id } = req.params

  if (cacheEnabled) {
    const cacheKey = `cache:site:${id}`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json({ data: cached })
    }
  }

  const { data, error } = await supabase
    .from('sites')
    .select('id,name,url,description,tags,avg_rating,rating_count,created_at,owner_id,screenshot_url,screenshot_status,screenshot_updated_at,site_screenshots(url,source,created_at)')
    .eq('id', id)
    .single()

  if (error) {
    return res.status(404).json({ error: 'Site not found.' })
  }
  if (cacheEnabled) {
    await cacheSet(`cache:site:${id}`, data, siteTtl)
    res.set('X-Cache', 'MISS')
  }
  res.json({ data })
})

app.post('/sites', requireAuth, async (req, res) => {
  if (!requireSupabase(res)) return
  const parseResult = siteSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() })
  }

  const { data, error } = await supabase
    .from('sites')
    .insert({
      ...parseResult.data,
      owner_id: req.user.id,
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  if (cacheEnabled) {
    await cacheBumpVersion(listVersionKey)
  }
  if (data?.id && data?.url) {
    captureAndStoreScreenshot(data.id, data.url).catch((err) => {
      console.warn('[screenshot] failed:', err?.message ?? err)
    })
  }
  res.status(201).json({ data })
})

app.get('/sites/:id/ratings', async (req, res) => {
  if (!requireSupabase(res)) return
  const { id } = req.params

  if (cacheEnabled) {
    const cacheKey = `cache:site:${id}:ratings`
    const cached = await cacheGet(cacheKey)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json({ data: cached })
    }
  }

  const { data, error } = await supabase
    .from('ratings')
    .select('id,score,comment,created_at,user_id,comment_replies(id,comment,created_at,user_id)')
    .eq('site_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  if (cacheEnabled) {
    await cacheSet(`cache:site:${id}:ratings`, data, ratingsTtl)
    res.set('X-Cache', 'MISS')
  }
  res.json({ data })
})

app.post('/sites/:id/ratings', requireAuth, async (req, res) => {
  if (!requireSupabase(res)) return
  const parseResult = ratingSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() })
  }

  const { id } = req.params
  const { data, error } = await supabase
    .from('ratings')
    .insert({
      site_id: id,
      user_id: req.user.id,
      score: parseResult.data.score,
      comment: parseResult.data.comment ?? null,
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  if (cacheEnabled) {
    await cacheDel(`cache:site:${id}:ratings`, `cache:site:${id}`)
    await cacheBumpVersion(listVersionKey)
  }
  res.status(201).json({ data })
})

app.post('/sites/:id/screenshot', requireAuth, async (req, res) => {
  if (!requireSupabase(res)) return
  const { id } = req.params
  const { data: siteRow, error: siteError } = await supabase
    .from('sites')
    .select('id,url,owner_id')
    .eq('id', id)
    .single()

  if (siteError || !siteRow) {
    return res.status(404).json({ error: 'Site not found.' })
  }
  if (siteRow.owner_id && siteRow.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' })
  }

  try {
    const result = await captureAndStoreScreenshot(siteRow.id, siteRow.url)
    res.json({ data: result })
  } catch (error) {
    res.status(500).json({ error: error?.message ?? 'Failed to capture screenshot.' })
  }
})

app.post('/sites/:id/screenshots', requireAuth, upload.array('screenshots', 6), async (req, res) => {
  if (!requireSupabase(res)) return
  const { id } = req.params
  const { data: siteRow, error: siteError } = await supabase
    .from('sites')
    .select('id,url,owner_id')
    .eq('id', id)
    .single()

  if (siteError || !siteRow) {
    return res.status(404).json({ error: 'Site not found.' })
  }
  if (siteRow.owner_id && siteRow.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' })
  }

  const files = req.files ?? []
  if (!files.length) {
    return res.status(400).json({ error: 'No files uploaded.' })
  }

  const uploads = []
  for (const file of files) {
    if (!file.mimetype.startsWith('image/')) continue
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg'
    const filePath = `sites/${id}/manual/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from(screenshotBucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      })

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message })
    }

    const { data: publicUrlData } = supabase.storage.from(screenshotBucket).getPublicUrl(filePath)
    const publicUrl = publicUrlData?.publicUrl
    if (publicUrl) {
      uploads.push(publicUrl)
    }
  }

  if (!uploads.length) {
    return res.status(400).json({ error: 'No valid images uploaded.' })
  }

  const rows = uploads.map((url) => ({ site_id: id, url, source: 'manual' }))
  const { data, error } = await supabase.from('site_screenshots').insert(rows).select()
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  await supabase
    .from('sites')
    .update({
      screenshot_url: uploads[0],
      screenshot_status: 'ready',
      screenshot_updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (cacheEnabled) {
    await cacheDel(`cache:site:${id}`)
    await cacheBumpVersion(listVersionKey)
  }

  res.status(201).json({ data })
})

app.post('/ratings/:id/replies', requireAuth, async (req, res) => {
  if (!requireSupabase(res)) return
  const parseResult = replySchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() })
  }

  const { id } = req.params
  const { data: ratingRow, error: ratingError } = await supabase
    .from('ratings')
    .select('id,site_id')
    .eq('id', id)
    .single()

  if (ratingError || !ratingRow) {
    return res.status(404).json({ error: 'Rating not found.' })
  }

  const { data, error } = await supabase
    .from('comment_replies')
    .insert({
      rating_id: id,
      user_id: req.user.id,
      comment: parseResult.data.comment,
    })
    .select('id,comment,created_at,user_id')
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  if (cacheEnabled) {
    await cacheDel(`cache:site:${ratingRow.site_id}:ratings`)
  }
  res.status(201).json({ data })
})

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})

async function captureAndStoreScreenshot(siteId, siteUrl) {
  if (!supabase) {
    throw new Error('Supabase not configured.')
  }
  await supabase
    .from('sites')
    .update({ screenshot_status: 'processing', screenshot_updated_at: new Date().toISOString() })
    .eq('id', siteId)

  const { buffer } = await captureSiteScreenshot({ url: siteUrl })
  const filePath = `sites/${siteId}/${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from(screenshotBucket)
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    await supabase
      .from('sites')
      .update({ screenshot_status: 'failed', screenshot_updated_at: new Date().toISOString() })
      .eq('id', siteId)
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage.from(screenshotBucket).getPublicUrl(filePath)
  const publicUrl = publicUrlData?.publicUrl

  const { data, error } = await supabase
    .from('sites')
    .update({
      screenshot_url: publicUrl,
      screenshot_status: 'ready',
      screenshot_updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select('id,screenshot_url,screenshot_status,screenshot_updated_at')
    .single()

  if (error) {
    throw error
  }
  if (publicUrl) {
    await supabase.from('site_screenshots').insert({
      site_id: siteId,
      url: publicUrl,
      source: 'auto',
    })
  }
  if (cacheEnabled) {
    await cacheDel(`cache:site:${siteId}`)
    await cacheBumpVersion(listVersionKey)
  }
  return data
}
