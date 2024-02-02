import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connect } from "@/lib/redis";

const GET = async (request: NextRequest, params: { guild: string; }) => {
    const { user } = await getSession(request, new NextResponse());
    if (!user) {
        return NextResponse.json({
            status: "error",
            message: "not logged in"
        }, { status: 401 });
    }

    const client = await connect();
    const guild_id = params.guild;

    let guild_exists = await client.execute([
        "EXISTS",
        `guild:${guild_id}`
    ]);

    if (!guild_exists) {
        return NextResponse.json({
            status: "error",
            message: "guild not found"
        }, { status: 404 });
    }

    let result = await client.execute([
        "FT.SEARCH",
        ":models.Role:index",
        `@guild:[${guild_id} ${guild_id}]`,
        "SORTBY",
        "ts",
    ]) as string[][];

    if (result.length <= 1) {
        return NextResponse.json({
            data: []
        });
    } else {
        console.log('role-data: ', result);
        return NextResponse.json({
            data: result.slice(1).map((r) => JSON.parse(r[3]))
        });
    }
};

export { GET };