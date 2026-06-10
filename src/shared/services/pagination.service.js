class PaginationService {

    static calculateSkip(page, limit) {
        return (page - 1) * limit
    }

    static calculateTotalPages(total, limit) {
        return Math.ceil(total / limit)
    }

    static createPaginatedResponse(data, total, page, limit) {
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: this.calculateTotalPages(total, limit),
            },
        }
    }

}

module.exports = PaginationService