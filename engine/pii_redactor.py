"""
BlankWhale v2 — PII Redactor
Privacy-first detection and anonymization of Personally Identifiable
Information for medical, legal, and financial documents.

Runs 100% locally — NO cloud APIs, NO data leaves the machine.

Strategies:
- REDACT:       Replace with [REDACTED]
- PSEUDONYMIZE: Replace with realistic fake data
- HASH:         Replace with deterministic SHA-256 hash
"""

import re
import hashlib
import logging
from typing import List, Dict, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger("blankwhale.pii")


class RedactionStrategy(Enum):
    REDACT = "redact"
    PSEUDONYMIZE = "pseudonymize"
    HASH = "hash"


@dataclass
class PIIMatch:
    """A single PII detection."""
    category: str       # email, phone, ssn, credit_card, name, date_of_birth, address
    original: str       # The matched text
    replacement: str    # What it was replaced with
    start: int          # Character offset start
    end: int            # Character offset end


@dataclass
class RedactionResult:
    """Result from redacting a document."""
    cleaned_text: str
    matches: List[PIIMatch] = field(default_factory=list)
    total_redacted: int = 0
    categories_found: Dict[str, int] = field(default_factory=dict)


# ============================================================
# Regex-Based PII Patterns
# ============================================================

PII_PATTERNS = {
    "email": re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    ),
    "phone_us": re.compile(
        r'(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    ),
    "phone_intl": re.compile(
        r'\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b'
    ),
    "ssn": re.compile(
        r'\b\d{3}[-]?\d{2}[-]?\d{4}\b'
    ),
    "credit_card": re.compile(
        r'\b(?:\d{4}[-\s]?){3}\d{4}\b'
    ),
    "date_of_birth": re.compile(
        r'\b(?:DOB|Date of Birth|Born|Birth Date)[:\s]*'
        r'(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\w+ \d{1,2},?\s*\d{4})',
        re.IGNORECASE,
    ),
    "ip_address": re.compile(
        r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
    ),
    "medical_record": re.compile(
        r'\b(?:MRN|Medical Record|Patient ID)[:\s#]*[A-Z0-9-]{4,}\b',
        re.IGNORECASE,
    ),
}

# Pseudonymization replacements
PSEUDO_MAP = {
    "email": "user@example.com",
    "phone_us": "(555) 000-0000",
    "phone_intl": "+1-555-000-0000",
    "ssn": "000-00-0000",
    "credit_card": "0000-0000-0000-0000",
    "date_of_birth": "DOB: 01/01/1990",
    "ip_address": "0.0.0.0",
    "medical_record": "MRN: XXXXX",
    "name": "[NAME]",
    "location": "[LOCATION]",
    "organization": "[ORG]",
}


# ============================================================
# Core Redactor
# ============================================================

def redact_pii(
    text: str,
    strategy: str = "redact",
    categories: List[str] | None = None,
    use_ner: bool = True,
) -> RedactionResult:
    """
    Detect and redact PII from text.
    
    Args:
        text:       Input text to scan
        strategy:   "redact", "pseudonymize", or "hash"
        categories: Optional list of PII categories to detect.
                    If None, detects all known categories.
        use_ner:    Whether to use spaCy NER for name/location detection
    
    Returns:
        RedactionResult with cleaned text and match details
    """
    strat = RedactionStrategy(strategy)
    all_matches: List[PIIMatch] = []
    
    # 1. Regex-based detection
    active_patterns = PII_PATTERNS
    if categories:
        active_patterns = {k: v for k, v in PII_PATTERNS.items() if k in categories}
    
    for category, pattern in active_patterns.items():
        for match in pattern.finditer(text):
            replacement = _get_replacement(category, match.group(), strat)
            all_matches.append(PIIMatch(
                category=category,
                original=match.group(),
                replacement=replacement,
                start=match.start(),
                end=match.end(),
            ))
    
    # 2. NER-based detection (names, locations, organizations)
    if use_ner:
        ner_matches = _detect_with_ner(text, strat)
        all_matches.extend(ner_matches)
    
    # 3. Apply replacements (reverse order to preserve offsets)
    all_matches.sort(key=lambda m: m.start, reverse=True)
    
    # Deduplicate overlapping matches (keep longest)
    deduped = _deduplicate_matches(all_matches)
    
    cleaned = text
    for m in deduped:
        cleaned = cleaned[:m.start] + m.replacement + cleaned[m.end:]
    
    # Build category counts
    cat_counts: Dict[str, int] = {}
    for m in deduped:
        cat_counts[m.category] = cat_counts.get(m.category, 0) + 1
    
    logger.info(f"Redacted {len(deduped)} PII instances across {len(cat_counts)} categories")
    
    return RedactionResult(
        cleaned_text=cleaned,
        matches=deduped,
        total_redacted=len(deduped),
        categories_found=cat_counts,
    )


