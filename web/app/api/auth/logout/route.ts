import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
    let response = new NextResponse();
    const session = await getSession(request, response);

    session.user = undefined;

    await session.destroy();

    const url = request.nextUrl.clone();
    url.pathname = '/';
    // clear the code from the url
    url.searchParams.delete("code");
    // console.log("headers:", response.headers);
    return NextResponse.redirect(url, {
        status: 302,
        headers: response.headers
    });
};