// Thrown by model functions when a row doesn't exist in the caller's
// household. Lets API routes answer 404 instead of a generic 500.
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
