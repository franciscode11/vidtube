import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      data: null,
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    statusCode: 500,
    data: null,
    success: false,
    message: "Internal Server Error",
  });
};

export { errorHandler };
