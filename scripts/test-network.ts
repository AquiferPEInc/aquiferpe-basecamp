import net from 'net'
import { env } from 'process'

const host = process.env.DB_HOST || '192.168.86.100'
const port = parseInt(process.env.DB_PORT || '5432')

console.log('Testing network connectivity to database host...')
console.log(`Host: ${host}`)
console.log(`Port: ${port}`)
console.log()

// Test 1: Basic TCP connection
console.log('Test 1: TCP connection test...')
const socket = new net.Socket()
const timeout = 5000

socket.setTimeout(timeout)

socket.on('connect', () => {
  console.log(`✅ TCP connection successful to ${host}:${port}`)
  socket.destroy()
  process.exit(0)
})

socket.on('timeout', () => {
  console.log(`❌ Connection timeout after ${timeout}ms`)
  socket.destroy()
  process.exit(1)
})

socket.on('error', (error: any) => {
  console.log(`❌ TCP connection failed: ${error.code || error.message}`)
  if (error.code === 'EHOSTUNREACH') {
    console.log('   Host is unreachable - check network connectivity')
  } else if (error.code === 'ECONNREFUSED') {
    console.log('   Connection refused - PostgreSQL may not be running or not listening on this port')
  } else if (error.code === 'ENETUNREACH') {
    console.log('   Network unreachable - check routing/firewall')
  }
  socket.destroy()
  process.exit(1)
})

socket.connect(port, host)