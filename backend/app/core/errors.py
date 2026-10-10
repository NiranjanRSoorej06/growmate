class ServiceError(Exception):
    """A handled failure in the AI service or an external integration."""

    def __init__(self, code: str, message: str, status_code: int = 503):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class AIServiceError(ServiceError):
    """Ollama / Gemma could not produce a usable answer."""
