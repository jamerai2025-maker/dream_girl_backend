class ApiResponse {
    constructor(statusCode, data = null, message = 'Success') {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
    // ==================== STATIC METHODS ====================
    // 200 - OK
    static ok(data = null, message = 'Success') {
        return new ApiResponse(200, data, message);
    }
    // 201 - Created
    static created(data = null, message = 'Created successfully') {
        return new ApiResponse(201, data, message);
    }
    // 204 - No Content
    static noContent(message = 'Deleted successfully') {
        return new ApiResponse(204, null, message);
    }
    // Paginated response
    static paginated(data, pagination, message = 'Success') {
        return {
            success: true,
            statusCode: 200,
            message,
            data,
            pagination: {
                currentPage: pagination.page,
                totalPages: Math.ceil(pagination.total / pagination.limit),
                totalItems: pagination.total,
                itemsPerPage: pagination.limit,
                hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
                hasPrevPage: pagination.page > 1
            }
        };
    }

    // Send response helper
    static send(res, statusCode, data = null, message = 'Success') {
        const response = new ApiResponse(statusCode, data, message);
        return res.status(statusCode).json(response);
    }

    // Convert to JSON
    toJSON() {
        return {
            success: this.success,
            statusCode: this.statusCode,
            message: this.message,
            data: this.data
        };
    }
}

module.exports = ApiResponse;