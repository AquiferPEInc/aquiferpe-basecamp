import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is not set in environment variables')
}

// Use a fixed IV for deterministic encryption (not recommended for high-security scenarios)
const IV_LENGTH = 16
const iv = Buffer.from(ENCRYPTION_KEY.slice(0, IV_LENGTH))

export const encrypt = (text: string): string => {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

export const decrypt = (text: string): string => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv)
  let decrypted = decipher.update(text, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
