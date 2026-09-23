class DomainError(Exception):
    """Base exception for all domain logic failures."""
    pass


class ProfileNotFoundError(DomainError):
    def __init__(self, email: str = "", profile_id: str = "", iam_subject_id: str = ""):
        identifier = email or profile_id or iam_subject_id
        super().__init__(f"AppProfile identified by '{identifier}' was not found.")


class FamilyAccessError(DomainError):
    def __init__(self, message: str = "Access to this Family context is denied."):
        super().__init__(message)


class ConsentDeniedError(DomainError):
    def __init__(self, scope: str):
        super().__init__(f"Access denied: consent for scope '{scope}' is not granted.")


class DuplicateMembershipError(DomainError):
    def __init__(self, message: str = "User is already a member of this Family group."):
        super().__init__(message)
