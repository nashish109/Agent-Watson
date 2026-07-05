export class ApiConnectionError extends Error {
  constructor(message?: string) {
    super(message ?? "Unable to reach Watson's backend. Please check your connection.")
    this.name = "ApiConnectionError"
  }
}
