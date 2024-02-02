import { connect } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

// Redis Command: 
/*
FT.SEARCH :models.Member:index "@guild:[641782804849491979 641782804849491979]"
    SORTBY ts DESC
    LIMIT 0 20
*/

const GET = async (request: NextRequest,
    { params }: { params: { guild: string; }; }
) => {
    const guild_id = params.guild;
    const client = await connect();
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
    const session = await getSession(request, new NextResponse());

    if (!session?.user?.isLoggedIn) {
        // console.log("cuser: ", session.user);
        const response = {
            status: "error",
            message: "unauthorized"
        };
        return NextResponse.json(response, { status: 401 });
    }

    const { searchParams } = new URL(request.nextUrl.toString());

    const offset = searchParams.get("offset") || "0";
    const perPage = searchParams.get("per") || "20";

    const sortby = (searchParams.get("sort") || "ts").toLocaleLowerCase();
    const sortorder = (searchParams.get("order") || "DESC").toLocaleUpperCase();

    // ensure sortby is one of [ts, display_name, created_at, joined_at, id, join_type, username, code_used]
    if (["ts", "display_name", "created_at", "joined_at", "id", "join_type", "username", "code_used"].indexOf(sortby) === -1) {
        const response = {
            status: "error",
            message: "invalid sortby"
        };
        return NextResponse.json(response, { status: 400 });
    }

    // ensure sortorder is one of [ASC, DESC]
    if (["ASC", "DESC"].indexOf(sortorder) === -1) {
        const response = {
            status: "error",
            message: "invalid sortorder"
        };
        return NextResponse.json(response, { status: 400 });
    }

    const data = await client.execute([
        "FT.SEARCH",
        ":models.Member:index",
        `@guild:[${guild_id} ${guild_id}]`,
        "SORTBY",
        sortby,
        sortorder,
        "LIMIT",
        parseInt(offset),
        parseInt(perPage)
    ]) as string[][];
    return NextResponse.json(data.filter((_, i) => i % 2 === 0 && i > 0).map((item, _) => JSON.parse(item[3])))
};

export { GET };