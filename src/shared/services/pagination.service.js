class PaginationService {

    static calculateSkip(page, limit) {
        return (page - 1) * limit
    }

    static calculateTotalPages(total, limit) {
        return Math.ceil(total / limit)
    }

    static createPaginatedResponse(data, total, page, limit, meta = {}) {
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: this.calculateTotalPages(total, limit),
                ...meta
            },
        }
    }

}

module.exports = PaginationService