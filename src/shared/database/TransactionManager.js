const prisma = require('../../config/prisma')
const logger = require('../../config/logger')

class TransactionManager {

    static async run(callback, options = {}) {
        const {
            timeout = 10000,
            maxWait = 5000,
            isolationLevel,
        } = options

        try {
            return await prisma.$transaction(callback, {
                timeout,
                maxWait,
                ...(isolationLevel && { isolationLevel }),
            })
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
                return await this.run(callback, transactionOptions)
            } catch (error) {
                const isDeadlock = error.code === 'P2034'
                const isLastAttempt = attempt === retries

                if (!isDeadlock || isLastAttempt) throw error

                logger.warn({
                    message: `Transaction deadlock, retrying... (attempt ${attempt}/${retries})`,
                })
            }
        }
    }
}

module.exports = TransactionManager