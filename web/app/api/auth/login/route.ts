import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { User } from "@/app/api/user";
import { redirect } from "next/navigation";

export const GET = async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const next = searchParams.get("next") || "/dashboard";
    const session = await getSession(request, new Response());
    const user: User | undefined = session.user;

    // console.log("user: ", user);
    // if user is undefined

    if (!user) {
        let h: string;
        if ((request.headers.get("host") || "localhost:").startsWith("localhost:")) {
            h = "http://";
        } else {
            h = "https://";
        }

        let url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID
            }&redirect_uri=${encodeURIComponent(`${process.env.NEXT_PUBLIC_ADDRESS}/api/auth/callback`)}&response_type=code&scope=guilds%20identify&prompt=none`;
        
        return redirect(url);
    } else {
        
        const url = request.nextUrl.clone();
        url.pathname = next;
        // clear the code from the url
        url.searchParams.delete("code");

        return NextResponse.redirect(url);
    }
};