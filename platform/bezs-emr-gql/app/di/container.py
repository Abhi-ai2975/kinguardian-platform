"""
Root dependency-injection container for the entire application.

This module defines the top-level `Container` class using the dependency-injector
library's declarative container pattern. It acts as the composition root — every
service, repository, and client in the application is wired here so that:
  - Dependencies are assembled once at startup rather than on every request.
  - The dependency graph is explicit and testable: replacing a provider (e.g. with
    a mock) requires changing one line here rather than hunting call sites.
  - FastAPI route handlers receive pre-built service instances via Depends() without
    knowing how those instances are constructed.

Wiring:
    WiringConfiguration(packages=["app"]) tells dependency-injector to scan every
    module under the `app` package at startup and inject providers wherever it finds
    the @inject decorator combined with Provide[Container.*] type hints. This avoids
    manually listing every injected module.

Container hierarchy:
    Container (root)
    ├── core               →  CoreContainer               (shared infrastructure: FHIR HTTP client)
    ├── organization       →  OrganizationContainer       (Organisation CRUD service + client)
    ├── location           →  LocationContainer           (Location CRUD service + client)
    ├── healthcare_service →  HealthcareServiceContainer  (HealthcareService CRUD service + client)
    ├── schedule           →  ScheduleContainer           (Schedule CRUD service + client)
    ├── slot               →  SlotContainer               (Slot CRUD service + client)
    ├── practitioner       →  PractitionerContainer       (Practitioner CRUD service + client)
    ├── practitioner_role  →  PractitionerRoleContainer   (PractitionerRole CRUD service + client)
    ├── patient            →  PatientContainer            (Patient CRUD + 9 sub-resource clients)
    ├── diagnostic_report  →  DiagnosticReportContainer   (DiagnosticReport CRUD service + client)
    └── document_reference →  DocumentReferenceContainer  (DocumentReference CRUD service + client)
"""

from dependency_injector import containers, providers

from app.di.core import CoreContainer
from app.di.modules import (
    AppointmentContainer,
    ConditionContainer,
    DiagnosticReportContainer,
    DocumentReferenceContainer,
    EncounterContainer,
    HealthcareServiceContainer,
    LocationContainer,
    MedicationRequestContainer,
    ObservationContainer,
    OrganizationContainer,
    PatientContainer,
    PractitionerContainer,
    PractitionerRoleContainer,
    ScheduleContainer,
    ServiceRequestContainer,
    SlotContainer,
)


class Container(containers.DeclarativeContainer):
    """
    Application-wide DI container. Instantiated once in app.main and attached to
    `app.container` so it survives for the full process lifetime.

    Sub-containers are declared as `providers.Container(...)` which creates a
    lazily-initialised child container. Passing `core=core` to each domain container
    wires the shared CoreContainer instance into the child so its providers
    (e.g. fhir_client) can be referenced via `core.fhir_client` inside the child.

    Container hierarchy:
        Container (root)
        ├── core         → CoreContainer          (shared infrastructure: FHIR HTTP client)
        ├── organization → OrganizationContainer  (Organisation CRUD service + client)
        └── location     → LocationContainer      (Location CRUD service + client)
    """

    # Scans all modules under the `app` package for @inject-decorated functions
    # and automatically resolves their Provide[Container.*] dependencies at startup.
    wiring_config = containers.WiringConfiguration(packages=["app"])

    # Shared infrastructure container — holds the singleton FHIR HTTP client.
    core = providers.Container(CoreContainer)

    # Domain container for Organisation resources.
    # Receives `core` so it can depend on the shared FHIR client without creating
    # a second instance (Singleton guarantees one client across the whole app).
    organization = providers.Container(
        OrganizationContainer,
        core=core,
    )

    # Domain container for Location resources.
    # Follows the same pattern as OrganizationContainer — shares the CoreContainer
    # FhirClient singleton so all resource types use the same connection pool.
    location = providers.Container(
        LocationContainer,
        core=core,
    )

    # Domain container for HealthcareService resources.
    healthcare_service = providers.Container(
        HealthcareServiceContainer,
        core=core,
    )

    # Domain container for Schedule resources.
    schedule = providers.Container(
        ScheduleContainer,
        core=core,
    )

    # Domain container for Slot resources.
    # Slots are bookable time windows that belong to a Schedule. Shares the
    # CoreContainer FhirClient singleton so all resource types use the same
    # connection pool.
    slot = providers.Container(
        SlotContainer,
        core=core,
    )

    # Domain container for Practitioner resources.
    # A Practitioner is a person directly or indirectly involved in healthcare.
    practitioner = providers.Container(
        PractitionerContainer,
        core=core,
    )

    # Domain container for PractitionerRole resources.
    # A PractitionerRole describes the role a Practitioner plays at an Organisation.
    practitioner_role = providers.Container(
        PractitionerRoleContainer,
        core=core,
    )

    # Domain container for Patient resources.
    # A Patient is a person receiving care or other health-related services.
    # Includes sub-resource clients for names, identifiers, telecom, addresses,
    # photos, contacts, communications, general practitioners, and links.
    patient = providers.Container(
        PatientContainer,
        core=core,
    )

    # Domain container for Appointment resources.
    # An Appointment is a booking of a healthcare event. All child arrays
    # (participant, slot, reason, etc.) are created in the POST body — the
    # fhir-server has no separate sub-resource routes for Appointment.
    appointment = providers.Container(
        AppointmentContainer,
        core=core,
    )

    # Domain container for Encounter resources.
    # An Encounter is a clinical interaction between a patient and one or more
    # providers. All child arrays (participant, diagnosis, location, reason, etc.)
    # are created in the POST body — the fhir-server has no separate sub-resource
    # routes for Encounter.
    encounter = providers.Container(
        EncounterContainer,
        core=core,
    )

    # Domain container for ServiceRequest resources.
    # A ServiceRequest captures a clinical order or referral for a service,
    # diagnostic test, or procedure. All child arrays are created in the POST body.
    service_request = providers.Container(
        ServiceRequestContainer,
        core=core,
    )

    # Domain container for MedicationRequest resources.
    # A MedicationRequest captures an order for medication including dosage
    # instructions, dispense request, and substitution rules.
    medication_request = providers.Container(
        MedicationRequestContainer,
        core=core,
    )

    # Domain container for Observation resources.
    # An Observation captures a measurement or clinical assertion about a patient,
    # including value[x] polymorphic values and optional component sub-observations.
    observation = providers.Container(
        ObservationContainer,
        core=core,
    )

    # Domain container for Condition resources.
    # A Condition captures a clinical problem, diagnosis, or health matter including
    # clinical/verification status, onset, abatement, stage, and evidence.
    condition = providers.Container(
        ConditionContainer,
        core=core,
    )

    # Domain container for DiagnosticReport resources.
    # A DiagnosticReport records the findings and interpretation of diagnostic tests
    # (labs, imaging, pathology). Links to a ServiceRequest via `based_on` and holds
    # the result document via `presented_form`.
    diagnostic_report = providers.Container(
        DiagnosticReportContainer,
        core=core,
    )

    # Domain container for DocumentReference resources.
    # A DocumentReference is a pointer to a document (PDF, image) stored in an
    # external system (e.g. FilNest). Linked to clinical resources via context.related.
    document_reference = providers.Container(
        DocumentReferenceContainer,
        core=core,
    )
