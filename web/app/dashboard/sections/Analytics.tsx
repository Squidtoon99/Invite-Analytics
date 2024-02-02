import useSWRInfinite from "swr/infinite";
import { useHookstate } from "@hookstate/core";
import { current_guild, useGuild } from "@/lib/state";
import { useEffect, useRef, useState } from "react";
import parse from "date-fns/parse";
import { formatDistance } from "date-fns";
import {Avatar, AvatarImage, AvatarFallback} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";
import { useOnScreen } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

const PAGE_SIZE = 30;

// decide a random color (red, orange, yellow, green) based on the text provided
const classify = (text: string) => {
    const hash = text.split("").reduce((acc, char) => {
        acc = ((acc << 5) - acc) + char.charCodeAt(0);
        return acc & acc;
    }, 0);
    const colors = ["from-orange-500 to-rose-500", "from-[#5865F2] to-emerald-400", "from-[#FEE75C] to-orange-400", "from-[#EB459E] to-blue-300"];
    return colors[Math.abs(hash) % colors.length];
}
const getKey = (pageIndex: number, previousPageData: any, guild: string, pageSize: number, sort: { key: string; order: string; }) => {
    // console.log("p: ", pageIndex, previousPageData, previousPageData);
    if (previousPageData && !previousPageData.length) return null; // reached the end

    return `/api/guilds/${guild}/users?` + new URLSearchParams({
        offset: (pageIndex * pageSize).toString(),
        per: pageSize.toString(),
        sort: sort.key,
        order: sort.order
    });
    
};

const Analytics = () => {
    const ref = useRef()
    const guild = useGuild();
    const [sort, setSort] = useState({ key: "ts", order: "desc" });
    const isVisible = useOnScreen(ref);

    const { data, error, mutate, size, setSize, isValidating } = useSWRInfinite(
        (...args) => getKey(...args, guild?.id as string, PAGE_SIZE, sort),
        (url) => fetch(url).then(r => r.json()),
        {
            revalidateFirstPage: true,
        }
    )
    const users = data ? [].concat(...data) : [];
    const isLoadingInitialData = !data && !error;
    const isLoadingMore =
        isLoadingInitialData ||
        (size > 0 && data && typeof data[size - 1] === 'undefined');
    const isEmpty = data?.length === 0;
    const isReachingEnd = size === PAGE_SIZE;
    const isRefreshing = isValidating && data && data.length === size;

    const updateSort = (key: string) => {
        // console.log("updating sort...");
        if (sort.key === key) {
            // flip sort order
            setSort({ key, order: sort.order === "desc" ? "asc" : "desc" });
        } else {
            setSort({ key, order: "desc" });
        }
        setSize(0);
        mutate()
    }

    useEffect(() => {
        if (isVisible && !isReachingEnd && !isRefreshing) {
            setSize(size + 1);
        }
    }, [isVisible, isRefreshing]);
    
    return <Table>
        <TableHeader>
            <TableRow>  
                <TableHead className="w-[100px]">
                    <Button className="flex flex-row dark:text-white/50 bg-transparent hover:bg-transparent" onClick={() => updateSort("display_name")}>
                        <span>Name</span>
                        {sort.key === "display_name" && (
                            sort.order === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
                        )}
                    </Button>
                </TableHead>
                <TableHead>
                    {/* joined */}
                    <Button className="flex flex-row dark:text-white/50 bg-transparent hover:bg-transparent" onClick={() => updateSort("ts")}>
                        <span>Joined at</span>
                        {sort.key === "ts" && (
                            sort.order === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
                        )}
                    </Button>
                </TableHead>
                <TableHead>
                    {/* Age */}
                    <Button className="flex flex-row dark:text-white/50 bg-transparent hover:bg-transparent" onClick={() => updateSort("created_at")}>
                        <span>Created at</span>
                        {sort.key === "created_at" && (
                            sort.order === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
                        )}
                    </Button>
                </TableHead>
                <TableHead>
                    {/* Invite Link */}
                    <Button className="flex flex-row dark:text-white/50 bg-transparent hover:bg-transparent" onClick={() => updateSort("code_used")}>
                        <span>Invite Link</span>
                        {sort.key === "code_used" && (
                            sort.order === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
                        )}
                    </Button>
                </TableHead>
                <TableHead className="text-right">
                    <Button className="flex flex-row dark:text-white/50 bg-transparent hover:bg-transparent" onClick={() => updateSort("join_type")}>
                        <span>Method</span>
                        {sort.key === "join_type" && (
                            sort.order === "asc" ? <ChevronUpIcon /> : <ChevronDownIcon />
                        )}
                    </Button>
                </TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {users.map((user: any) => (
                <TableRow key={user.username} className={`hover:text-transparent bg-clip-text bg-gradient-to-r ${classify(user.join_type)}`}>
                    <TableCell className="font-medium flex flex-col md:flex-row gap-4">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={`@${user.display_name}`} />
                            <AvatarFallback>
                                {user.display_name.slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.display_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            @{user?.username}
                        </p>
                    </div></TableCell>
                    <TableCell>{formatDistance(new Date(parseInt(user.ts) * 1000), new Date())} ago</TableCell>
                    <TableCell>{formatDistance(parse(user.created_at, 'yyyy-MM-dd', new Date()), new Date())} ago</TableCell>
                    <TableCell>{user.code_used || "N/A"}</TableCell>
                    <TableCell className={`text-right`}>{user.join_type}</TableCell>
                </TableRow>
            ))}
                {isLoadingMore ? (
                    // 5 rows of skeleton loaders
                    Array.from({ length: 5 }, (_, i) => (
                        <TableRow key={i}>
                            <TableCell>
                                {/* avatar skeleton */}
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div className="flex flex-col space-y-1">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell className={"justify-end"}>
                                <Skeleton className="h-4 w-24" />
                            </TableCell>
                        </TableRow>
                    ))
            ) : ""}
            <TableRow ref={ref}>
                {isReachingEnd ? (
                    <TableCell colSpan={5} className="text-center">
                        <p className="text-sm text-muted-foreground">No more users to load</p>
                    </TableCell>
                ) : (
                        <TableCell colSpan={5} className="text-center">
                            <p className="text-sm text-muted-foreground">scroll to load more</p>
                        </TableCell>
                    )
                }
            </TableRow>
        </TableBody>
    </Table>;
};

export default Analytics;