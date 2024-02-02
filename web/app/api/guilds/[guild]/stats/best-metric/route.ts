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

    const best_metric = await client.execute([
        "FT.AGGREGATE",
        ":models.Member:index",
        `@guild:[${guild_id} ${guild_id}]`,
        "GROUPBY",
        "1",
        "@join_type",
        "REDUCE",
        "count",
        "0",
        "AS",
        "num_visits",
        "SORTBY",
        "2",
        "@num_visits",
        "DESC",
        "LIMIT",
        "0",
        "1"
    ]) as [number, [
        string,
        string,
        string,
        number
        ]];
    if (best_metric.length <= 1) {
        return NextResponse.json({
            metric: "N/A",
            hits: 0
        });
    }
    return NextResponse.json({
            metric: best_metric[1][1],
            hits: best_metric[1][3]
    } );
};

export { GET };