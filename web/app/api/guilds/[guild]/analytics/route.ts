import { connect } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest, 
    { params }: { params: { guild: string }}
) => {
    // get the [guild] slug from the request
    const guild_id = params.guild;

    // const aggregate = searchParams.get("aggregate");

    // if (aggregate === null) {
    //     const response = {
    //         status: "error",
    //         message: "aggregate is required"
    //     };
    //     return NextResponse.json(response, { status: 400 });
    // }
    // connect to redis
    const client = await connect();

    // get the guild data from redis timeseries
    const data = await client.execute([
        "TS.RANGE",
        `guild:${guild_id}:members`,
        "-",
        "+",
        "+",
        "AGGREGATION",
        "avg",
        "36000000"
    ]);

    // console.log("data2: ", data);
    return NextResponse.json({ data }); // @ts-ignore
};

export { GET };