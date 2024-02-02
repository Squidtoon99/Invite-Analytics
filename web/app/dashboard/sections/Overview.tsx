import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, UserCheck, UserPlus, Users } from "lucide-react";
import { RecentUsers } from "@/components/recent-users";
import { OverviewGraph } from "@/components/overview-graph";
import {useGuild} from "@/lib/state";
import { Skeleton } from "@/components/ui/skeleton";
import {formatDistance} from "date-fns";
import useSWR from "swr";

const TotalMembersCard = ({ guild }: { guild: { id: string; } | null }) => {
    const { data, isLoading, error } = useSWR(`/api/guilds/${guild?.id}/stats/total-members`, {
        fallbackData: { current: "", past: "", diff: 1 }
    });

    if (isLoading || error || !guild) {
        return <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
        </Card>;
    }
    return <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{Intl.NumberFormat('en-US', {
                notation: "compact",
                maximumFractionDigits: 2
            }).format(data.current)}</div>
            <p className="text-xs text-muted-foreground">
                {data.current >= data.past && "+"}{data.current - data.past} from {formatDistance(new Date(), data?.diff ? new Date(data.diff) : new Date())} ago
            </p>
        </CardContent>
    </Card>;
}

const MostRecentMetric = ({ guild }: { guild: { id: string; } | null; }) => {
    const { data, isLoading, error } = useSWR(`/api/guilds/${guild?.id}/stats/most-recent-metric`, {
        fallbackData: { data: {join_type: "Loading...", ts:1 }}
    });

    if (isLoading || error || !data || !guild) {
        return <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Most Recent Metric
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
        </Card>
    }
    return <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                Most Recent Metric
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{data?.data?.join_type || "N/A"}</div>
            <p className="text-xs text-muted-foreground">
                activated {formatDistance(new Date(), data?.data ? new Date(data?.data?.ts * 1000) : new Date())} ago
            </p>
        </CardContent>
    </Card>
}
const BestMetric = ({ guild }: { guild: { id: string; } | null}) => {
    const { data, isLoading, error } = useSWR(`/api/guilds/${guild?.id}/stats/best-metric`, {
        fallbackData: { metric: "Loading...", hits: "N/A" }
    });

    if (isLoading || error || !data || !guild) {
        return <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Best Metric
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
        </Card>
    }
    return <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Metric</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{(data?.metric || "N/A").toLowerCase().replace(/\b\S/g, function (t: string) { return t.toUpperCase(); })}</div>
            <p className="text-xs text-muted-foreground">
                +{data?.hits || 0} new members
            </p>
        </CardContent>
    </Card>;
}

const ChurnRate = ({ guild }: { guild: { id: string; } | null}) => {
    const { data, isLoading, error } = useSWR(`/api/guilds/${guild?.id}/stats/churn-rate`, {
        fallbackData: { current: 0, past: 0 }
    });

    if (isLoading || error || !guild) {
        return <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Retention
                </CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="gap-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
        </Card>
    }
    return <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{data?.rate > 0 && "+"}{data?.rate || 0}%</div>
            <p className="text-xs text-muted-foreground">Calculated from joined / left</p>
        </CardContent>
    </Card>;
}

const Overview = () => {
    const guild = useGuild();
    return <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TotalMembersCard guild={guild} />
        <ChurnRate guild={guild} />
        <BestMetric guild={guild} />
        <MostRecentMetric guild={guild} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <OverviewGraph />
                </CardContent>
            </Card>
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>
                        The newest users in your server
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RecentUsers />
                </CardContent>
            </Card>
        </div>
    </div>;
};

export default Overview;