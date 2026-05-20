const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
    adapter: adapter,
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error']
})

module.exports = prisma