// ==================== HTTP STATUS CODES ====================
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION_ERROR: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER: 500,
    SERVICE_UNAVAILABLE: 503
};

// ==================== USER ROLES ====================
const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin'
};

// ==================== PERMISSIONS ====================
const PERMISSIONS = {
    // Profile
    READ_PROFILE: 'read:profile',
    UPDATE_PROFILE: 'update:profile',

    // Users
    READ_USERS: 'read:users',
    CREATE_USERS: 'create:users',
    UPDATE_USERS: 'update:users',
    DELETE_USERS: 'delete:users',

    // Roles
    MANAGE_ROLES: 'manage:roles'
};

// ==================== TOKEN CONFIG ====================
const TOKEN = {
    ACCESS_EXPIRY: '2d',
    REFRESH_EXPIRY: '7d',
    RESET_PASSWORD_EXPIRY: 10 * 60 * 1000, // 10 minutes
    VERIFICATION_EXPIRY: 24 * 60 * 60 * 1000 // 24 hours
};

// ==================== PAGINATION ====================
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
};

// ==================== REGEX PATTERNS ====================
const REGEX = {
    EMAIL: /^\S+@\S+\.\S+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    MONGO_ID: /^[a-fA-F0-9]{24}$/,
    PHONE: /^\+?[1-9]\d{1,14}$/
};

// ==================== ERROR MESSAGES ====================
const ERROR_MESSAGES = {
    // Auth
    INVALID_CREDENTIALS: 'Invalid email or password',
    UNAUTHORIZED: 'You are not authorized to access this resource',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_INVALID: 'Invalid token',

    // User
    USER_NOT_FOUND: 'User not found',
    USER_EXISTS: 'User already exists with this email',
    USER_INACTIVE: 'Your account has been deactivated',

    // Validation
    VALIDATION_FAILED: 'Validation failed',
    INVALID_ID: 'Invalid ID format',

    // General
    NOT_FOUND: 'Resource not found',
    INTERNAL_ERROR: 'Something went wrong',
    FORBIDDEN: 'You do not have permission to perform this action'
};

// ==================== SUCCESS MESSAGES ====================
const SUCCESS_MESSAGES = {
    // Auth
    REGISTER_SUCCESS: 'User registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    PASSWORD_RESET_SENT: 'Password reset email sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',

    // User
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    USER_DELETED: 'User deleted successfully',
    PROFILE_UPDATED: 'Profile updated successfully',

    // General
    SUCCESS: 'Success',
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully'
};

// ==================== COOKIE OPTIONS ====================
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

module.exports = {
    HTTP_STATUS,
    USER_ROLES,
    PERMISSIONS,
    TOKEN,
    PAGINATION,
    REGEX,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    COOKIE_OPTIONS
};