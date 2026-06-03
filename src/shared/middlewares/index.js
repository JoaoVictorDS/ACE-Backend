module.exports = {
    adminMiddleware: require('./admin.middleware'),
    authMiddleware: require('./auth.middleware'),
    errorMiddleware: require('./error.middleware'),
    ...require('./rateLimit.middleware'),
    validationMiddleware: require('./validation.middleware'),
}