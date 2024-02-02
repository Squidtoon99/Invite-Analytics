"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { time_range } from "@/lib/state";
import { useHookstate } from "@hookstate/core";
export function CalendarDateRangePicker({
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    const { get: getDate, set: setDate } = useHookstate(time_range);
    // console.log(getDate({ stealth: true }));
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !getDate() && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {getDate()?.from ? (
                            getDate()?.to ? (
                                <>
                                    {format(getDate().from as Date, "LLL dd, y")} -{" "}
                                    {format(getDate().to as Date, "LLL dd, y")}
                                </>
                            ) : (
                                format(getDate().from as Date, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={getDate().from}
                        selected={getDate()}
                        onSelect={(range, _a, _b, _c) => { // @ts-ignore
                            // console.log("date: ", range);
                            if (range !== undefined) { setDate(range); }
                        }}

                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}