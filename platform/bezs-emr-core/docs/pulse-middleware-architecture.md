# Pulse — Healthcare Middleware Platform

**Role in stack:** Sits between every client application and the FHIR Server. Owns all business rules, use-case validation, workflow orchestration, auth/RBAC, and API exposure (REST + OpenAPI). The FHIR Server is a pure data store — Pulse is where the product lives.

> **Rename this file** when you decide on a final product name. Replace every occurrence of "Pulse" accordingly.
>
> **Roadmap note:** REST API + OpenAPI is the current target. GraphQL can be layered on top of the same NestJS services later without restructuring — resolvers call the same service methods controllers do.

---

## Table of Contents

1. [Two-Layer Architecture](#1-two-layer-architecture)
2. [Core Responsibilities](#2-core-responsibilities)
3. [Use-Case Validation — Enforcing Required Fields on Optional FHIR](#3-use-case-validation--enforcing-required-fields-on-optional-fhir)
4. [Resource Resolution & Existence Checks](#4-resource-resolution--existence-checks)
5. [Business Logic & Workflow Orchestration](#5-business-logic--workflow-orchestration)
6. [Auth, RBAC, and Multi-Tenancy](#6-auth-rbac-and-multi-tenancy)
7. [API Surface — REST + OpenAPI](#7-api-surface--rest--openapi)
8. [OpenAPI → MCP Server](#8-openapi--mcp-server)
9. [Recommended Tech Stack](#9-recommended-tech-stack)
10. [NestJS Project Structure](#10-nestjs-project-structure)
11. [DTO Pattern — class-validator](#11-dto-pattern--class-validator)
12. [FHIR Server Integration](#12-fhir-server-integration)
13. [Notifications & Event System](#13-notifications--event-system)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Environment Variables](#15-environment-variables)

---

## 1. Two-Layer Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│          Web App  ·  Mobile App  ·  AI Agent (via MCP)  ·  EMR      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS — REST (JWT Bearer)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     PULSE  (Middleware Layer)                        │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Use-Case       │  │  Resource        │  │  Business Logic  │   │
│  │  Validation     │  │  Resolution &    │  │  & Workflow      │   │
│  │  (DTO classes)  │  │  Existence Checks│  │  Engine          │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Auth Service   │  │  Notification    │  │  Cron / Job      │   │
│  │  (JWT + RBAC)   │  │  Service         │  │  Scheduler       │   │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │           FHIR HTTP Client (typed axios wrapper)             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTP — plain JSON (no auth)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      FHIR Server  (Data Layer)                       │
│   Pure CRUD — 34 FHIR R4 resources — no auth — no business rules    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ SQL
                      PostgreSQL + Redis
```

**Key contract:**
- Pulse **never** writes directly to the database — all persistence goes through the FHIR Server REST API
- The FHIR Server **never** validates business rules — it persists whatever valid payload it receives
- Pulse stamps `user_id`, `org_id`, `created_by`, `updated_by` on every FHIR write from the validated JWT claims — callers never supply these

---

## 2. Core Responsibilities

| Responsibility | Owner | Description |
|---|---|---|
| JWT validation & issuance | Pulse | Validates tokens, attaches claims to request context |
| RBAC permission enforcement | Pulse | Role + resource + action checks before any FHIR call |
| Use-case field validation | Pulse | Makes FHIR optional fields required for your product scenarios |
| Resource existence & dedup | Pulse | Checks before writes — "patient already exists for this user?" |
| Referential integrity | Pulse | "Does this encounter belong to this patient?" before linking |
| Business rules | Pulse | Drug-allergy checks, appointment conflict detection, etc. |
| Workflow state machines | Pulse | Appointment lifecycle, lab order lifecycle, etc. via FHIR Task |
| Notifications | Pulse | Push / email / SMS triggered by workflow events |
| Scheduled jobs | Pulse | Appointment reminders, data archival, report generation |
| REST API (OpenAPI → MCP) | Pulse | Use-case endpoints with full OpenAPI spec |
| FHIR data persistence | FHIR Server | Stores and returns FHIR R4 resources |

---

## 3. Use-Case Validation — Enforcing Required Fields on Optional FHIR

The FHIR Server accepts almost everything as optional because the FHIR spec itself is loose. Pulse enforces the subset your product actually requires for each specific use case.

### 3.1 The Problem

```json
// FHIR Server accepts this (FHIR spec allows it)
POST /api/fhir/v1/patients
{ "active": true }
// ↑ no name, no DOB, no contact — valid FHIR, useless for your product
```

### 3.2 The Solution — Use-Case DTOs with class-validator

NestJS uses decorated classes as DTOs. `ValidationPipe` runs `class-validator` on every incoming request body automatically. `@nestjs/swagger` reads the same decorators to generate the OpenAPI spec — no duplication.

```typescript
// src/patients/dto/register-patient.dto.ts
import { IsString, IsEnum, IsEmail, IsOptional, IsDateString, ValidateIf } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RegisterPatientDto {
  @ApiProperty({ example: 'Johnson' })
  @IsString()
  family_name: string

  @ApiProperty({ example: 'Marcus' })
  @IsString()
  given_name: string

  @ApiProperty({ example: '1985-07-22' })
  @IsDateString()
  birth_date: string

  @ApiProperty({ enum: ['male', 'female', 'other', 'unknown'] })
  @IsEnum(['male', 'female', 'other', 'unknown'])
  gender: string

  @ApiPropertyOptional({ example: '555-200-4000' })
  @IsString()
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ example: 'marcus@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string
}
```

```typescript
// src/appointments/dto/book-appointment.dto.ts
import { IsInt, IsPositive, IsString, IsDateString, IsOptional, IsUrl } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class BookAppointmentDto {
  @ApiProperty()
  @IsInt() @IsPositive()
  patient_id: number

  @ApiProperty()
  @IsInt() @IsPositive()
  practitioner_id: number

  @ApiProperty()
  @IsInt() @IsPositive()
  slot_id: number

  @ApiProperty({ example: '11429006' })
  @IsString()
  service_type_code: string

  @ApiProperty({ example: 'http://snomed.info/sct' })
  @IsUrl()
  service_type_system: string

  @ApiProperty({ example: '2026-06-10T09:00:00Z' })
  @IsDateString()
  start: string

  @ApiProperty({ example: '2026-06-10T09:30:00Z' })
  @IsDateString()
  end: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string
}
```

### 3.3 Multiple DTOs per FHIR Resource

One FHIR resource can have many Pulse use-case DTOs depending on the action:

| FHIR Resource | Pulse DTO | Extra Validation |
|---|---|---|
| `Patient` | `RegisterPatientDto` | name + DOB required; `@ValidateIf` phone or email |
| `Patient` | `UpdatePatientDemographicsDto` | all fields optional, min 1 required |
| `Appointment` | `BookAppointmentDto` | slot free check, no double-booking |
| `Appointment` | `RequestReferralDto` | referral-specific intent fields |
| `MedicationRequest` | `PrescribeMedicationDto` | triggers drug-allergy rule |
| `Observation` | `RecordVitalsDto` | unit + reasonable range validation |
| `ServiceRequest` | `OrderLabTestDto` | duplicate order detection |
| `Condition` | `DiagnosePatientDto` | must link to an open encounter |

### 3.4 Custom Class-Level Validator

For cross-field rules (e.g., `end` after `start`), use a custom validator decorator:

```typescript
// src/common/validators/end-after-start.validator.ts
import { registerDecorator, ValidationArguments } from 'class-validator'

export function EndAfterStart(startField: string) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'endAfterStart',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} must be after ${startField}` },
      validator: {
        validate(value: string, args: ValidationArguments) {
          const start = (args.object as any)[startField]
          return start && value && new Date(value) > new Date(start)
        },
      },
    })
  }
}

// Usage in DTO:
@EndAfterStart('start')
end: string
```

---

## 4. Resource Resolution & Existence Checks

Before any write, Pulse resolves referenced resources and enforces ownership and business-state rules.

### 4.1 Pattern

```typescript
// src/patients/patients.service.ts
async register(dto: RegisterPatientDto, actor: AuthUser): Promise<PatientResponse> {

  // 1. Deduplication — same name + DOB already registered in this org?
  const existing = await this.fhirClient.patients.list({
    org_id: actor.orgId,
  })
  const duplicate = existing.data.find(p =>
    p.family_name === dto.family_name &&
    p.given_name  === dto.given_name  &&
    p.birth_date  === dto.birth_date
  )
  if (duplicate) {
    throw new ConflictException(`Patient already registered (patient_id: ${duplicate.id})`)
  }

  // 2. Create in FHIR Server — stamp tenant + audit fields from JWT
  return this.fhirClient.patients.create({
    ...dto,
    user_id:    actor.sub,
    org_id:     actor.orgId,
    created_by: actor.sub,
  })
}
```

### 4.2 Common Existence Check Patterns

| Check | When | Response on Failure |
|---|---|---|
| Patient exists in org | Before booking | 404 `patient not found in this organization` |
| Patient belongs to caller | On read / update | 403 `access denied` |
| Slot is still free | Before booking | 409 `slot already booked` |
| Practitioner not double-booked | Before booking | 409 `practitioner double-booked at this time` |
| Encounter is open | Before adding clinical data | 422 `cannot add to a finished encounter` |
| Medication not contraindicated | Before MedicationRequest | 422 `patient has documented allergy to this drug class` |
| No duplicate lab order | Before ServiceRequest | 409 `same test already ordered within 24 hours` |
| Coverage active | Before Claim | 422 `coverage expired or inactive` |
| Cross-resource same org | Before any reference link | 422 `referenced resource not in your organization` |

### 4.3 Resolver Helper Pattern

```typescript
// src/common/resolvers/encounter.resolver.ts
@Injectable()
export class EncounterResolver {
  constructor(private fhirClient: FhirClientService) {}

  async resolve(encounterId: number, actor: AuthUser) {
    const encounter = await this.fhirClient.encounters.getById(encounterId)

    if (!encounter) {
      throw new NotFoundException(`Encounter ${encounterId} not found`)
    }
    if (encounter.org_id !== actor.orgId) {
      throw new ForbiddenException('Access denied')
    }
    return encounter
  }

  async resolveOpen(encounterId: number, actor: AuthUser) {
    const encounter = await this.resolve(encounterId, actor)
    if (encounter.status === 'finished' || encounter.status === 'cancelled') {
      throw new UnprocessableEntityException('Cannot modify a closed encounter')
    }
    return encounter
  }
}
```

---

## 5. Business Logic & Workflow Orchestration

### 5.1 Business Rules

Rules are injectable services in `src/rules/`. Called by the relevant service before writing to FHIR.

```typescript
// src/rules/drug-allergy-check.rule.ts
@Injectable()
export class DrugAllergyCheckRule {
  constructor(private fhirClient: FhirClientService) {}

  async check(patientId: number, rxcui: string, orgId: string): Promise<void> {
    const allergies = await this.fhirClient.allergyIntolerances.list({
      patient_id: patientId,
      org_id: orgId,
      clinical_status: 'active',
    })

    for (const allergy of allergies.data) {
      if (this.isContraindicated(allergy.code, rxcui)) {
        throw new UnprocessableEntityException(
          `Drug-allergy conflict: patient is allergic to ${allergy.code_display}`
        )
      }
    }
  }

  private isContraindicated(allergyCode: string, rxcui: string): boolean {
    // RxNorm drug-class lookup logic
    return false // placeholder
  }
}
```

### 5.2 Workflow State Machines

Workflows use FHIR Task as the state carrier. Pulse defines allowed transitions and executes side effects on each.

**Appointment Lifecycle:**

```
proposed → pending → booked → checked-in → fulfilled
                        ↓
                    cancelled / noshow
```

```typescript
// src/workflows/appointment.workflow.ts
@Injectable()
export class AppointmentWorkflow {

  private readonly transitions: Record<string, string[]> = {
    proposed:     ['pending', 'cancelled'],
    pending:      ['booked', 'cancelled'],
    booked:       ['checked-in', 'cancelled', 'noshow'],
    'checked-in': ['fulfilled'],
    fulfilled:    [],
    cancelled:    [],
    noshow:       [],
  }

  async transition(
    appointmentId: number,
    toStatus: string,
    actor: AuthUser,
  ): Promise<void> {
    const appt = await this.encounterResolver.resolve(appointmentId, actor)

    if (!this.transitions[appt.status]?.includes(toStatus)) {
      throw new UnprocessableEntityException(
        `Cannot transition appointment from '${appt.status}' to '${toStatus}'`
      )
    }

    await this.executeSideEffects(appt, toStatus, actor)

    await this.fhirClient.appointments.patch(appointmentId, {
      status: toStatus,
      updated_by: actor.sub,
    })
  }

  private async executeSideEffects(appt: any, toStatus: string, actor: AuthUser) {
    switch (toStatus) {
      case 'booked':
        await this.fhirClient.slots.patch(appt.slot_id, { status: 'busy', updated_by: actor.sub })
        await this.notificationsService.send('appointment.booked', appt, actor)
        break

      case 'checked-in':
        await this.encountersService.openFromAppointment(appt, actor)
        break

      case 'fulfilled':
        await this.fhirClient.slots.patch(appt.slot_id, { status: 'finished', updated_by: actor.sub })
        await this.tasksService.createFollowUpIfNeeded(appt, actor)
        break

      case 'cancelled':
        await this.fhirClient.slots.patch(appt.slot_id, { status: 'free', updated_by: actor.sub })
        await this.notificationsService.send('appointment.cancelled', appt, actor)
        break
    }
  }
}
```

### 5.3 Implemented Workflows

| Workflow | States | Key Side Effects |
|---|---|---|
| Appointment lifecycle | proposed → booked → checked-in → fulfilled | slot sync, auto-open Encounter, notifications |
| Lab order lifecycle | draft → active → completed → final | specimen tracking, DiagnosticReport creation |
| Referral management | draft → active → accepted → scheduled → completed | Task creation, notifications |
| Prescription lifecycle | draft → active → completed / stopped | coverage check, drug-allergy check |
| Encounter lifecycle | planned → in-progress → finished | AuditEvent generation, care plan trigger |
| Claim lifecycle | draft → active → adjudicated | ClaimResponse processing, Invoice generation |

---

## 6. Auth, RBAC, and Multi-Tenancy

### 6.1 JWT Flow

Pulse is the **only** layer that validates JWTs. The FHIR Server receives no tokens — Pulse stamps tenant and audit fields from the validated claims on every write.

```
Client ──[Bearer JWT]──► Pulse (validates, extracts claims) ──[plain HTTP]──► FHIR Server
```

### 6.2 RBAC Guard

```typescript
// src/auth/rbac.guard.ts
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string>('permission', context.getHandler())
    if (!required) return true

    const request = context.switchToHttp().getRequest()
    const user: AuthUser = request.user

    if (!this.authService.hasPermission(user, required)) {
      throw new ForbiddenException(`Permission required: ${required}`)
    }
    return true
  }
}

// Decorator shorthand
export const RequirePermission = (permission: string) =>
  SetMetadata('permission', permission)

// Usage on controller method:
@RequirePermission('appointment:create')
@Post('book')
async book(@Body() dto: BookAppointmentDto, @CurrentUser() actor: AuthUser) { ... }
```

### 6.3 Role Permissions

```typescript
type Role = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient'

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin:        ['*:*'],
  doctor:       ['patient:read', 'patient:write', 'encounter:*', 'condition:*', 'prescription:*'],
  nurse:        ['patient:read', 'vitals:write', 'observation:write', 'specimen:write'],
  receptionist: ['patient:read', 'patient:write', 'appointment:*', 'coverage:read'],
  patient:      ['own:read'],
}
```

### 6.4 Multi-Tenancy — org_id Always from JWT

```typescript
// Every service method overwrites org_id from JWT — never from caller payload
async listPatients(filters: ListPatientsDto, actor: AuthUser) {
  return this.fhirClient.patients.list({
    ...filters,
    org_id: actor.orgId,  // always forced from JWT
  })
}
```

---

## 7. API Surface — REST + OpenAPI

Each Pulse endpoint is a **use-case action**, not raw FHIR CRUD. The controller is thin — it validates the DTO, calls the service, returns the response. All business logic lives in the service layer.

### 7.1 Endpoint Design

| Method | Pulse Endpoint | What It Does | FHIR Resources Touched |
|---|---|---|---|
| `POST` | `/patients/register` | Dedup check + create | `Patient` |
| `GET` | `/patients/:id` | Ownership check + read | `Patient` |
| `GET` | `/patients/:id/summary` | Patient + active conditions + allergies | `Patient`, `Condition`, `AllergyIntolerance` |
| `POST` | `/appointments/book` | Slot-free check + create + notification | `Appointment`, `Slot` |
| `PATCH` | `/appointments/:id/transition` | Workflow state machine | `Appointment`, `Slot`, `Encounter` |
| `POST` | `/encounters/:id/diagnose` | Encounter-open check + create condition | `Condition` |
| `POST` | `/encounters/:id/prescribe` | Drug-allergy check + create | `MedicationRequest` |
| `POST` | `/encounters/:id/order-lab` | Duplicate detection + create | `ServiceRequest` |
| `POST` | `/encounters/:id/vitals` | Range validation + create | `Vitals` |
| `PATCH` | `/encounters/:id/close` | Transition + AuditEvent | `Encounter`, `AuditEvent` |
| `POST` | `/billing/submit-claim` | Coverage check + create | `Claim`, `Coverage` |

### 7.2 Controller Pattern

```typescript
// src/appointments/appointments.controller.ts
@Controller('appointments')
@ApiTags('Appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('book')
  @RequirePermission('appointment:create')
  @ApiOperation({
    operationId: 'book_appointment',
    summary: 'Book an appointment',
    description:
      'Books a slot for a patient. Validates slot availability, checks for practitioner ' +
      'double-booking, and sends a booking confirmation notification.',
  })
  @ApiResponse({ status: 201, description: 'Appointment booked', type: AppointmentResponse })
  @ApiResponse({ status: 409, description: 'Slot taken or practitioner double-booked' })
  @ApiResponse({ status: 422, description: 'Validation error' })
  async book(
    @Body() dto: BookAppointmentDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.book(dto, actor)
  }

  @Patch(':id/transition')
  @RequirePermission('appointment:update')
  @ApiOperation({
    operationId: 'transition_appointment',
    summary: 'Transition appointment status',
    description: 'Moves an appointment through its lifecycle. Allowed transitions: ' +
      'proposed→pending, pending→booked, booked→checked-in, booked→cancelled, ' +
      'checked-in→fulfilled. Each transition executes side effects (slot sync, notifications).',
  })
  async transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionAppointmentDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<void> {
    return this.appointmentWorkflow.transition(id, dto.status, actor)
  }
}
```

---

## 8. OpenAPI → MCP Server

The OpenAPI spec auto-generated by NestJS at `/api-json` is consumed by a FastMCP server that exposes every Pulse endpoint as an AI tool.

```
NestJS (@nestjs/swagger)
    │ GET /api-json
    ▼
OpenAPI JSON spec
    │
    ▼
FastMCP server
    │ exposes each endpoint as a tool
    ▼
AI Agents (Claude, GPT-4, etc.)
```

### 8.1 Why OpenAPI Quality Matters for MCP

The AI agent uses `operationId`, `summary`, `description`, and parameter descriptions to understand when and how to call each tool. Poor descriptions = wrong tool calls.

Rules for every Pulse controller method:
- `operationId` — unique, snake_case, describes the action (`book_appointment`, not `create`)
- `summary` — one sentence, what it does
- `description` — when to use it, what preconditions it checks, what side effects it has
- `@ApiProperty` on every DTO field — include `example`, `description`, `enum` values
- `@ApiResponse` for 2xx and every expected 4xx — MCP uses these to interpret errors

### 8.2 MCP Server

```python
# apps/mcp/server.py  (separate small Python service)
from fastmcp import FastMCP

mcp = FastMCP.from_openapi(
    openapi_url="http://pulse-api:3001/api-json",
    base_url="http://pulse-api:3001",
    name="Pulse Healthcare API",
)

if __name__ == "__main__":
    mcp.run()
```

### 8.3 Bootstrap OpenAPI in main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global validation pipe — runs class-validator on every DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))

  // OpenAPI spec
  const config = new DocumentBuilder()
    .setTitle('Pulse API')
    .setDescription('Healthcare middleware — business logic layer above the FHIR Server')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  // Raw JSON spec endpoint — consumed by MCP server
  app.getHttpAdapter().get('/api-json', (_req, res) => res.json(document))

  await app.listen(3001)
}
bootstrap()
```

---

## 9. Recommended Tech Stack

| Concern | Choice | Why |
|---|---|---|
| **Framework** | NestJS | TypeScript-native, built-in DI, guards, pipes, interceptors, OpenAPI |
| **Validation** | `class-validator` + `class-transformer` | NestJS native DTO pattern, auto-wired by `ValidationPipe` |
| **OpenAPI** | `@nestjs/swagger` | Auto-generates spec from DTO and controller decorators |
| **Auth** | `@nestjs/jwt` + `@nestjs/passport` | Standard JWT guard, extensible |
| **HTTP client** | `@nestjs/axios` | Axios wrapper, injectable, testable — calls the FHIR Server |
| **Job scheduler** | `@nestjs/schedule` | Built-in cron for reminders and background jobs |
| **Queue** | BullMQ + Redis | Background jobs (notification delivery, report generation) |
| **Notifications** | `nodemailer` + `firebase-admin` + `twilio` | Email + push + SMS |
| **Config** | `@nestjs/config` | `.env` via ConfigService, typed |
| **Testing** | Jest + Supertest | NestJS default, fast unit + e2e |
| **Runtime** | Node.js 20 LTS | LTS stability |
| **Package manager** | pnpm | Fast, disk-efficient |

### 9.1 Future GraphQL Addition

When GraphQL is needed, add `@nestjs/graphql` + Apollo Server. No restructuring required — the same service classes (`AppointmentsService`, `PatientsService`, etc.) are injected into resolvers exactly as they are into controllers. The DTOs change to `InputType` classes but the validation pattern is identical.

---

## 10. NestJS Project Structure

```
pulse-api/
├── src/
│   ├── main.ts                         # Bootstrap, Swagger, ValidationPipe
│   ├── app.module.ts                   # Root module
│   │
│   ├── auth/                           # JWT auth + RBAC
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts             # Token issuance, permission check
│   │   ├── jwt.strategy.ts             # Validates Bearer token → AuthUser
│   │   ├── jwt-auth.guard.ts
│   │   ├── rbac.guard.ts
│   │   └── decorators/
│   │       ├── current-user.decorator.ts
│   │       └── require-permission.decorator.ts
│   │
│   ├── fhir-client/                    # Typed HTTP client for FHIR Server
│   │   ├── fhir-client.module.ts
│   │   ├── fhir-client.service.ts      # Base axios instance, auto-stamps org_id/user_id
│   │   ├── patients.client.ts
│   │   ├── appointments.client.ts
│   │   ├── encounters.client.ts
│   │   └── ...                         # One client class per FHIR resource
│   │
│   ├── patients/
│   │   ├── patients.module.ts
│   │   ├── patients.controller.ts
│   │   ├── patients.service.ts
│   │   └── dto/
│   │       ├── register-patient.dto.ts
│   │       ├── update-patient.dto.ts
│   │       └── list-patients.dto.ts
│   │
│   ├── appointments/
│   │   ├── appointments.module.ts
│   │   ├── appointments.controller.ts
│   │   ├── appointments.service.ts
│   │   ├── appointment.workflow.ts     # State machine
│   │   └── dto/
│   │       ├── book-appointment.dto.ts
│   │       ├── transition-appointment.dto.ts
│   │       └── list-appointments.dto.ts
│   │
│   ├── encounters/
│   │   ├── encounters.module.ts
│   │   ├── encounters.controller.ts
│   │   ├── encounters.service.ts
│   │   └── dto/
│   │       ├── open-encounter.dto.ts
│   │       ├── close-encounter.dto.ts
│   │       ├── diagnose.dto.ts
│   │       ├── prescribe.dto.ts
│   │       ├── order-lab.dto.ts
│   │       └── record-vitals.dto.ts
│   │
│   ├── billing/
│   │   ├── billing.module.ts
│   │   ├── billing.controller.ts
│   │   ├── billing.service.ts
│   │   └── dto/
│   │       ├── submit-claim.dto.ts
│   │       └── record-payment.dto.ts
│   │
│   ├── rules/                          # Injectable business rule services
│   │   ├── rules.module.ts
│   │   ├── drug-allergy-check.rule.ts
│   │   ├── duplicate-order.rule.ts
│   │   ├── appointment-conflict.rule.ts
│   │   ├── coverage-active.rule.ts
│   │   └── encounter-open.rule.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts
│   │   ├── email.provider.ts
│   │   ├── push.provider.ts            # firebase-admin
│   │   └── sms.provider.ts             # Twilio
│   │
│   ├── scheduler/
│   │   ├── scheduler.module.ts
│   │   ├── appointment-reminders.job.ts
│   │   ├── claim-submission.job.ts
│   │   └── data-archival.job.ts
│   │
│   └── common/
│       ├── resolvers/                  # Resource resolver helpers (404/403 logic)
│       │   ├── patient.resolver.ts
│       │   ├── encounter.resolver.ts
│       │   └── appointment.resolver.ts
│       ├── filters/
│       │   └── http-exception.filter.ts
│       ├── interceptors/
│       │   └── request-id.interceptor.ts
│       └── types/
│           ├── auth-user.type.ts
│           └── paginated.type.ts
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## 11. DTO Pattern — class-validator

### 11.1 Standard DTO Template

```typescript
// Every DTO follows this pattern
import { IsString, IsInt, IsPositive, IsOptional, IsEnum, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class SomeResourceDto {
  // Required field
  @ApiProperty({ description: 'Human-readable label', example: 'value' })
  @IsString()
  some_field: string

  // Required number (query param needs @Type for string → number coercion)
  @ApiProperty({ example: 10001 })
  @IsInt() @IsPositive()
  @Type(() => Number)
  patient_id: number

  // Optional field
  @ApiPropertyOptional({ example: 'optional value' })
  @IsString()
  @IsOptional()
  optional_field?: string

  // Enum field
  @ApiProperty({ enum: ['active', 'inactive'], example: 'active' })
  @IsEnum(['active', 'inactive'])
  status: string
}
```

### 11.2 Partial DTO for PATCH (avoid repeating decorators)

```typescript
// NestJS has PartialType built in — all fields become optional, decorators preserved
import { PartialType, OmitType } from '@nestjs/swagger'
import { RegisterPatientDto } from './register-patient.dto'

// All fields optional, patient_id excluded (immutable)
export class UpdatePatientDto extends PartialType(
  OmitType(RegisterPatientDto, ['patient_id'] as const)
) {}
```

### 11.3 Query Params DTO for list endpoints

```typescript
import { IsOptional, IsInt, IsPositive, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class ListPatientsDto {
  @ApiPropertyOptional({ default: 50 })
  @IsInt() @IsPositive() @Max(200)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50

  @ApiPropertyOptional({ default: 0 })
  @IsInt() @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  family_name?: string
}
```

---

## 12. FHIR Server Integration

### 12.1 FhirClientService — Base Class

```typescript
// src/fhir-client/fhir-client.service.ts
@Injectable()
export class FhirClientService {
  private readonly http: AxiosInstance

  constructor(private config: ConfigService) {
    this.http = axios.create({
      baseURL: config.get<string>('FHIR_SERVER_URL'),
      headers: { 'Content-Type': 'application/json' },
      timeout: 10_000,
    })
  }

  async post<T>(path: string, data: object, actor: AuthUser): Promise<T> {
    const body = { ...data, org_id: actor.orgId, user_id: actor.sub, created_by: actor.sub }
    const res = await this.http.post<T>(path, body)
    return res.data
  }

  async patch<T>(path: string, data: object, actor: AuthUser): Promise<T> {
    const body = { ...data, updated_by: actor.sub }
    const res = await this.http.patch<T>(path, body)
    return res.data
  }

  async get<T>(path: string, params?: object): Promise<T> {
    const res = await this.http.get<T>(path, { params })
    return res.data
  }

  async delete(path: string): Promise<void> {
    await this.http.delete(path)
  }
}
```

### 12.2 Resource-Specific Client

```typescript
// src/fhir-client/patients.client.ts
@Injectable()
export class PatientsClient {
  constructor(private fhir: FhirClientService) {}

  create(data: object, actor: AuthUser) {
    return this.fhir.post('/patients', data, actor)
  }

  list(params: object) {
    return this.fhir.get<{ total: number; data: any[] }>('/patients', params)
  }

  getById(id: number) {
    return this.fhir.get(`/patients/${id}`)
  }

  patch(id: number, data: object, actor: AuthUser) {
    return this.fhir.patch(`/patients/${id}`, data, actor)
  }

  delete(id: number) {
    return this.fhir.delete(`/patients/${id}`)
  }
}
```

---

## 13. Notifications & Event System

### 13.1 Workflow Event → Notification Mapping

| Event | Channel | Recipient |
|---|---|---|
| `appointment.booked` | Push + Email | Patient |
| `appointment.reminder_24h` | Push + SMS | Patient |
| `appointment.reminder_1h` | Push + SMS | Patient |
| `appointment.cancelled` | Push + Email | Patient |
| `appointment.checked-in` | In-app | Practitioner |
| `lab_result.available` | Push + Email | Patient + Practitioner |
| `lab_result.critical` | Push + SMS + Email | Practitioner (urgent) |
| `prescription.issued` | Push | Patient |
| `task.assigned` | Push + In-app | Assignee |
| `task.overdue` | Email | Assignee + Manager |
| `claim.denied` | Email | Billing team |

### 13.2 Notification Service

```typescript
// src/notifications/notifications.service.ts
@Injectable()
export class NotificationsService {

  async send(event: string, context: object, actor: AuthUser): Promise<void> {
    const template = this.getTemplate(event)
    const rendered = this.render(template, context)
    const targets  = await this.resolveTargets(event, context, actor)

    await Promise.allSettled([
      targets.push  && this.pushProvider.send(targets.push,  rendered),
      targets.email && this.emailProvider.send(targets.email, rendered),
      targets.sms   && this.smsProvider.send(targets.sms,    rendered),
    ])
  }
}
```

### 13.3 Scheduled Jobs

```typescript
// src/scheduler/appointment-reminders.job.ts
@Injectable()
export class AppointmentRemindersJob {

  @Cron('0 8 * * *')   // daily at 08:00
  async sendTomorrowReminders(): Promise<void> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointments = await this.fhirClient.appointments.list({
      date: tomorrow.toISOString().split('T')[0],
      status: 'booked',
    })

    for (const appt of appointments.data) {
      await this.notificationsService.send('appointment.reminder_24h', appt, SYSTEM_ACTOR)
    }
  }
}
```

---

## 14. Deployment Architecture

```
            nginx / reverse proxy  (TLS termination)
                       │
           ┌───────────┴──────────┐
           │                      │
       Pulse API              MCP Server
       (NestJS)               (FastMCP)
       port 3001               port 8080
           │
           │ HTTP (internal, no TLS)
           ▼
       FHIR Server
        (FastAPI)
        port 8000
           │
    ┌──────┴──────┐
 PostgreSQL     Redis
  port 5432    port 6379
```

### 14.1 Docker Compose

```yaml
services:
  pulse-api:
    build: .
    environment:
      FHIR_SERVER_URL: http://fhir-server:8000/api/fhir/v1
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_ISSUER: ${JWT_ISSUER}
    depends_on: [fhir-server, redis]
    ports: ["3001:3001"]

  mcp-server:
    build: ./mcp
    environment:
      PULSE_API_URL: http://pulse-api:3001
    depends_on: [pulse-api]
    ports: ["8080:8080"]

  fhir-server:
    image: ghcr.io/naveenraj-g/fhir-server-v1:latest
    environment:
      FHIR_DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/fhir
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]
    ports: ["8000:8000"]

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fhir
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## 15. Environment Variables

```bash
# .env

# FHIR Server — internal, no auth required
FHIR_SERVER_URL=http://fhir-server:8000/api/fhir/v1

# JWT — Pulse issues and validates tokens
JWT_SECRET=your-secret-at-least-32-chars
JWT_ISSUER=https://your-domain.com
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis — BullMQ queues + rate limiting
REDIS_URL=redis://localhost:6379

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-key
SMTP_FROM=noreply@your-domain.com

# Push notifications (Firebase)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+15550000000

# App
PORT=3001
NODE_ENV=production
```

---

## Summary — Pulse vs. FHIR Server

| Concern | Pulse (Middleware) | FHIR Server (Data Layer) |
|---|---|---|
| JWT validation | ✅ validates + issues | ❌ no auth |
| RBAC enforcement | ✅ role + resource + action | ❌ none |
| Required field enforcement | ✅ class-validator DTO per use case | ❌ FHIR fields are optional |
| Resource existence checks | ✅ dedup, ownership, referential integrity | ❌ none |
| Business rules | ✅ drug-allergy, conflict, duplicate order | ❌ none |
| Workflow state machines | ✅ Task-based lifecycles | ❌ none |
| Notifications | ✅ push / email / SMS | ❌ none |
| Scheduled jobs | ✅ reminders, reports, archival | ❌ none |
| REST API (OpenAPI → MCP) | ✅ use-case endpoints | ✅ CRUD endpoints (internal only) |
| GraphQL API | future addition | ❌ none |
| Data persistence | ❌ never touches DB directly | ✅ all FHIR resource CRUD |
