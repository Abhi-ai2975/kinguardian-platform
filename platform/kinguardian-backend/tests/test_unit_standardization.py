"""
Unit Standardization Test Suite.

Verifies HealthUnitConverter as the dedicated, centralized unit conversion utility:
- heart rate -> bpm (beats per minute)
- weight -> kg (kilograms)
- distance -> meters / km
- temperature -> Celsius (°C)
- duration -> seconds / minutes
- energy -> kcal (kilocalories)
- blood oxygen -> percentage (%)
- HRV -> ms (milliseconds)
- Discrete counts -> count
"""

import pytest
from app.domains.wearables.domain.units import HealthUnitConverter, StandardUnit


def test_heart_rate_standardization_to_bpm():
    """Verifies heart rate conversion to standard integer bpm."""
    # Standard bpm
    assert HealthUnitConverter.to_bpm(72, "bpm") == 72
    assert HealthUnitConverter.to_bpm("68", "bpm") == 68

    # Frequency in Hz (1.25 Hz = 75 bpm)
    assert HealthUnitConverter.to_bpm(1.25, "Hz") == 75

    # Invalid / Missing
    assert HealthUnitConverter.to_bpm(None) is None
    assert HealthUnitConverter.to_bpm("NaN") is None
    assert HealthUnitConverter.to_bpm("") is None


def test_weight_standardization_to_kg():
    """Verifies weight conversion to standard kilograms (kg)."""
    # Pounds to kg (154.32 lbs ≈ 70.0 kg)
    assert HealthUnitConverter.to_kilograms(154.32, "lbs") == 70.0
    assert HealthUnitConverter.to_kilograms(220.462, "pounds") == 100.0

    # Grams to kg (75000 g = 75.0 kg)
    assert HealthUnitConverter.to_kilograms(75000, "g") == 75.0

    # Stone to kg (11 st ≈ 69.85 kg)
    assert HealthUnitConverter.to_kilograms(11, "stone") == 69.85

    # Native kg
    assert HealthUnitConverter.to_kilograms(65.4, "kg") == 65.4

    # Invalid / Missing
    assert HealthUnitConverter.to_kilograms(None) is None
    assert HealthUnitConverter.to_kilograms("invalid") is None


def test_distance_standardization_to_meters_and_km():
    """Verifies physical distance conversion to meters and kilometers."""
    # Kilometers to meters (5.5 km = 5500.0 m)
    assert HealthUnitConverter.to_meters(5.5, "km") == 5500.0
    assert HealthUnitConverter.to_kilometers(5500.0, "meters") == 5.5

    # Miles to meters (3.1 miles ≈ 4988.97 m ≈ 5k)
    assert HealthUnitConverter.to_meters(3.1, "miles") == 4988.97

    # Feet to meters (100 ft = 30.48 m)
    assert HealthUnitConverter.to_meters(100, "ft") == 30.48

    # Yards to meters (100 yd = 91.44 m)
    assert HealthUnitConverter.to_meters(100, "yards") == 91.44

    # Centimeters to meters (180 cm = 1.8 m)
    assert HealthUnitConverter.to_meters(180, "cm") == 1.8

    # Invalid / Missing
    assert HealthUnitConverter.to_meters(None) == 0.0
    assert HealthUnitConverter.to_meters("") == 0.0


def test_temperature_standardization_to_celsius():
    """Verifies temperature conversion to Celsius (°C)."""
    # Fahrenheit to Celsius (98.6 °F = 37.0 °C, 100.4 °F = 38.0 °C)
    assert HealthUnitConverter.to_celsius(98.6, "F") == 37.0
    assert HealthUnitConverter.to_celsius(100.4, "fahrenheit") == 38.0
    assert HealthUnitConverter.to_celsius(32.0, "F") == 0.0

    # Auto-detection of Fahrenheit when value > 50°
    assert HealthUnitConverter.to_celsius(99.5) == 37.5

    # Kelvin to Celsius (310.15 K = 37.0 °C)
    assert HealthUnitConverter.to_celsius(310.15, "K") == 37.0

    # Native Celsius
    assert HealthUnitConverter.to_celsius(36.6, "celsius") == 36.6

    # Invalid / Missing
    assert HealthUnitConverter.to_celsius(None) is None
    assert HealthUnitConverter.to_celsius("null") is None


def test_duration_standardization_to_seconds_and_minutes():
    """Verifies time duration conversion to seconds and minutes."""
    # Minutes to seconds (45 min = 2700 s)
    assert HealthUnitConverter.to_seconds(45, "minutes") == 2700
    assert HealthUnitConverter.to_minutes(2700, "seconds") == 45

    # Hours to minutes / seconds (1.5 hours = 90 min = 5400 s)
    assert HealthUnitConverter.to_minutes(1.5, "hours") == 90
    assert HealthUnitConverter.to_seconds(1.5, "hours") == 5400

    # Milliseconds to seconds (15000 ms = 15 s)
    assert HealthUnitConverter.to_seconds(15000, "ms") == 15

    # Invalid / Missing
    assert HealthUnitConverter.to_seconds(None) == 0
    assert HealthUnitConverter.to_minutes(None) == 0


def test_energy_standardization_to_kcal():
    """Verifies energy and calorie expenditure conversion to kcal."""
    # Kilojoules to kcal (8368 kJ ≈ 2000.0 kcal)
    assert HealthUnitConverter.to_kcal(8368, "kJ") == 2000.0

    # Joules to kcal (418400 J = 100.0 kcal)
    assert HealthUnitConverter.to_kcal(418400, "J") == 100.0

    # Small calories (cal) to kcal (500000 cal = 500.0 kcal)
    assert HealthUnitConverter.to_kcal(500000, "cal") == 500.0

    # Native kcal
    assert HealthUnitConverter.to_kcal(450.5, "kcal") == 450.5

    # Invalid / Missing
    assert HealthUnitConverter.to_kcal(None) == 0.0


def test_blood_oxygen_and_hrv_standardization():
    """Verifies SpO2 percentage and HRV ms standardization."""
    # SpO2 ratio fraction to percentage (0.978 -> 97.8%)
    assert HealthUnitConverter.to_percentage(0.978, "ratio") == 97.8
    assert HealthUnitConverter.to_percentage(98.5, "%") == 98.5

    # HRV seconds to milliseconds (0.052 s -> 52.0 ms)
    assert HealthUnitConverter.to_hrv_ms(0.052, "s") == 52.0
    assert HealthUnitConverter.to_hrv_ms(45.0, "ms") == 45.0
