import datetime
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.message import Message
    from app.models.priority import Priority

class Ticket(Base):
    __tablename__ = "tickets"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open") # opciones: open, in_progress, closed
    priority_id: Mapped[int] = mapped_column(ForeignKey("priorities.id"), nullable=False)
    
    # Relaciones
    priority: Mapped["Priority"] = relationship("Priority", back_populates="tickets")
    
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assigned_technician_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relaciones
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="tickets")
    technician: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_technician_id], back_populates="assigned_tickets")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="ticket")

