"""
BlankWhale v2 — Automatic QA Pair Generator
Converts extracted document text into high-quality instruction/response
training pairs using template-based generation.

No LLM needed for generation — uses structural analysis and templates
to produce training-ready data from any document content.

Vertical Templates:
- Medical QA:          Patient symptoms → diagnosis-style QA
- Legal Summarization: Legal text → summary pairs
- Knowledge Base:      General content → factual QA
- Turkish Medical:     Tıbbi metin → Soru-Cevap çiftleri
"""

import re
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("blankwhale.qa_gen")


# ============================================================
# Templates
# ============================================================

@dataclass
class TrainingTemplate:
    """A named template for generating training pairs."""
    name: str
    description: str
    system_prompt: str
    instruction_templates: List[str]
    format: str = "alpaca"  # alpaca | sharegpt | completion


# Built-in vertical templates
TEMPLATES: Dict[str, TrainingTemplate] = {
    "medical_qa": TrainingTemplate(
        name="Medical QA",
        description="Generate medical question-answer pairs from clinical text",
        system_prompt="You are a medical knowledge assistant. Answer questions accurately based on clinical information.",
        instruction_templates=[
            "What does the following medical information indicate?\n\n{text}",
            "Summarize the key clinical findings:\n\n{text}",
            "Based on the following patient data, what are the relevant observations?\n\n{text}",
            "Explain the medical significance of:\n\n{text}",
            "What diagnosis or condition is described in the following?\n\n{text}",
        ],
    ),
    "legal_summary": TrainingTemplate(
        name="Legal Summarization",
        description="Generate legal summary pairs from legislation and contracts",
        system_prompt="You are a legal assistant. Provide clear, accurate summaries of legal documents.",
        instruction_templates=[
            "Summarize the following legal provision in plain language:\n\n{text}",
            "What are the key obligations defined in this clause?\n\n{text}",
            "Explain the legal implications of the following:\n\n{text}",
            "What rights and responsibilities are outlined here?\n\n{text}",
        ],
    ),
    "knowledge_base": TrainingTemplate(
        name="Internal Knowledge Base",
        description="Generate factual QA from internal documentation",
        system_prompt="You are a helpful assistant with expertise in the following domain.",
        instruction_templates=[
            "What is described in the following passage?\n\n{text}",
            "Summarize the key points:\n\n{text}",
            "Based on the following information, answer comprehensively:\n\n{text}",
            "Explain the following concept or process:\n\n{text}",
            "What are the main takeaways from this text?\n\n{text}",
        ],
    ),
    "turkish_medical": TrainingTemplate(
        name="Türkçe Tıbbi Soru-Cevap",
        description="Tıbbi metinlerden Türkçe soru-cevap çiftleri oluşturur",
        system_prompt="Tıbbi bilgi asistanısınız. Klinik bilgilere dayanarak soruları doğru yanıtlayın.",
        instruction_templates=[
            "Aşağıdaki tıbbi bilgi ne anlama geliyor?\n\n{text}",
            "Temel klinik bulguları özetleyin:\n\n{text}",
            "Bu hasta verilerine göre önemli gözlemler nelerdir?\n\n{text}",
            "Aşağıdaki tıbbi durumu açıklayın:\n\n{text}",
        ],
    ),
    "code_qa": TrainingTemplate(
        name="Code Documentation QA",
        description="Generate code explanation and documentation pairs",
        system_prompt="You are a programming assistant. Explain code clearly and accurately.",
        instruction_templates=[
            "Explain what the following code does:\n\n{text}",
            "What is the purpose of this code?\n\n{text}",
            "Describe the logic and flow of this code:\n\n{text}",
        ],
    ),
}


# ============================================================
# QA Pair Generator
# ============================================================

