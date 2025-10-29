
export const globalErrorHandler = (err, req, res, next) => {
    const status = err.statusCode ||err.cause || 500;
    const message = err.message || "Something went wrong";
      return res
      .status(status)
      .json({
        message,
        error : err.message,
        stack : err.stack
      });
}