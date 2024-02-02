import { connect } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest, { params }: { params: { guild: string; }; }) => {
    const guild_id = params.guild;
    const client = await connect();

    let result = await client.execute([
        "EXISTS",
        `guild:${guild_id}`
    ]);
    if (!result) {
        return {
            status: "error",
            message: "guild not found"
        };
    }
    const { searchParams } = new URL(request.nextUrl);
    
    const { start, end } = Object.fromEntries(searchParams.entries());
    const start_date = parseInt(start || (Date.now() - 2419200000).toString());
    const end_date = parseInt(end || Date.now().toString());

    /*
    TS.RANGE guild:641782804849491979:sources.leave - +
    AGGREGATION count 6048000000
    */
    let lost_members = [];
    let past_members = [];
    let current_members = [];
    try {
        lost_members = await client.execute([
            "TS.RANGE",
            `guild:${guild_id}:sources.leave`,
            start_date,
            end_date,
            "AGGREGATION",
            "count",
            6048000000
        ]) as [number, string] | [] || [];

        past_members = await client.execute([
            "TS.RANGE",
            `guild:${guild_id}:members`,
            start_date,
            "+",
            "COUNT",
            "1"
        ]) as [number, string] | [] || [];

        current_members = await client.execute([
            "TS.GET",
            `guild:${guild_id}:members`
        ]);
    } catch (err) {
        console.error(err);
        return NextResponse.json({
            rate: 0,
        })
    }

    console.log("churn-rate/route.ts: ", lost_members, past_members);
    let past_member_count = past_members?.length >= 1 ? past_members[0][1] : 1;
    let lost_member_count = lost_members?.length >= 1 ? lost_members[0][1] : 0;
    let current_member_count = current_members?.length >= 1 ? current_members[1] : 0;
    
    const people_who_joined = parseInt(current_member_count) - parseInt(past_member_count);
    const people_who_left = parseInt(lost_member_count);
    const churn_rate = (people_who_left / people_who_joined) * 100;
    return NextResponse.json({
        rate: churn_rate.toFixed(2),
    })
};

export { GET };