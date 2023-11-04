/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { ApplicationCommandInputType, sendBotMessage, findOption, OptionalMessageOption } from "@api/Commands";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";

const settings = definePluginSettings({
    AlbumText: {
        description: "Album default prefix",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
    AristText: {
        description: "Artist default prefix",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    },
    TrackText: {
        description: "Track default prefix",
        type: OptionType.STRING,
        default: "",
        restartNeeded: false,
    }
});

interface Album {
    id: string;
    image: {
        height: number;
        width: number;
        url: string;
    };
    name: string;
}

interface Artist {
    external_urls: {
        spotify: string;
    };
    href: string;
    id: string;
    name: string;
    type: "artist" | string;
    uri: string;
}

interface Track {
    id: string;
    album: Album;
    artists: Artist[];
    duration: number;
    isLocal: boolean;
    name: string;
}

const Spotify = findByPropsLazy("getPlayerState");
const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");
const PendingReplyStore = findByPropsLazy("getPendingReply");

function sendMessage(channelId, message) {
    message = {
        // The following are required to prevent Discord from throwing an error
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    };
    const reply = PendingReplyStore.getPendingReply(channelId);
    MessageCreator.sendMessage(channelId, message, void 0, MessageCreator.getSendMessageOptionsForReply(reply))
        .then(() => {
            if (reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            }
        });
}

export default definePlugin({
    name: "SpotifyShareCommandsExtra",
    description: "Share your current Spotify track, album or artist via slash command (/track, /album, /artist) with a optinal prefix. modified version of spotifyShareCommands plugin! (MAKE SURE YOU HAVE SpotifyShareCommands DISABLED!)",
    authors: [{
        name: "AshAxolotl",
        id: BigInt(461084048337403915n),
    }],
    dependencies: ["CommandsAPI"],
    settings,
    commands: [
        {
            name: "track",
            description: "Send your current Spotify track to chat",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [OptionalMessageOption],
            execute: (opts, ctx) => {
                const track: Track | null = Spotify.getTrack();
                if (track === null) {
                    sendBotMessage(ctx.channel.id, {
                        content: "You're not listening to any music."
                    });
                    return;
                }
                if (findOption(opts, "message", "") == "") {
                    sendMessage(ctx.channel.id, {
                        content: settings.store.TrackText + " " + `https://open.spotify.com/track/${track.id}`
                    });
                    return;
                }
                // Note: Due to how Discord handles commands, we need to manually create and send the message
                sendMessage(ctx.channel.id, {
                    content: findOption(opts, "message", "") + " " + `https://open.spotify.com/track/${track.id}`
                });
            }
        },
        {
            name: "album",
            description: "Send your current Spotify album to chat",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [OptionalMessageOption],
            execute: (opts, ctx) => {
                const track: Track | null = Spotify.getTrack();
                if (track === null) {
                    sendBotMessage(ctx.channel.id, {
                        content: "You're not listening to any music."
                    });
                    return;
                }
                if (findOption(opts, "message", "") == "") {
                    sendMessage(ctx.channel.id, {
                        content: settings.store.AlbumText + " " + `https://open.spotify.com/album/${track.album.id}`
                    });
                    return;
                }
                sendMessage(ctx.channel.id, {
                    content: findOption(opts, "message", "") + " " + `https://open.spotify.com/album/${track.album.id}`
                });
            }
        },
        {
            name: "artist",
            description: "Send your current Spotify artist to chat",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [OptionalMessageOption],
            execute: (opts, ctx) => {
                const track: Track | null = Spotify.getTrack();
                if (track === null) {
                    sendBotMessage(ctx.channel.id, {
                        content: "You're not listening to any music."
                    });
                    return;
                }
                if (findOption(opts, "message", "") == "") {
                    sendMessage(ctx.channel.id, {
                        content: settings.store.AristText + " " + track.artists[0].external_urls.spotify
                    });
                    return;
                }
                sendMessage(ctx.channel.id, {
                    content: findOption(opts, "message", "") + " " + track.artists[0].external_urls.spotify
                });
            }
        }
    ]
});