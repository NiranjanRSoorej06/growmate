"""Thin async client for a local Ollama server. Everything here fails with AIServiceError."""

import logging
import time

import httpx

from app.core.config import settings
from app.core.errors import AIServiceError

logger = logging.getLogger("growmate.ollama")


def _base() -> str:
    return settings.ollama_url.rstrip("/")


def model_is_installed(model: str, installed: list[str]) -> bool:
    if model in installed or f"{model}:latest" in installed:
        return True
    if ":" not in model:
        return any(name.split(":")[0] == model for name in installed)
    return False


async def get_status() -> dict:
    """Never raises. Reports whether Ollama is reachable and the model is pulled."""
    model = settings.ollama_model
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{_base()}/api/tags")
            resp.raise_for_status()
            names = [m.get("name", "") for m in resp.json().get("models", [])]
    except httpx.HTTPError:
        return {
            "available": False,
            "model": model,
            "model_installed": False,
            "detail": f"Cannot reach Ollama at {settings.ollama_url}. Start it with `ollama serve`.",
        }
    except ValueError:
        return {
            "available": False,
            "model": model,
            "model_installed": False,
            "detail": "Ollama replied with something unexpected.",
        }

    if not model_is_installed(model, names):
        return {
            "available": True,
            "model": model,
            "model_installed": False,
            "detail": f"Ollama is running but {model} is not installed. Run `ollama pull {model}`.",
        }
    return {
        "available": True,
        "model": model,
        "model_installed": True,
        "detail": f"{model} is ready.",
    }


async def ensure_model_available() -> None:
    status = await get_status()
    if not status["available"]:
        raise AIServiceError("ai_unavailable", status["detail"], 503)
    if not status["model_installed"]:
        raise AIServiceError("model_not_found", status["detail"], 503)


async def chat(
    messages: list[dict],
    *,
    json_mode: bool = False,
    temperature: float = 0.4,
) -> str:
    """Send a chat request to Ollama and return the assistant text."""
    await ensure_model_available()

    payload: dict = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature, "num_predict": settings.ollama_max_tokens},
    }
    if json_mode:
        payload["format"] = "json"

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            resp = await client.post(f"{_base()}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException as exc:
        raise AIServiceError(
            "ai_timeout",
            f"{settings.ollama_model} took longer than {int(settings.ollama_timeout)}s to answer. "
            "Try again, or use a smaller model.",
            504,
        ) from exc
    except httpx.ConnectError as exc:
        raise AIServiceError(
            "ai_unavailable",
            f"Cannot reach Ollama at {settings.ollama_url}. Start it with `ollama serve`.",
            503,
        ) from exc
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise AIServiceError(
                "model_not_found",
                f"{settings.ollama_model} is not installed. "
                f"Run `ollama pull {settings.ollama_model}`.",
                503,
            ) from exc
        raise AIServiceError(
            "ai_error", f"Ollama returned HTTP {exc.response.status_code}.", 502
        ) from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise AIServiceError("ai_error", "The AI service failed unexpectedly.", 502) from exc

    content = (data.get("message") or {}).get("content", "")
    if not isinstance(content, str) or not content.strip():
        raise AIServiceError("ai_bad_response", "The model returned an empty answer.", 502)

    logger.info(
        "ollama chat ok model=%s latency=%.1fs",
        settings.ollama_model,
        time.perf_counter() - started,
    )
    return content
