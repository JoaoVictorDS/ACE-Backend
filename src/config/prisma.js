const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const logger = require('./logger')

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
    adapter: adapter,
    log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
        ...(process.env.NODE_ENV === 'development'
            ? [{ emit: 'event', level: 'query' }]
            : []
        ),
    ],
})

prisma.$on('warn', (e) => {
    logger.warn({ message: e.message }, 'Prisma warning')
})

prisma.$on('error', (e) => {
    logger.error({ message: e.message }, 'Prisma error')
})

prisma.$on('query', (e) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma query')
})

module.exports = prisma