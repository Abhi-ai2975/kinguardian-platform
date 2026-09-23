# Error Taxonomy

This document defines **how errors are classified, created, and propagated**
throughout the system.

The goal is to:

- Avoid leaking implementation details
- Maintain clean architectural boundaries
- Provide meaningful feedback to users
- Preserve rich debugging information internally

---

## 🧠 Core Principle

> **Errors are about responsibility, not just failure.**

Different errors exist to answer different questions:

- Who caused this?
- Where did it originate?
- Can the user fix it?
- Should the system alert?

---

## 🧱 Base Error

### `ApplicationError`

The root error type for the application.

Used for:

- All controlled failures
- All errors crossing architectural boundaries

Properties:

- `message` → user-safe description
- `code` → internal classification
- `statusCode` → semantic intent
- `isOperational` → logging & alerting signal
- `cause` → original error (never exposed)

---

## 🔐 Authentication Errors

### `AuthError`

Represents **auth-domain failures** that are:

- User-actionable
- Expected in normal operation

Examples:

- Invalid credentials
- Email already exists
- Email not verified
- Password policy violations

These errors:

- May be shown to users
- Should have meaningful messages
- Must not include provider details

---

## 🏗 Infrastructure Errors

### `InfrastructureError`

Represents failures in:

- External services
- Network
- SDKs (BetterAuth)
- Databases
- System dependencies

Characteristics:

- User cannot fix them
- Expected in production
- Must be logged
- Must be sanitized at the boundary

Examples:

- Auth provider outage
- Network timeout
- Unexpected SDK response

Infrastructure errors **never reach the UI directly**.

---

## 🔄 Error Translation (Anti-Corruption Layer)

Third-party errors (e.g. BetterAuth) are translated using a mapper:

```ts
mapBetterAuthError(error, contextMessage);
```
