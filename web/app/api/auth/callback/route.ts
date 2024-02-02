import { NextRequest, NextResponse } from "next/server";
import {connect} from "@/lib/redis";
import { URLSearchParams } from "url";
import { RESTGetAPICurrentUserGuildsResult, RESTGetAPICurrentUserResult, RESTPostOAuth2AccessTokenResult } from "discord-api-types/v9";
import { User } from "../../user";
import { getSession } from "@/lib/session";
const data = {
    client_id: process.env.CLIENT_ID as string,
    client_secret: process.env.CLIENT_SECRET as string,
    grant_type: "authorization_code",
};

const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
};

export const GET = async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");

    if (!code) {
        const url = request.nextUrl.clone();
        url.pathname = '/api/auth/login';
        return NextResponse.redirect(url);
    }

    const payload = new URLSearchParams();

    payload.append("code", code);
    // console.log("code", code);
    let h;
    if ((request.headers.get("host") || "").startsWith("localhost:")) {
        h = "http://";
    } else {
        h = "https://";
    }
    payload.append("redirect_uri", `${process.env.NEXT_PUBLIC_ADDRESS}/api/auth/callback`);

    // add every item in data to the payload
    for (const [key, value] of Object.entries(data)) {
        payload.append(key, value);
    }

    const fetchResp = await fetch("https://discord.com/api/v9/oauth2/token", {
        method: "POST",
        headers: headers,
        body: payload,
    });

    const json: RESTPostOAuth2AccessTokenResult = await fetchResp.json();

    if ("error" in json || json.scope !== "identify guilds") {
        // console.log(json);
        const url = request.nextUrl.clone();
        url.pathname = '/api/auth/login';
        return NextResponse.redirect(url);
    }

    const userResp = await fetch("https://discord.com/api/oauth2/@me", {
        headers: {
            Authorization: `${json.token_type} ${json.access_token}`,
            ContentType: "application/x-www-form-urlencoded",
        },
    });

    const userData: RESTGetAPICurrentUserResult = await userResp.json();

    const guildsResp = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
            Authorization: `${json.token_type} ${json.access_token}`,
            ContentType: "application/x-www-form-urlencoded",
        },
    });

    const guildsData: RESTGetAPICurrentUserGuildsResult = await guildsResp.json();

    const user: User = {
        isLoggedIn: true,
        token: json.access_token,
        avatarUrl: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp`,
    }

    const udata = {
        user: userData,
        guilds: guildsData,
    }

    const client = await connect();

    await client.jsonset(`user:${json.access_token}`,  udata);
    await client.expire(`user:${json.access_token}`, 60 * 60 * 24 * 7);

    const response = new NextResponse();
    const session = await getSession(request, response);

    session.user = user;

    await session.save();

    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    // clear the code from the url
    url.searchParams.delete("code");

    return NextResponse.redirect(url, {
        headers: response.headers
    });
};