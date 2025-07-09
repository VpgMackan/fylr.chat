import importlib.util
from pathlib import Path


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
        print("Discovering handlers...")

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
                                print(
                                    f"Warning: Handler for '{ftype}' is being overridden by {file_path.name}"
                                )
                            self._handlers[ftype] = module.handle
                            print(f"  -> Registered '{ftype}' to {file_path.name}")
                else:
                    print(f"Warning: Could not create a loader for {file_path.name}")

            except Exception as e:
                print(f"Error importing handler {file_path.name}: {e}")

    def process_data(self, file_type: str, buffer: bytes):
        """
        Selects the correct handler and processes the buffer.
        """
        handler = self._handlers.get(file_type)
        if handler:
            try:
                return handler(buffer)
            except Exception as e:
                return f"Error executing handler for '{file_type}': {e}"
        else:
            return f"Error: No handler found for file type '{file_type}'"


_current_dir = Path(__file__).parent
manager = HandlerManager(_current_dir)
