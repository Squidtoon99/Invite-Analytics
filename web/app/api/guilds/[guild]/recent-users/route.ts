import { connect } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

type Record = string[4][];

const GET = async (request: NextRequest, 
    { params }: { params: { guild: string }}
) => {
    // get the [guild] slug from the request
    const guild_id = params.guild;
    const client = await connect();
    // ensure the guild_id exists

    let result = await client.execute([
        "EXISTS",
        `guild:${guild_id}`
    ])
    if (!result) {
        const response = {
            status: "error",
            message: "guild not found"
        }
        return NextResponse.json(response, { status: 404 });
    }
    // get the user from the session
    const { user } = await getSession(request, new NextResponse());

    const { searchParams } = new URL(request.nextUrl.toString());

    // get the from and to dates from the query string
    let rlimit = searchParams.get("limit");
    let limit: number;
    if (rlimit === undefined || rlimit === null) {
        limit = 5;
    } else {
        limit = parseInt(rlimit);

        if (isNaN(limit) || limit > 10) {
            const response = {
                status: "error",
                message: "limit must be a number less than 10"
            }
            return NextResponse.json(response, { status: 400 });
        }
    }
    
    // FT.SEARCH :models.Member:index "@guild:[641782804849491979 641782804849491979]" SORTBY ts DESC LIMIT 0 5

    const data: Record = await client.execute([
        "FT.SEARCH",
        ":models.Member:index",
        `@guild:[${guild_id} ${guild_id}]`,
        "SORTBY",
        "ts",
        "DESC",
        "LIMIT",
        "0",
        limit.toString()
    ])

    // format the data
    const output = data.filter((_, i) => i % 2 === 0 && i > 0).map((item, _) => JSON.parse(item[3]));
    return NextResponse.json({ data: output }); // @ts-ignore
};

export { GET };