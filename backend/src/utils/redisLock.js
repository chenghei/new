/**
 * Redis 分布式锁 —— 本次新增
 * ------------------------------------------------------------------
 * 用于多实例部署下，把跨实例的「检查-写入」类操作串行化：
 *   - 下单扣库存（按商品维度）
 *   - 购物车结算（按用户维度，防重复提交）
 *   - 售后申请（按订单维度）
 *
 * 加锁：SET key token PX ttl NX（原子占锁）
 * 解锁：Lua 脚本先比对 token 再删除，避免误删其他实例持有的锁
 *
 * 降级：Redis 未启用或连接异常时，直接执行原逻辑，功能不受影响。
 */
const { randomUUID } = require('crypto');
const { redis, isReady } = require('../config/redis');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 在锁保护下执行任务
 * @param {string} key      业务锁键（如 product:1 / order:8）
 * @param {Function} task   业务函数（返回 Promise）
 * @param {Object} options  ttl 锁过期毫秒；retries 重试次数；retryDelay 重试间隔毫秒
 */
const withLock = async (key, task, options = {}) => {
  const { ttl = 5000, retries = 3, retryDelay = 100 } = options;

  // 无 Redis 时降级：直接执行，由数据库原子操作保证单库一致性
  if (!isReady()) {
    return task();
  }

  const lockKey = `lock:${key}`;
  const token = randomUUID();

  let acquired = null;
  for (let i = 0; i <= retries; i += 1) {
    try {
      acquired = await redis.set(lockKey, token, 'PX', ttl, 'NX');
    } catch (err) {
      // 加锁过程异常同样降级，避免 Redis 抖动拖垮主流程
      console.warn('Redis 加锁失败，降级执行:', err.message);
      return task();
    }
    if (acquired) break;
    if (i < retries) await sleep(retryDelay);
  }

  if (!acquired) {
    const err = new Error('系统繁忙，请稍后重试');
    err.code = 'LOCK_BUSY';
    err.bizStatus = 429;
    throw err;
  }

  try {
    return await task();
  } finally {
    const lua = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
    try {
      await redis.eval(lua, 1, lockKey, token);
    } catch (err) {
      console.warn('Redis 解锁失败:', err.message);
    }
  }
};

module.exports = { withLock };