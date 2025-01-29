class ApiResponse {
  constructor(statusCode, data, message) {
    this.statusCode = statusCode;
    this.data = data;
    this.success = this.statusCode < 400 ? true : false;
    this.message = message;
  }
}

export { ApiResponse };
