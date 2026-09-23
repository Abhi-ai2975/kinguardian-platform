from pydantic import ValidationError
from app.errors.validation import InputValidationError


def validate_model(model_class, data):
    try:
        return model_class(**data)
    except ValidationError as e:
        formatted_errors = [
            {
                "field": ".".join(map(str, err["loc"])),
                "message": err["msg"],
                "type": err["type"],
            }
            for err in e.errors()
        ]

        raise InputValidationError(formatted_errors) from e
