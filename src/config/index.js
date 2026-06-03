module.exports = {
    appConfig: require('./app.config'),
    appEventEmitter: require('./events'),
    logger: require('./logger'),
    prisma: require('./prisma'),
    ...require('./socket'),
}