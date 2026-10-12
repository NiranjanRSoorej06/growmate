import logging

from app.core.config import settings

logger = logging.getLogger("growmate")


_sentry_enabled = False


def init_sentry() -> bool:
    """Enable Sentry only when SENTRY_DSN is set. Returns True if enabled."""
    global _sentry_enabled
    if not settings.sentry_dsn:
        return False
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=settings.sentry_traces_sample_rate,
            send_default_pii=False,
        )
        logger.info("Sentry enabled")
        _sentry_enabled = True
        return True
    except Exception:  # monitoring must never stop the app from starting
        logger.exception("Sentry failed to initialise")
        return False


def sentry_is_enabled() -> bool:
    """Whether Sentry is actively reporting to a project (True only when SENTRY_DSN was set)."""
    return _sentry_enabled
