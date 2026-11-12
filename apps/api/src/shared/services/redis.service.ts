import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis 服务
 *
 * 提供分布式锁和缓存功能：
 * - 分布式锁（用于库存扣减）
 * - 原子操作
 * - 缓存管理
 *
 * 配置要求：
 * - REDIS_HOST: Redis 主机地址
 * - REDIS_PORT: Redis 端口
 * - REDIS_PASSWORD: Redis 密码（可选）
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: any; // 使用 any 类型，避免安装依赖时报错
  private readonly host: string;
  private readonly port: number;
  private readonly password?: string;

  constructor(private configService: ConfigService) {
    this.host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    this.port = this.configService.get<number>('REDIS_PORT') || 6379;
    this.password = this.configService.get<string>('REDIS_PASSWORD');
  }

  async onModuleInit() {
    try {
      const Redis = require('ioredis');
      this.client = new Redis({
        host: this.host,
        port: this.port,
        password: this.password,
      });
      this.logger.log(`Redis 服务已连接 (${this.host}:${this.port})`);
    } catch (error) {
      this.logger.error('Redis 连接失败', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis 连接已关闭');
    }
  }

  /**
   * 获取分布式锁
   *
   * @param key 锁的键
   * @param ttl 锁的过期时间（毫秒）
   * @param retryTimes 重试次数
   * @param retryDelay 重试间隔（毫秒）
   * @returns 锁的值（用于释放锁）
   */
  async acquireLock(
    key: string,
    ttl: number = 5000,
    retryTimes: number = 3,
    retryDelay: number = 100,
  ): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}_${Math.random()}`;

    for (let i = 0; i < retryTimes; i++) {
      try {
        const result = await this.client.set(lockKey, lockValue, 'PX', ttl, 'NX');
        if (result === 'OK') {
          this.logger.debug(`获取锁成功: ${lockKey}`);
          return lockValue;
        }
      } catch (error) {
        this.logger.error(`获取锁失败 (重试 ${i + 1}/${retryTimes})`, error);
        if (i < retryTimes - 1) {
          await this.sleep(retryDelay);
        }
      }
    }

    this.logger.warn(`获取锁失败: ${lockKey}`);
    return null;
  }

  /**
   * 释放分布式锁
   *
   * @param key 锁的键
   * @param value 锁的值
   * @returns 是否成功释放
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.client.eval(script, 1, lockKey, value);
      if (result === 1) {
        this.logger.debug(`释放锁成功: ${lockKey}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`释放锁失败: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, Math.floor(ttl / 1000), serialized);
      } else {
        await this.client.set(key, serialized);
      }
      this.logger.debug(`设置缓存: ${key}`);
    } catch (error) {
      this.logger.error(`设置缓存失败: ${key}`, error);
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
      this.logger.debug(`删除缓存: ${key}`);
    } catch (error) {
      this.logger.error(`删除缓存失败: ${key}`, error);
    }
  }

  /**
   * 辅助方法：睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
