const { prisma, logger } = require('../../config')

class TransactionManager {

    static async _execute(callback, options = {}) {
        const { timeout = 10000, maxWait = 5000, isolationLevel } = options

        return await prisma.$transaction(callback, {
            timeout,
            maxWait,
            ...(isolationLevel && { isolationLevel }),
        })
    }

    static async run(callback, options = {}) {
        try {
            return await this._execute(callback, options)
        } catch (error) {
            logger.error({
                message: 'Transaction failed',
                error: error.message,
                stack: error.stack,
            })
            throw error
        }
    }

    static async runWithRetry(callback, options = {}) {
        const { retries = 3, ...transactionOptions } = options

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await this._execute(callback, transactionOptions)
            } catch (error) {
                const isDeadlock = error.code === 'P2034'
                const isLastAttempt = attempt === retries

                if (!isDeadlock || isLastAttempt) {
                    logger.error({
                        message: 'Transaction failed after retries',
                        error: error.message,
                        stack: error.stack,
                        attempts: attempt,
                    })
                    throw error
                }

                const delay = Math.min(100 * 2 ** attempt, 1000) // 200ms, 400ms, 800ms...
                logger.warn({
                    message: `Deadlock detectado, retentando em ${delay}ms... (tentativa ${attempt}/${retries})`,
                })
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }
}

module.exports = TransactionManager