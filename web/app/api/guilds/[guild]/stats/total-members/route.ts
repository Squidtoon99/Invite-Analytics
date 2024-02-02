// REDIS COMMAND: 
/* FT.AGGREGATE :models.Member:index "@guild:[641782804849491979 641782804849491979]"
    GROUPBY 1 @join_type
        REDUCE count 0 AS num_visits
    SORTBY 2 @num_visits DESC
    LIMIT 0 1
*/




import { connect } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

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

    const current_members = await client.execute([
        "TS.GET",
        `guild:${guild_id}:members`
    ]) as [number, string] | [] || [];

    // 4 weeks ago member count
    const date = Date.now() - 2419200000;

    const past_members = await client.execute([
        "TS.RANGE",
        `guild:${guild_id}:members`,
        date,
        "+",
        "COUNT",
        "1"
    ]) as [number, string] | [] || [];

    // console.log('total-members/route.js: ', past_members, current_members);
    if (current_members.length === 0 || past_members.length === 0) {
        return NextResponse.json({
            current: 0,
            past: 0,
            diff: Date.now()
        })
    }
    return NextResponse.json(
        {
            current: parseInt(current_members[1]),
            past: parseInt(past_members[0][1]),
            diff: past_members[0][0]
        });
};

export { GET };