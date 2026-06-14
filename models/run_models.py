"""Models service entrypoint for starting the FastAPI server."""
import uvicorn

from models.app.core.config import settings
from models.app.main import app


def main() -> None:
    """Start the models service with Uvicorn."""
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