def generate_qa_pairs(
    chunks: List[str],
    template_name: str = "knowledge_base",
    format_type: str = "alpaca",
    pairs_per_chunk: int = 2,
    min_chunk_words: int = 20,
) -> List[Dict[str, Any]]:
    """
    Generate training QA pairs from text chunks using structural templates.
    
    Args:
        chunks:          List of text chunks from the extraction pipeline
        template_name:   Which vertical template to use
        format_type:     Output format: "alpaca", "sharegpt", or "completion"
        pairs_per_chunk: Max pairs to generate per chunk
        min_chunk_words: Skip chunks shorter than this
    
    Returns:
        List of training records ready for JSONL export
    """
    template = TEMPLATES.get(template_name, TEMPLATES["knowledge_base"])
    records = []
    
    for chunk in chunks:
        if not chunk.strip():
            continue
        
        word_count = len(chunk.split())
        if word_count < min_chunk_words:
            continue
        
        # Generate pairs using rotating instruction templates
        for i in range(min(pairs_per_chunk, len(template.instruction_templates))):
            instruction = template.instruction_templates[i % len(template.instruction_templates)]
            
            record = _format_record(
                instruction=instruction.format(text=chunk),
                response=chunk,
                system_prompt=template.system_prompt,
                format_type=format_type,
            )
            records.append(record)
        
        # If chunk has headers, also generate header-based QA
        header_pairs = _generate_from_headers(chunk, template, format_type)
        records.extend(header_pairs)
        
        # If chunk has a table, generate table-based QA
        if "|" in chunk and "---" in chunk:
            table_pairs = _generate_from_table(chunk, template, format_type)
            records.extend(table_pairs)
    
    logger.info(f"Generated {len(records)} training pairs using '{template_name}' template")
    return records


def _format_record(
    instruction: str,
    response: str,
    system_prompt: str,
    format_type: str,
) -> Dict[str, Any]:
    """Format a single training record in the specified format."""
    if format_type == "alpaca":
        return {
            "instruction": instruction,
            "input": "",
            "output": response,
        }
    
    elif format_type == "sharegpt":
        conversations = [
            {"from": "system", "value": system_prompt},
            {"from": "human", "value": instruction},
            {"from": "gpt", "value": response},
        ]
        return {"conversations": conversations}
    
    elif format_type == "completion":
        return {"text": f"{system_prompt}\n\nUser: {instruction}\n\nAssistant: {response}"}
    
    return {"text": f"{instruction}\n{response}"}


def _generate_from_headers(
    chunk: str,
    template: TrainingTemplate,
    format_type: str,
) -> List[Dict[str, Any]]:
    """Generate QA pairs from markdown headers and their content."""
    records = []
    
    # Find sections with headers
    sections = re.split(r'\n(#{1,3}\s+.+)\n', chunk)
    
    current_header = None
    for part in sections:
        part = part.strip()
        if not part:
            continue
        
        if re.match(r'^#{1,3}\s+', part):
            current_header = re.sub(r'^#{1,3}\s+', '', part).strip()
        elif current_header and len(part.split()) >= 15:
            record = _format_record(
                instruction=f"What does the section '{current_header}' describe?",
                response=part,
                system_prompt=template.system_prompt,
                format_type=format_type,
            )
            records.append(record)
            current_header = None
    
    return records


def _generate_from_table(
    chunk: str,
    template: TrainingTemplate,
    format_type: str,
) -> List[Dict[str, Any]]:
    """Generate QA pair from a markdown table."""
    records = []
    
    # Find table in the chunk
    table_match = re.search(r'(\|.+\|[\n\r]+\|[-\s|]+\|[\n\r]+(?:\|.+\|[\n\r]*)+)', chunk)
    if table_match:
        table_text = table_match.group(1)
        record = _format_record(
            instruction=f"Interpret the data in the following table:\n\n{table_text}",
            response=f"The table contains the following information:\n\n{table_text}",
            system_prompt=template.system_prompt,
            format_type=format_type,
        )
        records.append(record)
    
    return records


# ============================================================
# Template Management
# ============================================================

def list_templates() -> List[Dict[str, str]]:
    """Return available templates as a serializable list."""
    return [
        {
            "id": tid,
            "name": t.name,
            "description": t.description,
            "format": t.format,
        }
        for tid, t in TEMPLATES.items()
    ]


def load_custom_template(path: str) -> TrainingTemplate:
    """Load a custom template from a JSON file."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    
    return TrainingTemplate(
        name=data["name"],
        description=data.get("description", ""),
        system_prompt=data.get("system_prompt", "You are a helpful assistant."),
        instruction_templates=data.get("instruction_templates", [
            "Explain the following:\n\n{text}",
        ]),
        format=data.get("format", "alpaca"),
    )


def save_template(template: TrainingTemplate, path: str):
    """Save a template to JSON for reuse."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    
    data = {
        "name": template.name,
        "description": template.description,
        "system_prompt": template.system_prompt,
        "instruction_templates": template.instruction_templates,
        "format": template.format,
    }
    
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info(f"Saved template '{template.name}' to {path}")
