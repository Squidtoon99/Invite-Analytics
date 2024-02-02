import { connect, pipe } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest) => {
    const { user } = await getSession(request, new Response());

    const client = await connect();
    const cpipe = await pipe();
    if (user) {
        const data = await client.jsonget(`user:${user.token}`);
        const guilds = data.guilds;
        // add the bot_exists field to each guild in guilds if client.exists(`guild:${guild.id}`
        // use a redis pipe to call EXISTS on guild:${guild.id} for each guild in guilds and store it in a list called guild_exist_data
        await cpipe.execute(['MULTI']);
        for (let i = 0; i < guilds.length; i++) {
            await cpipe.execute(['EXISTS', `guild:${guilds[i].id}`]);
        }
        let guild_exist_data = await cpipe.execute(['EXEC']);
        // console.log("EXIST DATA: ", guild_exist_data);
        for (let i = 0; i < guilds.length; i++) {
            guilds[i].bot_exists = guild_exist_data[i] === 1;
            guilds[i].manage_server = (guilds[i].permissions & 0x20) > 0;
        }
        return NextResponse.json({ guilds })
    } else {
        return NextResponse.json({ guilds: [] });
    }

};

export { GET };