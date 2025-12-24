/**
 * Async Handler - Wraps async functions to catch errors
 * Eliminates need for try-catch in every controller
 */

//
// const asyncHandler = (fn) => {
//     return (req, res, next) => {
//         Promise.resolve(fn(req, res, next)).catch(next);
//     };
// };


const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};

module.exports = asyncHandler;