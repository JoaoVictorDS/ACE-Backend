const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por IP
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos'
})

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 tentativas de login
    skipSuccessfulRequests: true
})

module.exports = {
    apiLimiter,
    authLimiter
}