const logger = require('./logger')

const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CLIENT_URL',
]

const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
)

if (missingEnvVars.length > 0) {
    logger.fatal({ missingEnvVars }, 'Variaveis de ambiente obrigatórias não configuradas')
    process.exit(1)
}

const appConfig = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',

    database: {
        url: process.env.DATABASE_URL,
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
        refreshExpiresIn: '7d',
    },

    cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400, // 24 horas
    },

    cookies: {
        refreshToken: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
            path: '/',
        },
    },

    socket: {
        cors: {
            origin: process.env.CLIENT_URL,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },

    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100, // limite de 100 requisições por janela
    },

    rateLimitStrict: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // limite de 5 tentativas
    },
}

if (appConfig.jwt.secret.length < 32) {
    logger.warn('JWT_SECRET deve ter pelo menos 32 caracteres')
}

if (appConfig.jwt.refreshSecret.length < 32) {
    logger.warn('JWT_REFRESH_SECRET deve ter pelo menos 32 caracteres')

}

if (appConfig.isProduction && !appConfig.cookies.refreshToken.secure) {
    logger.warn('Em producao, cookies devem ter secure: true para HTTPS')
}

module.exports = appConfig