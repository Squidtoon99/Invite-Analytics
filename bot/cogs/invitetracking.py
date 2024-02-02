from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, List, Optional

import discord
from discord import app_commands
from discord.ext import commands
from discord.ext.commands import Cog
from models import Member
from aredis_om.model import model
from .utils import compareInvites, dump_invite
from fuzzywuzzy import process
from tqdm.contrib.logging import tqdm_logging_redirect
from tqdm import tqdm

if TYPE_CHECKING:
    from redis.asyncio.client import Pipeline

    from ..bot import Bot


class JoinType(Enum):
    Unknown = 0
    Invite = 1
    Discovery = 2
    Custom = 3
    NotTracked = 4
    Vanity = 5


class MemberTracking(Cog):
    def __init__(self, bot):
        self.bot: "Bot" = bot
        self.log = bot.log.getChild("MemberTracking")

    @app_commands.command()
    async def dashboard(self, interaction: discord.Interaction) -> None:
        """Configure the bot's settings"""
        await interaction.respond("https://itracker.squid.pink/")

    async def invite_auto_complete(
        self, interaction: discord.Interaction, current: str
    ) -> List[app_commands.Choice[str]]:
        guild_invites: List[str] = await self.bot.get_invite_codes(interaction.guild)

        if len(current) > 0:
            closest = process.extract(current, guild_invites, limit=5)
        else:
            closest = [(invite, 100) for invite in guild_invites[:5]]

        return [
            app_commands.Choice(name=f".gg/{invite}", value=f"discord.gg/{invite}")
            for invite, _ in closest
        ]

    @app_commands.command()
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.autocomplete(invite=invite_auto_complete)
    async def link(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
        invite: str,
        *,
        name: Optional[str] = None,
    ) -> None:
        """Link an invite to a role"""

        if invite.startswith(".gg/"):
            invite = "discord" + invite

        try:
            actual_invite = await self.bot.fetch_invite(invite)
        except ValueError:
            await interaction.response.send_message(
                ":warning: Invite must not contain any extra arguments", ephemeral=True
            )
        except discord.NotFound:
            await interaction.response.send_message(
                ":warning: Invite not found", ephemeral=True
            )
        except discord.HTTPException:
            await interaction.response.send_message(
                ":warning: An error occurred while fetching the invite. Please try again or contact developers.",
                ephemeral=True,
            )
        if actual_invite.guild.id != interaction.guild.id:
            await interaction.response.send_message(
                f":warning: Invite {invite} is not from this guild", ephemeral=True
            )
            return

        if role.id != interaction.guild.id:
            # I don't know anymore
            await interaction.response.send_message(
                f":warning: Role {role.name} is not from this guild", ephemeral=True
            )
            return

        if not (me := interaction.guild.me):
            me = await interaction.guild.fetch_member(self.bot.user.id)

        if not me.guild_permissions.manage_guild:
            await interaction.response.send_message(
                ":warning: I require `Manage Server` to track invites", ephemeral=True
            )
            return

        invite_data = await self.bot.get_invites(interaction.guild)
        if not invite_data or not any(
            [i["code"] == actual_invite.code for i in invite_data]
        ):
            # refetching invites
            invites = await interaction.guild.invites()
            await self.bot.store_invites(invites=invites, overwrite=True)
            await self.bot.setup_guild(interaction.guild)

        def clean(s):
            protected_words = ["discovery", "vanity", "unknown", "discord", "invite"]
            if s in protected_words:
                return "user:" + s

        await self.bot.redis.hset(
            actual_invite.code,
            mapping={
                "role": role.id,
                "name": clean(name or role.name),
            },
        )

    @Cog.listener()
    async def on_ready(self):
        with tqdm_logging_redirect(self.log):
            for guild in tqdm(self.bot.guilds):
                # check for existing redis issue
                phrase = "discord.Forbidden: discord permissions error to fetch invites for guild"
                if await self.bot.redis.sismember(f"guild:{guild.id}:errors", phrase):
                    self.log.debug(
                        "Ignoring guild %s due to previous error", guild.name
                    )
                    continue

                try:
                    invites = await guild.invites()
                except discord.Forbidden:
                    self.log.debug(
                        "discord permissions error to fetch invites for guild %s (%s)",
                        guild.name,
                        guild.id,
                    )
                    await self.bot.redis.sadd(f"guild:{guild.id}:errors", phrase)
                else:
                    await self.bot.store_invites(guild, invites, overwrite=True)
                    await self.bot.setup_guild(guild)

    @Cog.listener()
    async def on_guild_join(self, guild: discord.Guild) -> None:
        """Index a guild when joining"""
        if guild.me.guild_permissions.manage_guild:
            # TODO: Watch for permissions changes to potentially warn / update this database
            try:
                invites = await guild.invites()
            except discord.Forbidden:
                self.log.debug(
                    "discord permissions error to fetch invites for guild %s (%s)",
                    guild.name,
                    guild.id,
                )
            else:
                await self.bot.store_invites(guild, invites, overwrite=True)
                await self.bot.setup_guild(guild)

    @Cog.listener()
    async def on_guild_remove(self, guild: discord.Guild) -> None:
        """Remove a guild from the database when leaving"""
        await self.bot.teardown_guild(guild)
        await self.bot.delete_invites(guild)

    @Cog.listener()
    async def on_invite_create(self, invite: discord.Invite) -> None:
        """Add an invite to the database once it's created"""
        if not hasattr(invite.guild, "name"):
            invite = await self.bot.fetch_invite(invite.url)
        await self.bot.store_invites(invite.guild, [invite])

    @Cog.listener()
    async def on_invite_delete(self, invite: discord.Invite):
        """Purge Invite from database when deleted"""
        if not hasattr(invite.guild, "name"):
            invite = await self.bot.fetch_invite(invite.url)
        await self.bot.delete_invites(invite.guild, [invite])

    @Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        """Check if a member joined with an invite"""
        if member.bot:
            return

        if not hasattr(member.guild, "name"):
            guild: discord.Guild = await self.bot.fetch_guild(member.guild.id)
        else:
            guild: discord.Guild = member.guild

        try:
            invites_raw = await guild.invites()
        except discord.Forbidden:
            self.log.debug(
                "discord permissions error to fetch invites for guild %s (%s)",
                guild.name,
                guild.id,
            )

            # turn on the error in the guild errors
            await self.bot.redis.sadd(
                f"guild:{guild.id}:errors",
                "discord.Forbidden: discord permissions error to fetch invites for guild",
            )
            return
        datapoints = ["code", "uses", "max_uses"]
        old_invites = await self.bot.get_invites(member.guild, data=datapoints)
        await self.bot.store_invites(member.guild, invites_raw, overwrite=True)
        invites = [
            {k: getattr(invite, k) for k in datapoints} for invite in invites_raw
        ]

        join_type: JoinType = JoinType.Unknown
        invite = None

        def eq(a, b):
            if len(a) != len(b):
                return False
            x = sorted(a, key=lambda z: z["code"])
            y = sorted(b, key=lambda z: z["code"])
            for i, j in zip(x, y):
                if i["code"] != j["code"] or int(i["uses"]) != int(j["uses"]):
                    return False
            return True

        if "VANITY_URL" in member.guild.features and eq(invites, old_invites):
            self.log.info("Potential vanity invite detected")
            vanity: Optional[discord.Invite] = await guild.vanity_invite()
            old_vanity = await self.bot.get_vanity(guild)
            await self.bot.store_vanity(guild, vanity)
            print("o: ", old_vanity['uses'], "n:", vanity.uses)
            if old_vanity and vanity:
                if int(old_vanity["uses"]) + 1 == vanity.uses:
                    join_type = JoinType.Vanity
                    invite = vanity
                else:
                    join_type = JoinType.Discovery

        if join_type == JoinType.Unknown:
            used_invites = compareInvites(old_invites, invites)
            self.log.debug("Used invites: %s", used_invites)

            if len(used_invites) == 0:
                join_type = JoinType.Discovery
            elif len(used_invites) == 1:
                join_type = JoinType.Invite
                invite = used_invites[0]
            else:
                join_type = JoinType.Unknown

            if invite:
                try:
                    invite = await self.bot.fetch_invite(f"discord.gg/{invite}")
                except discord.NotFound:
                    invite = None

        self.log.info(
            f"{member.name} joined with {join_type} [Invite: %s]",
            invite.code if invite else "N/A",
        )

        if not (m_count := member.guild.member_count):
            m_count = await self.bot.redis.ts().get(f"guild:{guild.id}:members")
            if m_count is None and invite is not None:
                m_count = invite.approximate_member_count
            else:
                m_count = 0
            m_count += 1

        ts = int(member.joined_at.timestamp() * 1000)
        print(ts)
        print(
            await self.bot.redis.ts().madd(
                [
                    # (key, timestamp, value)
                    (f"guild:{guild.id}:members", "*", m_count),
                    (f"guild:{guild.id}:sources", "*", join_type.value),
                ]
            )
        )

        await self.bot.redis.sadd(f"guild:{guild.id}:joins", member.id)

        new_member = Member(
            **{
                "id": member.id,
                "guild": member.guild.id,
                "joined_at": member.joined_at.date(),
                "ts": int(float(ts / 1000)),
                "avatar": member.avatar.url
                if member.avatar
                else "https://discord.com/assets/322c936a8c8be1b803cd94861bdfa868.png",
                "display_name": member.display_name,
                "username": member.name,
                "created_at": member.created_at.date(),
                "join_type": join_type.name,
                "inviter": invite.inviter.id if invite and join_type != JoinType.Vanity else 1,
                "code_used": invite.code if invite else "",
            }
        )
        await new_member.save()
        if join_type ==  JoinType.Invite:
            await self.bot.redis.incr(
                f"guild:{guild.id}:invites:{invite.inviter.id}", 1
            )
            
            code = invite.code
            if roles := await self.bot.redis.smembers(f"{code}:roles"):
                try:
                    await member.add_roles(*[guild.get_role(int(r)) for r in roles])
                except discord.Forbidden:
                    await self.bot.redis.sadd(f"guild:{guild.id}:errors", "discord.Forbidden: discord permissions error to add roles")
                except discord.HTTPException as e:
                    await self.bot.redis.sadd(f"guild:{guild.id}:errors", f"discord.HTTPException: {e}")
                else:
                    await self.bot.redis.delete(f"guild:{guild.id}:errors")

        # await self.bot.redis.hset("guild:{guild.id}:{ts}", "")
        # turn off the error in the guild errors
        await self.bot.redis.srem(
            f"guild:{guild.id}:errors",
            "discord.Forbidden discord permissions error "
            + f"to fetch invites for guild {guild.name} ({guild.id})",
        )
        
        

    @Cog.listener()
    async def on_member_remove(self, member: discord.Member) -> None:
        g = member.guild
        self.log.info("member count: %s", g.member_count)
        try:
            user_info = await Member.find(
                (Member.id == member.id) & (Member.guild == g.id)
            ).first()
        except model.NotFoundError:
            user_info = None

        if user_info:
            join_type = getattr(JoinType, user_info.join_type.title())
            await Member.delete(user_info.pk)
        else:
            join_type = JoinType.NotTracked

        # delete some boring data
        async with self.bot.redis.pipeline(transaction=False) as pipe:
            pipe.srem(f"guild:{g.id}:joins", member.id)
            if join_type == JoinType.Invite.value:
                pipe.decr(f"guild:{g.id}:invites:{user_info.inviter}", 1)
            await pipe.execute()

        await self.bot.redis.ts().madd(
            [
                (f"guild:{g.id}:members", "*", g.member_count),
                (
                    f"guild:{g.id}:sources.leave",
                    "*",
                    join_type.value if type(join_type) == JoinType else int(join_type),
                )
                # (f"guild:{g.id}:retention", "*", str((member.joined_at - datetime.now()).timestamp() * 1000))
            ]
        )


async def setup(bot: commands.Bot) -> None:
    cog = MemberTracking(bot)
    await bot.add_cog(cog)
