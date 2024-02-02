import discord
from typing import List

def compareInvites(old_inv: List[discord.Invite], new_inv: List[discord.Invite]) -> List[discord.Invite]:
    """Return a list of invites that have updated"""
    codes_used = []
    old_obj = {i["code"]: i for i in old_inv}
    # conversions because dpy returns a list
    new_obj = {i["code"]: i for i in new_inv}
    for key in new_obj.keys():
        if int(new_obj[key]["uses"]) != 0 and (
            not old_obj.get(key) or int(old_obj[key]["uses"]) < int(new_obj[key]["uses"])
        ):
            codes_used.append(key)
    if len(codes_used) == 0:
        for key in old_obj.keys():
            if (
                not new_obj.get(key)
                and int(old_obj[key]["uses"]) == int(old_obj[key]["max_uses"]) - 1
            ):
                codes_used.append(key)
    return codes_used

def dump_invite(invite: discord.Invite) -> dict:
    if not invite:
        return {}
    return {
        "code": invite.code,
        "uses": invite.uses,
        "max_uses": invite.max_uses
    }