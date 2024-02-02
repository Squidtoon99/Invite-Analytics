import { connect } from "@/lib/redis";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

const GET = async (request: NextRequest) => {
    const { user } = await getSession(request, new NextResponse());
    // console.log("user: ", user);
    const client = await connect();
    if (user) {
        const data = await client.jsonget(`user:${user.token}`);
        return NextResponse.json({ ...data.user.user });
    } else {
        return NextResponse.json({ user: undefined, reason: "stupid"});
    }
    
};

export { GET };