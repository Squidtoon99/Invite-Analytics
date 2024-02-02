from aredis_om import Field, JsonModel
from pydantic import PositiveInt
from typing import List, Optional
import datetime

class Member(JsonModel):
    display_name: str = Field(index=True)
    username: str = Field(index=True)
    avatar: str = Field(index=True)
    # created_at: datetime
    created_at: datetime.date = Field(index=True)
    id: PositiveInt = Field(index=True)
    guild: PositiveInt = Field(index=True)
    joined_at: datetime.date = Field(index=True)
    join_type: str = Field(index=True)
    ts: int = Field(index=True)
    inviter: Optional[PositiveInt] = Field(index=True)
    code_used: Optional[str] = Field(index=True)
    
class Role(JsonModel):
    class Meta:
        global_key_prefix = "role"
    id: PositiveInt = Field(index=True, primary_key=True)
    guild_id: PositiveInt = Field(index=True)
    name: str = Field(index=True)
    color: int = Field(index=True)
    position: int = Field(index=True)
    permissions: int = Field(index=True)
    hoist: bool = Field(index=True)
    managed: bool = Field(index=True)
    mentionable: bool = Field(index=True)

class Guild(JsonModel):
    id: PositiveInt = Field(index=True)
    name: str = Field(index=True)
    icon: str = Field(index=True)
    owner: PositiveInt = Field(index=True)
    region: str = Field(index=True)
    afk_timeout: int = Field(index=True)
    afk_channel_id: Optional[PositiveInt] = Field(index=True)
    verification_level: int = Field(index=True)
    default_message_notifications: int = Field(index=True)
    explicit_content_filter: int = Field(index=True)