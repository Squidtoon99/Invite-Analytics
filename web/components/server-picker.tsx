"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { useGuild } from "@/lib/state";
import { cn } from "@/lib/utils";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { APIGuild } from "discord-api-types/v9";
import useSWR from "swr";
import { usePathname, useRouter } from "next/navigation";
import { useHookstate } from "@hookstate/core";
import { useEffect } from "react";
import { useSearchParams } from 'next/navigation';
type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>;

interface GuildSwitcherProps extends PopoverTriggerProps { }

interface Guild extends APIGuild {
    manage_server: boolean;
    bot_exists: boolean;
}

export default function GuildSwitcher({ className }: GuildSwitcherProps) {
    const [open, setOpen] = React.useState(false);
    const [showNewGuildDialog, setShowNewGuildDialog] = React.useState(false);

    
    const searchParams = useSearchParams()!;
    const pathname = usePathname();
    const router = useRouter();
    const { data: guilds, error, isLoading } = useSWR<Guild[]>("/api/user/guilds", {
        // default data is empty array
        fallbackData: [],
        fetcher: (url) => fetch(url).then((res) => res.json().then((data) => data.guilds)),
    });


    const setGuild = (guild: APIGuild) => {
        const params = new URLSearchParams(searchParams);
        params.set("g", guild.id);
        router.push(pathname + "?" + params.toString());
    }

    const guild_id = useGuild();
    const current_guild = guild_id ? guilds?.find((g: Guild) => parseInt(g.id) === parseInt(guild_id.id)) : guild_id;
    console.log("current: ", current_guild);
    useEffect(() => {
        // console.log("use effect fot!")
        if (guilds?.length === 0) {
            return;
        }

    
        let suggested_guild = guilds?.sort((a: Guild, b: Guild) => b.permissions - a.permissions).find((g: Guild) => g.bot_exists); // @ts-ignore
        if ((!guilds || (current_guild === null && suggested_guild === undefined))) {
            setOpen(false);
            setShowNewGuildDialog(true);
        } else if (suggested_guild !== undefined && current_guild === null) {
            // console.log("SET");
            setGuild(suggested_guild);
        }
    }, [guilds?.length])
    if (isLoading || error) {
        // skeleton loader
        return (
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-label="Select a guild"
                className={cn("w-[200px] justify-between", className)}
                disabled={true}
            >
                <Skeleton className="w-5 h-5 mr-2 rounded-lg" />
                <Skeleton className="w-24 h-5 rounded-lg" />
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
        )
    }
    

    return (
        <Dialog open={showNewGuildDialog} onOpenChange={setShowNewGuildDialog}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="Select a guild"
                        className={cn("w-[200px] justify-between", className)}
                    >
                        <Avatar className="mr-2 h-5 w-5">
                            <AvatarImage
                                // guild icon url discord
                                src={current_guild?.icon !== null ? `https://cdn.discordapp.com/icons/${current_guild?.id}/${current_guild?.icon}.png` : `https://avatar.vercel.sh/${current_guild?.id}.png`}
                                alt={""}
                            />
                            
                            <AvatarFallback>
                                {/* The first character of the first 3 words in the guild name */}
                                {current_guild?.name
                                    .split(" ")
                                    .slice(0, 3)
                                    .map((word) => word[0])
                                    .join("")}
                            </AvatarFallback>
                        </Avatar>
                        {current_guild?.name.slice(0, 17)}
                        <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandList>
                            <CommandInput placeholder="Search servers..." />
                            <CommandEmpty>No guild found.</CommandEmpty>
                            <CommandGroup className="mt-2" heading="Current Servers">
                                {(guilds || []).filter((g: any) => g.bot_exists).map((guild) => (
                                    <CommandItem
                                        key={guild.id}
                                        onSelect={() => {
                                            setGuild(guild);
                                            setOpen(false);
                                        }}
                                        className="text-sm"
                                    >
                                        <Avatar className="mr-2 h-5 w-5">
                                            <AvatarImage
                                                src={guild.icon !== null ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : `https://avatar.vercel.sh/${guild.id}.png`}
                                                alt={""}
                                            />
                                            <AvatarFallback>SC</AvatarFallback>
                                        </Avatar>
                                        {guild.name.slice(0, 17)}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                current_guild?.id === guild.id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandGroup heading="New Servers">
                            {(guilds || []).filter((g: any) => !g.bot_exists && g.manage_server as boolean).map((guild) => (
                                    <CommandItem
                                        key={guild.id}
                                    onSelect={() => {
                                        router.push(`https://discord.com/oauth2/authorize?client_id=876155268668342026&scope=bot%20applications.commands&guild_id=${guild.id}&response_type=code&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_ADDRESS + "/dashboard?" + new URLSearchParams({g: guild.id}))}&prompt=none`)
                                    }}
                                        className="text-sm"
                                    >
                                        <Avatar className="mr-2 h-5 w-5">
                                            <AvatarImage
                                            src={guild.icon !== null ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : `https://avatar.vercel.sh/${guild.id}.png`}
                                                alt={""}
                                            />
                                            <AvatarFallback>SC</AvatarFallback>
                                        </Avatar>
                                        {guild.name.slice(0, 17)}
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                current_guild?.id === guild.id
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                        <CommandSeparator />
                        <CommandList>
                            <CommandGroup>
                                <DialogTrigger asChild>
                                    <CommandItem
                                        onSelect={() => {
                                            setOpen(false);
                                            setShowNewGuildDialog(true);
                                        }}
                                    >
                                        <PlusCircle className="mr-2 h-5 w-5" />
                                        Add Server
                                    </CommandItem>
                                </DialogTrigger>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <DialogContent onSubmit={(e) => {
                e.preventDefault();
                // console.log("smh: ", e);
            }}>
                <DialogHeader>
                    <DialogTitle>Add Server</DialogTitle>
                    <DialogDescription>
                        Add a new guild to implement invites for a new server.
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <div className="space-y-4 py-2 pb-4">
                        <div className="space-y-2">
                            <Label htmlFor="plan">Select Server</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a server" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(guilds || []).filter((g) => !g.bot_exists && g.manage_server).map((guild) => {
                                        return (
                                            <SelectItem key={guild.id} value={guild.id}>
                                                {guild.name}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewGuildDialog(false)}>
                        Cancel
                    </Button>
                    <Button type="submit">Continue</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}