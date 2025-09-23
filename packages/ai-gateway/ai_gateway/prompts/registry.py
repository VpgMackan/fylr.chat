# ai_gateway/prompts/registry.py
import os
import structlog
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml
from jinja2 import Environment, FileSystemLoader, Template, StrictUndefined, meta

log = structlog.get_logger()


class PromptNotFound(Exception):
    pass


class PromptRenderError(Exception):
    pass


class PromptValidationError(Exception):
    pass


class PromptEntry:
    """
    In-memory representation of a prompt template loaded from YAML.
    """

    def __init__(self, raw: Dict[str, Any], filename: Path):
        self.raw = raw
        self.filename = filename
        self.id: str = raw.get("id") or raw.get("name") or filename.stem
        self.version: str = str(raw.get("version", "v1"))
        self.description: str = raw.get("description", "")
        self.form: str = raw.get("form", "prompt")
        self.template_text: Optional[str] = raw.get("template")
        self.messages_template_text: Optional[str] = raw.get("messages_template")
        self.variables: List[Dict[str, Any]] = raw.get("variables", [])
        self.meta: Dict[str, Any] = raw.get("meta", {})
        self._compiled_template: Optional[Template] = None
        self._compiled_messages_template: Optional[Template] = None

    def key(self) -> str:
        return f"{self.id}@{self.version}"


