/**
 * Redis 客户端（ioredis）—— 本次新增
 * ------------------------------------------------------------------
 * 用途：
 *   1. AI 结果缓存（降低 DeepSeek 调用次数与响应耗时）
 *   2. AI 调用并发控制（限制全局同时在跑的 AI 请求数）
 *   3. JWT 登出黑名单（解决 JWT 无状态、登出后 token 仍有效的问题）
 *
 * 设计原则：优雅降级。
 *   未设置 REDIS_ENABLED=true 或 Redis 连接异常时，所有操作都会安全失败，
 *   调用方自动回退到数据库/原逻辑，主流程完全不受影响。
 */
const Redis = require('ioredis');

const redisEnabled = process.env.REDIS_ENABLED === 'true';

let redis = null;
let connected = false;

if (redisEnabled) {
  redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB) || 0,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000))
  });

  redis.on('connect', () => {
    connected = true;
    console.log('Redis 连接成功');
  });
  redis.on('ready', () => {
    connected = true;
  });
  redis.on('error', (err) => {
    connected = false;
    console.error('Redis 连接异常:', err.message);
  });
  redis.on('end', () => {
    connected = false;
  });
}

// 是否可用：未启用 / 连接未就绪时返回 false，调用方据此走降级逻辑
const isReady = () => Boolean(redisEnabled && redis && connected);

// 读取 JSON 缓存：未命中或异常返回 null
const cacheGet = async (key) => {
  if (!isReady()) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Redis 读取缓存失败:', err.message);
    return null;
  }
};

// 写入 JSON 缓存（ttlSeconds 秒后过期）
const cacheSet = async (key, value, ttlSeconds) => {
  if (!isReady()) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.warn('Redis 写入缓存失败:', err.message);
  }
};

/**
 * 并发闸门：尝试占用一个并发名额。
 * 超过 limit 返回 false（调用方应拒绝或排队）；
 * 无 Redis 时直接放行，保证功能可用。
 */
const acquireSlot = async (key, limit, ttlSeconds = 60) => {
  if (!isReady()) return true;
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, ttlSeconds);
    }
    if (current > limit) {
      await redis.decr(key);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Redis 并发控制失败:', err.message);
    return true;
  }
};

// 释放并发名额
const releaseSlot = async (key) => {
  if (!isReady()) return;
  try {
    const current = await redis.decr(key);
    if (current <= 0) {
      await redis.del(key);
    }
  } catch (err) {
    console.warn('Redis 释放并发名额失败:', err.message);
  }
};

// 将 token 写入登出黑名单，ttlSeconds 为 token 剩余有效期
const blacklistToken = async (token, ttlSeconds) => {
  if (!isReady() || ttlSeconds <= 0) return;
  try {
    await redis.set(`jwt:blacklist:${token}`, '1', 'EX', ttlSeconds);
  } catch (err) {
    console.warn('Redis 写入登出黑名单失败:', err.message);
  }
};

// 判断 token 是否已被登出（在黑名单中）
const isTokenBlacklisted = async (token) => {
  if (!isReady()) return false;
  try {
    return (await redis.exists(`jwt:blacklist:${token}`)) === 1;
  } catch (err) {
    console.warn('Redis 查询登出黑名单失败:', err.message);
    return false;
  }
};

module.exports = {
  redis,
  redisEnabled,
  isReady,
  cacheGet,
  cacheSet,
  acquireSlot,
  releaseSlot,
  blacklistToken,
  isTokenBlacklisted
};