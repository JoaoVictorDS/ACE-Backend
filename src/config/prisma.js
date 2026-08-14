const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const logger = require('./logger')
const softDeleteExtension = require('../shared/database/soft-delete.extension')

const _logQuery = (e) => logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma query')
const _logWarning = (e) => logger.warn({ message: e.message }, 'Prisma warning')
const _logError = (e) => logger.error({ message: e.message }, 'Prisma error')

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const basePrisma = new PrismaClient({
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

basePrisma.$on('warn', _logWarning)
basePrisma.$on('error', _logError)
basePrisma.$on('query', _logQuery)

/** @type {import('@prisma/client').PrismaClient} */
const prisma = basePrisma.$extends(softDeleteExtension)

module.exports = prisma