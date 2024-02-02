import os
from logging import getLogger, Logger
from typing import Optional, List

import discord
import redis.asyncio as redis
from aredis_om import Migrator
from redis_om import NotFoundError
from models import Member, Role
from discord.ext import commands
import pickle
import base64

try:
    from dotenv import load_dotenv

    load_dotenv()
except ModuleNotFoundError:
    pass


class Bot(commands.Bot):
    def __init__(
        self,
        *,
        intents: discord.Intents,
        guild_id: Optional[int] = None,
        extensions: List[str] = None,
    ):
        super().__init__(command_prefix="sq.id!!", intents=intents)

        if guild_id is not None:
            self.guild = discord.Object(id=guild_id)
        else:
            self.guild = None

        self.redis: redis.Redis = None
        self.exts = extensions or []
        self.log: Logger = getLogger("discord.app")

    async def setup_hook(self):
        # Initialize database connection
        self.redis = redis.Redis(
            host=os.getenv("REDIS_HOST"),
            port=os.getenv("REDIS_PORT", "6379"),
            password=os.getenv("REDIS_PASSWORD"),
            decode_responses=True,
        )
        await Migrator().run()
        ping = await self.redis.ping()
        self.log.info("Connected to redis (%s)", ping)
        # Initialize application commands
        self.log.info("Loading extensions: %s", self.exts)
        for ext in self.exts:
            await self.load_extension(ext)
        # get a unique hash of all commands to prevent duplicate commands
        commands = self.tree.get_commands()
        raw_hash = pickle.dumps(tuple(command.to_dict() for command in commands))
        command_hash = base64.b64encode(raw_hash).decode("utf-8")
        current_hash = await self.redis.get(
            f"command_hash:{self.user.id}:{self.guild.id if self.guild else 0}"
        ) or ""
        if current_hash != command_hash:
            self.log.info("Command Hash changed %s -> %s", current_hash[:5], command_hash[:5])
            await self.redis.set(
                f"command_hash:{self.user.id}:{self.guild.id if self.guild else 0}",
                command_hash,
            )

            if guild := self.guild:
                self.log.info("Copying global commands to testing guild %s", guild)
                self.tree.copy_global_to(guild=guild)
                await self.tree.sync(guild=guild)
            else:
                await self.tree.sync()
        else:
            self.log.info(
                "Command Hash unchanged (%s) will not sync discord commands",
                command_hash[:5],
            )

        self.log.info("Bot is setup")

    async def setup_guild(self, guild: discord.Guild) -> None:
        self.log.info("Setting up guild %s", guild.id)
        
        # fetch the proper guild object if doesn't exist
        try:
            guild.name 
        except AttributeError:
            guild = await self.fetch_guild(guild.id)
        async with self.redis.pipeline() as pipe:
            
            pipe.hset(f"guild:{guild.id}", mapping={
                "name": guild.name,
                "icon": guild.icon.url if guild.icon else "https://cdn.discordapp.com/embed/avatars/0.png",
                "owner": guild.owner_id,
                "banner": guild.banner.url if guild.banner else '',
                "description": guild.description or '',
                "locale": str(guild.preferred_locale),
            })
        
        stored_roles = await Role.find((Role.guild_id == guild.id)).all()
        stored_role_ids = [role.id for role in stored_roles]
        guild_roles = guild.roles
        for role in guild.roles:
            if role.id not in stored_role_ids:
                role = Role(
                    id=role.id,
                    guild_id=guild.id,
                    name=role.name,
                    color=role.color.value,
                    position=role.position,
                    permissions=role.permissions.value,
                    hoist=role.hoist,
                    managed=role.managed,
                    mentionable=role.mentionable,
                )
            else:
                role = stored_roles[stored_role_ids.index(role.id)]
                for attr in ["name", "color", "position", "permissions", "hoist", "managed", "mentionable"]:
                    setattr(role, attr, getattr(guild.roles[role.id], attr))
            
            await role.save()
                
        for role in stored_roles:
            if role.id not in [role.id for role in guild_roles]:
                await role.delete(pk=role.pk)
        
        
        # create timeseries for guild if not setup yet
        if not await self.redis.exists(f"guild:{guild.id}:members"):
        # member count for the guild
            await self.redis.ts().create(f"guild:{guild.id}:members", retention_msecs=4838400000, labels={"guild": str(guild.id), "type": "members"}) # 8 weeks

        if not await self.redis.exists(f"guild:{guild.id}:sources"):
        # the join method
            await self.redis.ts().create(f"guild:{guild.id}:sources", retention_msecs=4838400000, labels={"guild": str(guild.id), "type": "sources"}) # 8 weeks

        if not await self.redis.exists(f"guild:{guild.id}:sources.leave"):
            await self.redis.ts().create(f"guild:{guild.id}:sources.leave", retention_msecs=4838400000, labels={"guild": str(guild.id), "type": "sources.leave"}) # 8 weeks
            
        if not await self.redis.exists(f"guild:{guild.id}:retention"):
        # the leave method
            await self.redis.ts().create(f"guild:{guild.id}:retention", retention_msecs=4838400000, labels={"guild": str(guild.id), "type": "retention"}) # 8 weeks

        
    async def teardown_guild(self, guild: discord.Guild) -> None:
        keys = await self.redis.keys(f"guild:{guild.id}:*")
        await self.redis.delete(*keys)
        self.log.info("Tore down guild %s with %s data points", guild.id, len(keys))
        
    async def store_invites(
        self, guild: discord.Object, invites: List[discord.Invite], *, overwrite=False
    ) -> None:
        async with self.redis.pipeline(transaction=True) as pipe:
            if overwrite:
                pipe.delete(f"guild:{guild.id}:invites")
            for invite in invites:
                pipe.hset(
                    invite.code,
                    mapping={
                        "code": invite.code,
                        "uses": invite.uses,
                        "max_uses": invite.max_uses,
                        "guild": invite.guild.id,
                    },
                )
                pipe.sadd(f"guild:{guild.id}:invites", invite.code)
            await pipe.execute()

    async def delete_invites(
        self, guild: discord.Object, invites: Optional[List[discord.Invite]]
    ) -> int:
        if invites:
            keys = [invite.code for invite in invites]
        else:
            keys = await self.redis.smembers(f"guild:{guild.id}:invites")
            await self.redis.delete(f"guild:{guild.id}:invites")
        return await self.redis.delete(*keys)

    async def get_invites(
        self,
        guild: discord.Object,
        invites: Optional[List[discord.Invite]] = None,
        *,
        data: List[str] = ["code", "uses", "max_uses"],
    ) -> List[discord.Invite]:
        if invites:
            keys = [invite.code for invite in invites]
        else:
            keys = await self.redis.smembers(f"guild:{guild.id}:invites")

        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.multi()
            for key in keys:
                pipe.hmget(key, *data)

            results = await pipe.execute()
            return [{a: b for (a, b) in zip(data, result)} for result in results]

    async def get_invite_codes(self, guild: discord.Object):
        return await self.redis.smembers(f"guild:{guild.id}:invites")

    async def get_vanity(self, guild: discord.Object, datapoints = ["code", "uses", "max_uses"]):
        return {a: b for (a,b) in zip(datapoints, await self.redis.hmget(f"guild:{guild.id}:vanity", *datapoints))}
    
    async def store_vanity(self, guild: discord.Object, invite: discord.Invite):
        await self.redis.hset(f"guild:{guild.id}:vanity", mapping={
            "code": invite.code,
            "uses": invite.uses,
            "max_uses": invite.max_uses,
            "guild": invite.guild.id,
        })
    
    async def delete_vanity(self, guild: discord.Object):
        await self.redis.delete(f"guild:{guild.id}:vanity")
        
if __name__ == "__main__":
    if _id := os.getenv("GUILD_ID"):
        g_id = int(_id)
    else:
        g_id = None
    client_intents = discord.Intents(
        guilds=True,
        members=True,
        integrations=True,
        invites=True,
    )
    client = Bot(
        intents=client_intents,
        guild_id=g_id,
        extensions=["cogs.invitetracking", "cogs.watcher"],
    )
    
    

    TOKEN = os.getenv("TOKEN")
    client.run(TOKEN)
