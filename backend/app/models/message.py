import datetime
from sqlalchemy import Integer, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User

class Message(Base):
    """
    Modelo de SQLAlchemy para la tabla 'messages'.
    Representa un mensaje dentro del chat de un ticket.
    
    Dependencias:
    - Base: Para el mapeo ORM.
    - ticket_id: Llave foránea a 'tickets'.
    - author_id: Llave foránea a 'users'.
    """
    __tablename__ = "messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Nuevo campo para trazabilidad: indica si el mensaje fue generado automáticamente
    # por el sistema (ej. "Ticket asignado a X") en vez de ser un chat humano.
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"), nullable=False)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relaciones
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="messages")
    author: Mapped["User"] = relationship("User", back_populates="messages")

