export class ApiConnectionError extends Error {
  constructor(message = "Unable to reach the backend. Please check your connection.") {
    super(message)
    this.name = "ApiConnectionError"
  }
}
