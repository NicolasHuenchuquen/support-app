from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

class Role(Base):
    __tablename__ = "roles"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False) # e.g., admin, technician, client
    description: Mapped[str | None] = mapped_column(String(255))
    
    users: Mapped[list["User"]] = relationship("User", back_populates="role")
