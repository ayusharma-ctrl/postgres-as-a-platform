export class HttpError extends Error {
    public status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;

        Object.setPrototypeOf(this, new.target.prototype);

        Error.captureStackTrace(this);
    }
}

export class NotFoundError extends HttpError {
    constructor(message = "Not Found") {
        super(message, 404);
    }
}

export class UnauthorizedError extends HttpError {
    constructor(message = "Unauthorized") {
        super(message, 401);
    }
}
