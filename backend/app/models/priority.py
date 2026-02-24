from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.ticket import Ticket

class Priority(Base):
    __tablename__ = "priorities"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False) # e.g., low, medium, high
    color_code: Mapped[str | None] = mapped_column(String(20)) # e.g., hex code for UI
    
    tickets: Mapped[list["Ticket"]] = relationship("Ticket", back_populates="priority")
