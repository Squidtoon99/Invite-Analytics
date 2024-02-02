import { APIUser, RESTAPIPartialCurrentUserGuild } from "discord-api-types/v9";

export type User = {
    isLoggedIn: boolean;
    token?: string;
    avatarUrl?: string;
    data?: APIUser;
    guilds?: RESTAPIPartialCurrentUserGuild[];
};