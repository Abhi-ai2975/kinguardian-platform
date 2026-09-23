"""
AI Source Transparency Module.

Provides clear, verifiable source provenance and attribution for AI insights and Guardian Moments.

Examples:
Single Source:
Based on:
Garmin
Aug 1–22
21 days of activity data

Multiple Sources:
Based on:
Garmin activity
Apple Health sleep
Medication records
Parent check-ins
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field


@dataclass(frozen=True)
class SourceAttributionItem:
    """
    Represents an individual source stream contributing to an AI insight.
    """
    provider_or_system: str      # "Garmin", "Apple Health", "Medication records", "Parent check-ins"
    category: str                # "activity", "sleep", "recovery", "medications", "checkins"
    date_range: Optional[str] = None     # "Aug 1–22"
    data_summary: Optional[str] = None   # "21 days of activity data"
    details: Dict[str, Any] = field(default_factory=dict)

    def to_multi_source_label(self) -> str:
        """
        Formats item for multi-source display list:
        e.g. 'Garmin activity', 'Apple Health sleep', 'Medication records', 'Parent check-ins'
        """
        p = self.provider_or_system.strip()
        cat = self.category.strip().lower()

        # If provider already contains the category name (e.g. 'Medication records' or 'Parent check-ins')
        if "record" in p.lower() or "check-in" in p.lower() or "checkin" in p.lower() or "report" in p.lower():
            return p
        
        if cat in ("activity", "sleep", "recovery", "vitals", "steps"):
            return f"{p} {cat}"
        
        return p


@dataclass(frozen=True)
class AISourceTransparency:
    """
    Attribution container showing exact provenance for AI insights and Guardian Moments.
    """
    sources: List[SourceAttributionItem] = field(default_factory=list)

    @classmethod
    def create_single_source(
        cls,
        provider: str = "Garmin",
        category: str = "activity",
        date_range: str = "Aug 1–22",
        data_summary: str = "21 days of activity data",
        details: Optional[Dict[str, Any]] = None
    ) -> "AISourceTransparency":
        item = SourceAttributionItem(
            provider_or_system=provider,
            category=category,
            date_range=date_range,
            data_summary=data_summary,
            details=details or {}
        )
        return cls(sources=[item])

    @classmethod
    def create_multi_source(
        cls,
        sources: List[SourceAttributionItem]
    ) -> "AISourceTransparency":
        return cls(sources=sources)

    def format_display_text(self) -> str:
        """
        Renders human-readable source attribution text formatted exactly to KinGuardian design principles.
        """
        if not self.sources:
            return "Based on: Verified health records"

        if len(self.sources) == 1:
            s = self.sources[0]
            lines = ["Based on:", s.provider_or_system]
            if s.date_range:
                lines.append(s.date_range)
            if s.data_summary:
                lines.append(s.data_summary)
            return "\n".join(lines)

        # Multi-source rendering
        lines = ["Based on:"]
        for s in self.sources:
            lines.append(s.to_multi_source_label())
        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "formatted_text": self.format_display_text(),
            "source_count": len(self.sources),
            "sources": [
                {
                    "provider": s.provider_or_system,
                    "category": s.category,
                    "date_range": s.date_range,
                    "data_summary": s.data_summary,
                    "display_label": s.to_multi_source_label()
                }
                for s in self.sources
            ]
        }
