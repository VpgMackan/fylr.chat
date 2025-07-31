# packages/generator/generator/generators/summary/prompts.py
from typing import List, Dict, Any


def format_document(doc: Dict[str, Any]) -> str:
    """Formats a single document for inclusion in the prompt."""
    return f"<document name='{doc['name']}'>\n{doc['content']}\n</document>"


def create_summary_prompt(documents: List[Dict[str, Any]], summary_title: str) -> str:
    """
    Creates a detailed prompt for the LLM to generate a summary.
    """
    formatted_docs = "\n\n".join([format_document(doc) for doc in documents])

    return f"""
You are an expert content summarizer. Your task is to generate a comprehensive summary based on the provided documents.

**Instructions:**
1.  Read all the provided documents carefully.
2.  Synthesize the information to create a detailed, well-structured summary for the topic: "{summary_title}".
3.  The summary should be in Markdown format.
4.  Do not include any information that is not present in the provided documents.
5.  If the documents are empty or do not contain relevant information, state that a summary could not be generated.

**Provided Documents:**
---
{formatted_docs}
---

**Generated Summary:**
"""