def _get_replacement(category: str, original: str, strategy: RedactionStrategy) -> str:
    """Generate replacement text based on strategy."""
    if strategy == RedactionStrategy.REDACT:
        return f"[{category.upper()}_REDACTED]"
    
    elif strategy == RedactionStrategy.PSEUDONYMIZE:
        return PSEUDO_MAP.get(category, f"[{category.upper()}]")
    
    elif strategy == RedactionStrategy.HASH:
        h = hashlib.sha256(original.encode()).hexdigest()[:12]
        return f"[HASH:{h}]"
    
    return f"[{category.upper()}]"


def _detect_with_ner(text: str, strategy: RedactionStrategy) -> List[PIIMatch]:
    """Use spaCy NER to detect person names, locations, and organizations."""
    matches = []
    
    try:
        import spacy
        
        # Try to load the model
        try:
            nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.info("Downloading spaCy model en_core_web_sm...")
            from spacy.cli import download
            download("en_core_web_sm")
            nlp = spacy.load("en_core_web_sm")
        
        # Process text (limit to 100k chars for performance)
        doc = nlp(text[:100_000])
        
        ner_map = {
            "PERSON": "name",
            "GPE": "location",
            "LOC": "location",
            "ORG": "organization",
        }
        
        for ent in doc.ents:
            if ent.label_ in ner_map:
                category = ner_map[ent.label_]
                replacement = _get_replacement(category, ent.text, strategy)
                matches.append(PIIMatch(
                    category=category,
                    original=ent.text,
                    replacement=replacement,
                    start=ent.start_char,
                    end=ent.end_char,
                ))
    
    except ImportError:
        logger.warning("spaCy not installed — skipping NER-based PII detection. "
                       "Install: pip install spacy && python -m spacy download en_core_web_sm")
    except Exception as e:
        logger.warning(f"NER detection failed: {e}")
    
    return matches


def _deduplicate_matches(matches: List[PIIMatch]) -> List[PIIMatch]:
    """Remove overlapping matches, keeping the longest one."""
    if not matches:
        return []
    
    # Sort by start position, then by length (longest first)
    sorted_matches = sorted(matches, key=lambda m: (m.start, -(m.end - m.start)))
    
    result = [sorted_matches[0]]
    for m in sorted_matches[1:]:
        last = result[-1]
        # If current match doesn't overlap with the last kept match
        if m.start >= last.end:
            result.append(m)
    
    # Re-sort in reverse for replacement
    result.sort(key=lambda m: m.start, reverse=True)
    return result


# ============================================================
# Convenience Functions
# ============================================================

def scan_for_pii(text: str) -> Dict[str, int]:
    """Quick scan — returns category counts without modifying text."""
    result = redact_pii(text, strategy="redact")
    return result.categories_found


def redact_document(text: str, strategy: str = "redact") -> str:
    """Simple interface — returns just the cleaned text."""
    return redact_pii(text, strategy=strategy).cleaned_text
