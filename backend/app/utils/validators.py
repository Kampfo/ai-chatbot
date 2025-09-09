import re
import html

def sanitize_input(text: str) -> str:
    """Sanitize user input"""
    # Remove HTML tags
    text = re.sub('<.*?>', '', text)
    
    # Escape HTML entities
    text = html.escape(text)
    
    # Remove potential prompt injections
    injection_patterns = [
        r"ignore previous instructions",
        r"system:",
        r"assistant:",
        r"\[INST\]",
        r"\[/INST\]"
    ]
    
    for pattern in injection_patterns:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)
    
    # Trim whitespace
    text = text.strip()
    
    return text
