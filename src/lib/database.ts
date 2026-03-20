import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
  maxConnections?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

/**
 * PostgreSQL database utility class
 * Provides connection pooling and query execution methods
 */
export class Database {
  private pool: Pool
  private static instance: Database

  /**
   * Private constructor (singleton pattern)
   */
  private constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl || false,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
    })

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err)
    })
  }

  /**
   * Get singleton instance of Database
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || '192.168.86.100',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'aquifer',
        user: process.env.DB_USER || 'aquifer_app',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
      }

      // Validate required configuration
      if (!config.password) {
        throw new Error('Database password is required. Set DB_PASSWORD environment variable.')
      }

      Database.instance = new Database(config)
    }

    return Database.instance
  }

  /**
   * Execute a SQL query with parameters
   * @param text SQL query text
   * @param params Query parameters
   * @returns Query result
   */
  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.pool.connect()
    try {
      const result = await client.query<T>(text, params)
      return result
    } finally {
      client.release()
    }
  }

  /**
   * Get a client from the pool for transaction management
   * @returns Pool client
   */
  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect()
  }

  /**
   * Execute a transaction
   * @param callback Function that receives a client and returns a promise
   * @returns Result of the callback
   */
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Close all connections in the pool
   */
  public async close(): Promise<void> {
    await this.pool.end()
    Database.instance = null as any
  }

  /**
   * Check if database connection is healthy
   * @returns True if connection is successful
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  /**
   * Get database statistics
   * @returns Pool statistics
   */
  public getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    }
  }
}

// Export a default instance for convenience
export const db = Database.getInstance()