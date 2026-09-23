"""
Dedicated Health Unit Standardization & Conversion Module.

Provides HealthUnitConverter as the single centralized source of truth for all
biometric and wearable unit conversions across KinGuardian:
- Heart rate -> bpm
- Weight -> kg
- Distance -> meters / km
- Temperature -> Celsius
- Duration -> seconds / minutes
- Energy -> kcal
- Blood Oxygen -> percentage (%)
- Heart Rate Variability -> ms

Architectural Invariant: Never scatter unit conversions across controllers or routers.
"""

from enum import Enum
from typing import Optional, Union, Tuple, Dict, Any


class StandardUnit(str, Enum):
    """Canonical KinGuardian measurement units."""
    # Count / Discrete
    COUNT = "count"
    STEPS = "count"

    # Cardiovascular & Vitals
    BPM = "bpm"
    BRPM = "brpm"
    MS = "ms"
    PERCENTAGE = "percentage"
    PERCENT = "%"

    # Distance
    METERS = "meters"
    KILOMETERS = "km"
    MILES = "miles"

    # Mass / Weight
    KILOGRAMS = "kg"
    GRAMS = "g"
    POUNDS = "lbs"

    # Temperature
    CELSIUS = "celsius"
    FAHRENHEIT = "fahrenheit"

    # Time / Duration
    SECONDS = "seconds"
    MINUTES = "minutes"
    HOURS = "hours"

    # Energy
    KCAL = "kcal"
    KILOJOULES = "kJ"
    JOULES = "J"

    # Scores
    SCORE = "score"


