import { ActivityType, Client } from "discord.js";

/**
 * @param {Client} client 
 */
export const setPresence = async (client) => {
    const response = await fetch("https://api.github.com/repos/YimMenu/YimMenu/releases");
    if (response.ok)
    {
        /**
         * @type {Array<Object>}
         */
        const body = await response.json();
        if (body.length)
        {
            const release = body.filter(val => val.assets[0].name === "YimMenu.dll")[0];
            const downloads = release.assets[0].download_count;
    
            client.user.setPresence({
                activities: [
                    { name: `${downloads} downloads on Github.`, type: ActivityType.Watching }
                ]
            });
        }
        else
        {
            client.user.setPresence({
                activities: [
                    { name: `absolutely nothing, because there's no release...`, type: ActivityType.Watching }
                ]
            });
        }
    }

    setTimeout(_ => setPresence(client), 15 * 60 * 1e3);
};