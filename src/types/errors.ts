/**
 * Typed domain errors (docs/architecture.md §12). Services throw these; the edge
 * (API route or Telegram handler) maps them to an HTTP status or a user message.
 * No HTTP status codes below the route layer.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class TaskNotFound extends DomainError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
  }
}

export class NotAuthorised extends DomainError {
  constructor(message = "Not authorised") {
    super(message);
  }
}

export class InvalidTransition extends DomainError {
  constructor(from: string, to: string) {
    super(`Invalid task transition: ${from} -> ${to}`);
  }
}
