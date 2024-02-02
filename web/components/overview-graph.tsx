"use client";

import { current_guild } from "@/lib/state";
import { useHookstate } from "@hookstate/core";
import { format } from "date-fns";
import { useGuild } from "@/lib/state";
import {LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import useSWR from "swr";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-md shadow-md p-2">
                <p className="text-sm">{format(new Date(label), "h:mm a")}</p>
                <p className="text-sm">{parseInt(payload[0].value).toLocaleString()} members</p>
            </div>
        );
    }

    return null;
};

export function OverviewGraph() {
    // rewrite the raw data into processed
    // data that the chart can use
    const guild = useGuild();
    let {
        data,
        isLoading,
        error
    } = useSWR(`/api/guilds/${guild?.id}/analytics`, {
        fallbackData: { data: [] },
    });

    let processed_data: {time: string; value: string;}[] = [];
    if (!isLoading && !error && data?.data !== undefined) {
        processed_data = Object.entries(data?.data).map(([_, [date, total]]) => ({
            time: date,
            value: total
        }));
    }


    // console.log("processed: ", processed_data);
    return (
        <ResponsiveContainer width="95%" height={350}>
            <LineChart data={processed_data}>
                <XAxis
                    dataKey="time"
                    stroke="#FFFFFF"
                    domain={['auto', 'auto']}
                    fontSize={12}
                    tickFormatter={(tick) => {
                        if (tick === "auto") {
                            return tick;
                        }
                        return format(new Date(tick), "M/d")
                    }}
                    tickLine={false}
                    axisLine={false}
                    
                />
                <YAxis
                    stroke="#FFFFFF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(tick) => {
                        return Intl.NumberFormat('en-US', {
                            notation: "compact",
                            maximumFractionDigits: 1
                        }).format(parseFloat(tick));
                    }}
                    scale="log"
                    domain={['auto', 'auto']}
                />
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <Tooltip
                    content={<CustomTooltip/>}
                />
                <Line
                    dataKey="value" fill="#000" stroke="#FFFFFF" type="natural" />
            </LineChart>
        </ResponsiveContainer>
    );
}