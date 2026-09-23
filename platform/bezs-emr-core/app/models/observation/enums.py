from enum import Enum


class ObservationStatus(str, Enum):
    registered = "registered"
    preliminary = "preliminary"
    final = "final"
    amended = "amended"
    corrected = "corrected"
    cancelled = "cancelled"
    entered_in_error = "entered-in-error"
    unknown = "unknown"


class ObservationSubjectReferenceType(str, Enum):
    Patient = "Patient"
    Group = "Group"
    Device = "Device"
    Location = "Location"


class ObservationEncounterReferenceType(str, Enum):
    Encounter = "Encounter"


class ObservationSpecimenReferenceType(str, Enum):
    Specimen = "Specimen"


class ObservationDeviceReferenceType(str, Enum):
    Device = "Device"
    DeviceMetric = "DeviceMetric"


class ObservationBasedOnReferenceType(str, Enum):
    CarePlan = "CarePlan"
    DeviceRequest = "DeviceRequest"
    ImmunizationRecommendation = "ImmunizationRecommendation"
    MedicationRequest = "MedicationRequest"
    NutritionOrder = "NutritionOrder"
    ServiceRequest = "ServiceRequest"


class ObservationPartOfReferenceType(str, Enum):
    MedicationAdministration = "MedicationAdministration"
    MedicationDispense = "MedicationDispense"
    MedicationStatement = "MedicationStatement"
    Procedure = "Procedure"
    Immunization = "Immunization"
    ImagingStudy = "ImagingStudy"


class ObservationPerformerReferenceType(str, Enum):
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    CareTeam = "CareTeam"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class ObservationHasMemberReferenceType(str, Enum):
    Observation = "Observation"
    QuestionnaireResponse = "QuestionnaireResponse"
    MolecularSequence = "MolecularSequence"


class ObservationDerivedFromReferenceType(str, Enum):
    DocumentReference = "DocumentReference"
    ImagingStudy = "ImagingStudy"
    Media = "Media"
    QuestionnaireResponse = "QuestionnaireResponse"
    Observation = "Observation"
    MolecularSequence = "MolecularSequence"