class PromptRegistry:
    """
    Loads all YAML prompts from a directory into memory and provides
    methods to render them quickly.
    """

    def __init__(self, prompts_dir: str, jinja_env: Optional[Environment] = None):
        self.prompts_dir = Path(prompts_dir)
        if not self.prompts_dir.exists():
            raise ValueError(
                f"Prompts directory does not exist: {str(self.prompts_dir)}"
            )

        self.jinja = jinja_env or Environment(
            loader=FileSystemLoader(str(self.prompts_dir)),
            undefined=StrictUndefined,
            keep_trailing_newline=True,
            autoescape=False,
        )
        self._store: Dict[str, PromptEntry] = {}
        self._load_all_into_memory()

    def _load_all_into_memory(self) -> None:
        """
        Read all .yml/.yaml files in the prompts_dir and compile templates.
        Called at startup to avoid disk reads during requests.
        """
        log.info(
            "Loading prompts from %s",
            str(self.prompts_dir),
            method="_load_all_into_memory",
        )
        for p in sorted(self.prompts_dir.glob("*.yml")) + sorted(
            self.prompts_dir.glob("*.yaml")
        ):
            try:
                with p.open("r", encoding="utf8") as fh:
                    raw = yaml.safe_load(fh) or {}
                entry = PromptEntry(raw=raw, filename=p)
                if entry.template_text:
                    entry._compiled_template = self.jinja.from_string(
                        entry.template_text
                    )
                if entry.messages_template_text:
                    entry._compiled_messages_template = self.jinja.from_string(
                        entry.messages_template_text
                    )
                key = entry.key()
                if key in self._store:
                    log.warning(
                        "Duplicate prompt key %s found (file %s); overwriting",
                        key,
                        p,
                        method="_load_all_into_memory",
                    )
                self._store[key] = entry
                log.debug(
                    "Loaded prompt %s from %s", key, p, method="_load_all_into_memory"
                )
            except Exception as exc:
                log.exception(
                    "Failed loading prompt file %s: %s",
                    p,
                    exc,
                    method="_load_all_into_memory",
                )

        log.info(
            "Loaded %d prompt templates into memory",
            len(self._store),
            method="_load_all_into_memory",
        )

    def list_prompts(self) -> List[str]:
        return sorted(self._store.keys())

    def get_entry(self, prompt_id: str, version: Optional[str] = None) -> PromptEntry:
        key = f"{prompt_id}@{version}" if version is not None else None
        entry = self._store.get(key) if key is not None else None
        if entry:
            return entry
        candidates = [
            e for k, e in self._store.items() if k.startswith(f"{prompt_id}@")
        ]
        if candidates:
            if version is None:
                candidates_sorted = sorted(
                    candidates, key=lambda e: e.version, reverse=True
                )
                return candidates_sorted[0]
        raise PromptNotFound(
            f"Prompt not found: {prompt_id}@{version if version is not None else 'latest'}"
        )

    def _declared_required_vars(self, entry: PromptEntry) -> List[str]:
        reqs = []
        for v in entry.variables:
            if isinstance(v, dict):
                if v.get("required"):
                    reqs.append(v["name"])
            elif isinstance(v, str):
                # old-style list
                reqs.append(v)
        if reqs:
            return reqs

        text = entry.template_text or entry.messages_template_text or ""
        if not text:
            return []
        try:
            parsed = self.jinja.parse(text)
            inferred = sorted(meta.find_undeclared_variables(parsed))
            return inferred
        except Exception:
            return []

    def _validate_vars(self, entry: PromptEntry, vars: Dict[str, Any]) -> None:
        required = self._declared_required_vars(entry)
        missing = [r for r in required if r not in (vars or {})]
        if missing:
            raise PromptValidationError(
                f"Missing required variables for {entry.key()}: {missing}"
            )

    def render(
        self,
        prompt_id: str,
        vars: Optional[Dict[str, Any]] = None,
        version: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Render a prompt identified by prompt_id and version with the provided vars.

        Returns a dict with:
          - type, version, form
          - prompt (str) OR messages (List[Dict[str,str]])
          - meta (raw metadata from YAML)
        """
        entry = self.get_entry(prompt_id, version)
        vars = vars or {}

        self._validate_vars(entry, vars)

        try:
            if entry.form == "messages":
                if not entry._compiled_messages_template:
                    raise PromptRenderError(
                        f"Prompt {entry.key()} declares form 'messages' but has no messages_template"
                    )
                rendered = entry._compiled_messages_template.render(**vars)
                try:
                    messages_parsed = yaml.safe_load(rendered)
                except Exception as exc:
                    raise PromptRenderError(
                        f"Rendered messages_template is not valid YAML/JSON: {exc}"
                    ) from exc
                if not isinstance(messages_parsed, list):
                    raise PromptRenderError(
                        "messages_template must render to a YAML/JSON list of messages"
                    )
                out_messages = []
                for i, m in enumerate(messages_parsed):
                    if not isinstance(m, dict) or "content" not in m:
                        raise PromptRenderError(
                            f"messages_template element #{i} invalid: {m!r}"
                        )
                    out_messages.append(
                        {"role": m.get("role", "user"), "content": m["content"]}
                    )
                return {
                    "type": entry.id,
                    "version": entry.version,
                    "form": "messages",
                    "messages": out_messages,
                    "meta": entry.raw,
                }

            else:
                if not entry._compiled_template:
                    raise PromptRenderError(
                        f"Prompt {entry.key()} has no template field"
                    )
                rendered = entry._compiled_template.render(**vars)
                return {
                    "type": entry.id,
                    "version": entry.version,
                    "form": "prompt",
                    "prompt": rendered,
                    "meta": entry.raw,
                }

        except PromptValidationError:
            raise
        except Exception as exc:
            log.exception(
                "Failed to render prompt %s: %s",
                entry.key(),
                exc,
                method="render",
            )
            raise PromptRenderError(
                f"Failed to render prompt {entry.key()}: {exc}"
            ) from exc

    def inspect(self, prompt_id: str, version: Optional[str] = None) -> Dict[str, Any]:
        """
        Return the raw YAML meta (as dict) and whether templates are compiled.
        Useful for admin/dev endpoints.
        """
        entry = self.get_entry(prompt_id, version)
        return {
            "type": entry.id,
            "version": entry.version,
            "description": entry.description,
            "form": entry.form,
            "variables": entry.variables,
            "has_template": entry._compiled_template is not None,
            "has_messages_template": entry._compiled_messages_template is not None,
            "raw": entry.raw,
        }
