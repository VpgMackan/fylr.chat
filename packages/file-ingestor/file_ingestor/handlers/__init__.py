import structlog
import importlib.util
from pathlib import Path

log = structlog.getLogger(__name__)


class HandlerManager:
    """
    Discovers, registers, and dispatches to appropriate file handlers.
    This version can load handlers from files with dots in their names
    (e.g., 'markdown.handler.py').
    """

    def __init__(self, handler_dir: Path):
        self._handlers = {}
        self._handler_dir = handler_dir
        self._package_name = handler_dir.name
        self._discover_handlers()

    def _discover_handlers(self):
        """
        Dynamically imports all valid handler modules from this package,
        supporting both 'name_handler.py' and 'name.handler.py' conventions.
        """
        log.info(
            f"Discovering handlers in directory: {self._handler_dir.resolve()}",
            method="_discover_handlers",
        )

        for file_path in self._handler_dir.glob("*.py"):
            if file_path.name.startswith("__") or not (
                file_path.name.endswith(".handler.py")
                or file_path.name.endswith("_handler.py")
            ):
                continue

            module_name_sanitized = file_path.stem.replace(".", "_").replace("-", "_")

            try:
                spec = importlib.util.spec_from_file_location(
                    module_name_sanitized, file_path
                )

                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)

                    if hasattr(module, "supported_types") and hasattr(module, "handle"):
                        for ftype in module.supported_types:
                            if ftype in self._handlers:
                                log.warning(
                                    f"Handler for '{ftype}' already registered. "
                                    "Overwriting with the latest handler.",
                                    method="_discover_handlers",
                                )
                            self._handlers[ftype] = module.handle
                            log.info(
                                f"Registered handler for '{ftype}' from {file_path.name}",
                                method="_discover_handlers",
                            )
                else:
                    log.warning(
                        f"Could not create a loader for {file_path.name}. "
                        "Ensure the file is a valid Python module.",
                        method="_discover_handlers",
                    )

            except Exception as e:
                log.error(
                    f"Error importing handler {file_path.name}: {e}",
                    method="_discover_handlers",
                )

    def process_data(
        self, file_type: str, buffer: bytes, job_key: str, info_callback: callable
    ):
        """
        Selects the correct handler and processes the buffer, passing along context.
        """
        handler = self._handlers.get(file_type)
        if handler:
            try:
                return handler(buffer, job_key, info_callback)
            except Exception as e:
                error_message = f"Error executing handler for '{file_type}': {e}"
                info_callback(
                    error_message, job_key, {"error": True, "message": error_message}
                )
                raise RuntimeError(error_message)
        else:
            error_message = f"No handler found for file type '{file_type}'"
            info_callback(
                error_message, job_key, {"error": True, "message": error_message}
            )
            raise RuntimeError(error_message)


_current_dir = Path(__file__).parent
manager = HandlerManager(_current_dir)
