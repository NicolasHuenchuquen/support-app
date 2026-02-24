from typing import Optional
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.ticket import Ticket
    from app.models.role import Role

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    
    # Relaciones
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="user")
    tickets: Mapped[list["Ticket"]] = relationship("Ticket", foreign_keys="[Ticket.user_id]", back_populates="user")
    assigned_tickets: Mapped[list["Ticket"]] = relationship("Ticket", foreign_keys="[Ticket.assigned_technician_id]", back_populates="technician")
