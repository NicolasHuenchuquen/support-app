from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token


# APIRouter agrupa endpoints bajo un prefijo común.
router = APIRouter(prefix="/login", tags=["Login"])

@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Endpoint para autenticar un usuario y generar un token JWT.
    
    FastAPI usa OAuth2PasswordRequestForm. Este formulario espera recibir
    los datos como 'Form Data' (no JSON) con dos campos obligatorios:
    - username (en nuestro caso, el frontend enviará el email aquí)
    - password
    """
    # 1. Buscar al usuario en la BD por email (que viene en username)
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # 2. Si no existe o la contraseña no hace match con el hash de la BD
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Validar estado de la cuenta
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )

    # 4. Crear el JWT real con el ID del usuario y su rol
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role_id}
    )
    
    # 5. Configurar la Cookie HTTP-Only para máxima seguridad
    # ENFOQUE LOCALSTORAGE (Comentado por seguridad):
    # Si se quisiera guardar en el LocalStorage, simplemente se retornaría esto:
    # return {"access_token": access_token, "token_type": "bearer"}
    # El Frontend (React/Next) lo recibiría e iría a guardarlo en localStorage.setItem()
    # Desventaja: Vulnerable a ataques XSS.
    
    # ENFOQUE SEGURO (Cookie HttpOnly):
    # Se usa Response para inyectar la cookie directamente de vuelta al navegador del usuario
    response = Response(status_code=status.HTTP_200_OK)
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,  # ESTO ES LA MAGIA: Impide que JavaScript (y hackers por XSS) lean la cookie
        secure=False,   # CAMBIADO A False: Para que funcione en http://localhost (sin HTTPS)
        samesite="lax", # Previene ataques CSRF (Cross-Site Request Forgery)
        max_age=1800    # 30 minutos (igual que el token)
    )
    
    # IMPORTANTE: Se retorna el objeto 'response' para que FastAPI
    # envíe la cookie que se acaba de configurar al navegador.
    return response
