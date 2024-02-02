"use client";

import { Search } from "@/components/search";
import GuildSwitcher from "@/components/server-picker";
import { UserNav } from "@/components/user-nav";
import {MainNav} from "@/components/main-nav";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { TabsContent } from "@radix-ui/react-tabs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';

const Analytics = dynamic(() => import('@/app/dashboard/sections/Analytics'));
const Overview = dynamic(() => import('@/app/dashboard/sections/Overview'));
const Configuration = dynamic(() => import('@/app/dashboard/sections/Configuration'));

const Page = async () => {
    return <div className="flex-col md:flex">
        <div className="border-b">
            <div className="flex h-16 items-center px-4">
                <GuildSwitcher />
                <MainNav className="mx-6" />
                <div className="ml-auto flex items-center space-x-4">
                    <Search />
                    <UserNav />
                </div>
            </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    <CalendarDateRangePicker/>
                </div>
            </div>
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview" className="space-y-4">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="space-y-4">
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="configuration" className="space-y-4">
                        Configuration
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <Overview />
                </TabsContent>
                <TabsContent value="analytics">
                    <Analytics />
                </TabsContent>
                <TabsContent value="configuration">
                    <Configuration />
                </TabsContent>
            </Tabs>
        </div>
    </div>;
};

export default Page;