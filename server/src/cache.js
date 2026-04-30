import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL
const token = process.env.REDIS_TOKEN

const redis = redisUrl ? new Redis(redisUrl,token ,{ maxRetriesPerRequest: 2 }) : null
let redisReady = false

if (redis) {
  redis.on('ready', () => {
    redisReady = true
  })
  redis.on('end', () => {
    redisReady = false
  })
  redis.on('error', (error) => {
    redisReady = false
    console.warn('[redis] connection error:', error?.message ?? error)
  })
}

const safeJsonParse = (value) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const cacheEnabled = Boolean(redis)

export const cacheGet = async (key) => {
  if (!redis || !redisReady) return null
  const value = await redis.get(key)
  return safeJsonParse(value)
}

export const cacheSet = async (key, value, ttlSeconds) => {
  if (!redis || !redisReady) return
  const payload = JSON.stringify(value)
  await redis.set(key, payload, 'EX', ttlSeconds)
}

export const cacheDel = async (...keys) => {
  if (!redis || !redisReady || !keys.length) return
  await redis.del(keys)
}

export const cacheGetVersion = async (key) => {
  if (!redis || !redisReady) return 1
  const value = await redis.get(key)
  return value ? Number(value) : 1
}

export const cacheBumpVersion = async (key) => {
  if (!redis || !redisReady) return 1
  const value = await redis.incr(key)
  return value
}
