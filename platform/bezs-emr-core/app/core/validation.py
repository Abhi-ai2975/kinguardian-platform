from pydantic import ValidationError
from app.errors.validation import InputValidationError


def validate_model(model_class, data):
    try:
        return model_class.model_validate(data)
    except ValidationError as e:
        raise InputValidationError(
            errors=[
                {
                    "field": ".".join(str(loc) for loc in err["loc"]),
                    "message": err["msg"],
                }
                for err in e.errors()
            ]
        )
