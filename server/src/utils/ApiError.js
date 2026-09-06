// Thrown by services to signal an HTTP-meaningful failure (bad input, not found, conflict…).
// Controllers/asyncHandler let this bubble to app.js's error middleware, which reads .status.
class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }

    static badRequest(message) { return new ApiError(400, message); }
    static unauthorized(message) { return new ApiError(401, message); }
    static notFound(message) { return new ApiError(404, message); }
    static conflict(message) { return new ApiError(409, message); }
    static forbidden(message) { return new ApiError(403, message); }
}

module.exports = ApiError;
