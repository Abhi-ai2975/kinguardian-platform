from fastapi import HTTPException, status, Request
from jwt.jwks_client import PyJWKClient
import jwt
from config.config import Config

config = Config()

jwks_client = PyJWKClient(config.iam_jwks_url)


def decode_token(token: str):
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        return jwt.decode(
            token,
            signing_key.key,
            audience=config.iam_issuer,
            issuer=config.iam_issuer,
            algorithms=["EdDSA", "RS256"],  # EdDSA first since that's what your JWKS uses
            options={"verify_aud": True},
        )
    except Exception as e:
        print(f"JWT ERROR: {str(e)}")
        raise

async def get_current_user(request: Request):

    auth_header = request.headers.get("Authorization")
    
    # print("AUTH HEADER:", auth_header)
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )

    token = auth_header.split(" ")[1]
    # print("TOKEN:", token)

    try:
        payload = decode_token(token)

        # print("USER PAYLOAD:", payload)
        # Set user state if not already set by middleware
        if not hasattr(request.state, 'user'):
            request.state.user = payload
        if not hasattr(request.state, 'token'):
            request.state.token = token

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# Permission
#   Resource = Patient
#   action = read
async def check_permission(user: dict, resource: str, action: str):
    permissions = user.get("permissions", [])

    if f"{resource}:{action}" not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied",
        )


def require_permission(resource: str, action: str):
    async def dependency(request: Request):
        user = getattr(request.state, 'user', None)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        await check_permission(user, resource, action)

    dependency.required_permission = f"{resource}:{action}"
    return dependency
