import inspect
import os
import traceback
from asyncio import set_event_loop
from typing import TYPE_CHECKING
from discord.ext.commands import Cog
from discord.ext.tasks import loop

class MonkeyWatcher(Cog):
    def __init__(self, bot):
        self.bot = bot
        self.cache = {}
        self.log = bot.log.getChild(type(self).__name__)

        self.watcher.start()

    @loop(seconds=1)
    async def watcher(self):
        for name, module in self.bot.extensions.copy().items():
            folder = False
            if module.__file__.endswith("__init__.py"):
                # it's a folder
                folder = True
                fpath = module.__file__[:-11]
            if folder:
                stat = {
                    name: int(os.stat(os.path.join(fpath, name)).st_mtime)
                    for name in os.listdir(fpath)
                    if name.endswith(".py")
                }
            else:
                stat = int(os.stat(inspect.getfile(module)).st_mtime)

            if name not in self.cache:
                self.cache[name] = stat
                continue

            if stat != self.cache.get(name):
                self.cache[name] = stat
                self.log.debug(f"Reloading: {name}")
                try:
                    await self.bot.reload_extension(name)
                except: # pylint: disable=bare-except
                    traceback.print_exc()
                else:
                    self.log.info(f"Reloaded: {name}")

    @watcher.before_loop
    async def waiter(self):
        await self.bot.wait_until_ready()
        return True

    async def cog_unload(self):
        self.watcher.stop()  # pylint: disable=no-member


async def setup(bot):
    cog = MonkeyWatcher(bot)

    await bot.add_cog(cog)
