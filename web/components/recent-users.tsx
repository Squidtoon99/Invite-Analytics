"use client";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import useSWR from "swr";
import { current_guild, useGuild } from "@/lib/state";
import { Skeleton } from "./ui/skeleton";
import { formatDistance } from "date-fns";
import { useHookstate } from "@hookstate/core";
import { useEffect, useState } from "react";

type APIUser = {
    pk: string;
    display_name: string;
    username: string;
    avatar: string;
    created_at: string;
    id: string;
    guild: string;
    joined_at: string;
    join_type: string;
    ts: number;
    inviter: string;
    code_used: string;
}
export function RecentUsers() {
    const guild = useGuild();
    const { data, isLoading, error } = useSWR(`/api/guilds/${guild?.id}/recent-users`, {
        refreshInterval: 1000,
        fetcher: (url) => fetch(url).then(response => response.json()),
        fallbackData: { data: [] }
    });
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000 * 30);
        return () => clearInterval(interval);
    })

    if (isLoading || error) {
        // console.log(data);
        // skeleton loader
        return <div className="space-y-8">
            {Array(5).fill(null).map((_, i) => <div key={i} className="flex items-center">
                <Skeleton className="h-9 w-9" />
                <div className="ml-4 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <div className="ml-auto font-medium">
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>)}
        </div>;
    }

    return (
        <div className="space-y-8">
            {(data?.data || []).map((user: APIUser) => {
                return <div key={user.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar || ""} alt="Avatar" />
                        <AvatarFallback>{user.display_name.split(" ").map(word => word.charAt(0)).slice(-5).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{user.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                            @{user.username}
                        </p>
                    </div>
                    {/* When they joined */}
                    <div className="ml-auto font-medium">{formatDistance(new Date(user.ts * 1000), now, { addSuffix: true })}</div>
                </div>;
            })}
        </div>
    );
}