class HealthUnitConverter:
    """
    Centralized conversion engine for health, fitness, and wearable biometrics.
    Ensures mathematical consistency, handles unit aliases, and prevents fragmented logic.
    """

    # -------------------------------------------------------------------------
    # 1. Heart Rate & Vitals (bpm, brpm, ms, %)
    # -------------------------------------------------------------------------

    @staticmethod
    def to_bpm(value: Union[int, float, str, None], source_unit: Optional[str] = None) -> Optional[int]:
        """
        Normalizes heart rate / pulse into integer bpm.
        Handles Hz (e.g. 1.2 Hz -> 72 bpm) or strings.
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return None
        try:
            num = float(value)
            unit_clean = (source_unit or "").lower().strip()
            if "hz" in unit_clean:
                num = num * 60.0
            return int(round(num))
        except (ValueError, TypeError):
            return None

    @staticmethod
    def to_hrv_ms(value: Union[int, float, str, None], source_unit: Optional[str] = None) -> Optional[float]:
        """
        Normalizes Heart Rate Variability (RMSSD / SDNN) to milliseconds (ms).
        Handles seconds (e.g. 0.048 s -> 48.0 ms).
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return None
        try:
            num = float(value)
            unit_clean = (source_unit or "").lower().strip()
            if unit_clean in ("s", "sec", "seconds") or num < 0.5:
                num = num * 1000.0
            return round(num, 2)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def to_percentage(value: Union[int, float, str, None], source_unit: Optional[str] = None) -> Optional[float]:
        """
        Normalizes Blood Oxygen (SpO2) or percentages to 0.0 - 100.0%.
        Handles ratio fractions (e.g. 0.985 -> 98.5%).
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return None
        try:
            num = float(value)
            unit_clean = (source_unit or "").lower().strip()
            if "ratio" in unit_clean or (0.0 < num <= 1.0):
                num = num * 100.0
            return round(num, 2)
        except (ValueError, TypeError):
            return None

    # -------------------------------------------------------------------------
    # 2. Weight (kg)
    # -------------------------------------------------------------------------

    @staticmethod
    def to_kilograms(value: Union[int, float, str, None], source_unit: Optional[str] = "kg") -> Optional[float]:
        """
        Standardizes weight measurements to kilograms (kg).
        Converts lbs, grams, stone, and ounces.
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return None
        try:
            num = float(value)
            unit_clean = (source_unit or "kg").lower().strip()

            if unit_clean in ("lb", "lbs", "pound", "pounds", "[lb_av]"):
                num = num * 0.45359237
            elif unit_clean in ("g", "gram", "grams"):
                num = num / 1000.0
            elif unit_clean in ("st", "stone", "stones"):
                num = num * 6.35029318
            elif unit_clean in ("oz", "ounce", "ounces"):
                num = num * 0.02834952

            return round(num, 2)
        except (ValueError, TypeError):
            return None

    # -------------------------------------------------------------------------
    # 3. Distance (meters / km)
    # -------------------------------------------------------------------------

    @staticmethod
    def to_meters(value: Union[int, float, str, None], source_unit: Optional[str] = "meters") -> float:
        """
        Standardizes physical distance to meters (m).
        Converts km, miles, feet, yards, and cm.
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return 0.0
        try:
            num = float(value)
            unit_clean = (source_unit or "meters").lower().strip()

            if unit_clean in ("km", "kilometer", "kilometers"):
                num = num * 1000.0
            elif unit_clean in ("mi", "mile", "miles", "[mi_i]"):
                num = num * 1609.344
            elif unit_clean in ("yd", "yard", "yards"):
                num = num * 0.9144
            elif unit_clean in ("ft", "feet", "foot", "[ft_i]"):
                num = num * 0.3048
            elif unit_clean in ("cm", "centimeter", "centimeters"):
                num = num / 100.0

            return round(num, 2)
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def to_kilometers(value: Union[int, float, str, None], source_unit: Optional[str] = "km") -> float:
        """Standardizes physical distance to kilometers (km)."""
        meters = HealthUnitConverter.to_meters(value, source_unit=source_unit)
        return round(meters / 1000.0, 3)

    # -------------------------------------------------------------------------
    # 4. Temperature (Celsius)
    # -------------------------------------------------------------------------

    @staticmethod
    def to_celsius(value: Union[int, float, str, None], source_unit: Optional[str] = "celsius") -> Optional[float]:
        """
        Standardizes body or ambient temperature to Celsius (°C).
        Converts Fahrenheit (°F) and Kelvin (K).
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return None
        try:
            num = float(value)
            unit_clean = (source_unit or "celsius").lower().strip()

            if unit_clean in ("f", "fahrenheit", "[degf]", "degf") or (unit_clean == "celsius" and num > 50.0):
                num = (num - 32.0) * (5.0 / 9.0)
            elif unit_clean in ("k", "kelvin"):
                num = num - 273.15

            return round(num, 2)
        except (ValueError, TypeError):
            return None

    # -------------------------------------------------------------------------
    # 5. Duration (seconds / minutes)
    # -------------------------------------------------------------------------

    @staticmethod
    def to_seconds(value: Union[int, float, str, None], source_unit: Optional[str] = "seconds") -> int:
        """
        Standardizes time duration into integer seconds.
        Converts minutes, hours, and milliseconds.
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return 0
        try:
            num = float(value)
            unit_clean = (source_unit or "seconds").lower().strip()

            if unit_clean in ("min", "minute", "minutes", "m"):
                num = num * 60.0
            elif unit_clean in ("h", "hr", "hour", "hours"):
                num = num * 3600.0
            elif unit_clean in ("ms", "millisecond", "milliseconds"):
                num = num / 1000.0

            return int(round(num))
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def to_minutes(value: Union[int, float, str, None], source_unit: Optional[str] = "minutes") -> int:
        """Standardizes time duration into integer minutes."""
        seconds = HealthUnitConverter.to_seconds(value, source_unit=source_unit)
        return int(round(seconds / 60.0))

    # -------------------------------------------------------------------------
    # 6. Energy (kcal)
    # -------------------------------------------------------------------------

    @staticmethod
    def to_kcal(value: Union[int, float, str, None], source_unit: Optional[str] = "kcal") -> float:
        """
        Standardizes energy expenditure / calories burned into kcal.
        Converts kilojoules (kJ), joules (J), and calories (cal).
        """
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return 0.0
        try:
            num = float(value)
            unit_clean = (source_unit or "kcal").lower().strip()

            if unit_clean in ("kj", "kilojoule", "kilojoules"):
                num = num / 4.184
            elif unit_clean in ("j", "joule", "joules"):
                num = num / 4184.0
            elif unit_clean in ("cal", "calorie", "calories"):
                num = num / 1000.0

            return round(num, 2)
        except (ValueError, TypeError):
            return 0.0

    # -------------------------------------------------------------------------
    # 7. Discrete Steps & Count
    # -------------------------------------------------------------------------

    @staticmethod
    def to_count(value: Union[int, float, str, None]) -> int:
        """Standardizes step counts, floor counts, and discrete counters to integer."""
        if value is None or value == "" or str(value).lower() in ("nan", "null", "none"):
            return 0
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0
