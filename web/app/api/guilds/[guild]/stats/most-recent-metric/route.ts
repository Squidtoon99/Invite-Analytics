import { connect } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";


/*
Redis Command:
FT.SEARCH :models.Member:index "@guild:[641782804849491979 641782804849491979]"
    SORTBY ts DESC
    LIMIT 0 1
    
*/

const GET = async (request: NextRequest,
    { params }: { params: { guild: string; }; }
) => {
    // get the [guild] slug from the request
    const guild_id = params.guild;
    const client = await connect();
    // ensure the guild_id exists

    let result = await client.execute([
        "EXISTS",
        `guild:${guild_id}`
    ]);
    if (!result) {
        const response = {
            status: "error",
            message: "guild not found"
        };
        return NextResponse.json(response, { status: 404 });
    }
    // get the user from the session
    const { user } = await getSession(request, new NextResponse());

    const data = await client.execute([
        "FT.SEARCH",
        ":models.Member:index",
        `@guild:[${guild_id} ${guild_id}]`,
        "SORTBY",
        "ts",
        "DESC",
        "LIMIT",
        "0",
        "1"
    ]) as string[][];

    if (data.length <= 1) {
        return NextResponse.json({
            data: {
                join_type: "N/A",
                ts: new Date().getTime() / 1000
            }
        });
    }
    return NextResponse.json({data: JSON.parse(data[2][3])})
};

export { GET };