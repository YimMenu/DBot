import { Client, Events, GatewayIntentBits } from "discord.js";
import { setPresence } from "./setPresence.js";

export const main = () => {
    const client = new Client({
        intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]
    });
    
    client.on(Events.ClientReady, c => {
        console.log(`Client ready, tag ${c.user.tag}\n\rInvite link: https://discord.com/api/oauth2/authorize?client_id=${c.user.id}&permissions=8&scope=bot%20applications.commands`);
    
        setPresence(c);
    });
    
    client.on(Events.MessageCreate, async message => {
        if (message.author.bot || message.author.system)
            return;
        if (message.channel?.name == "github")
            return;
        
        const gitTags = message.content.match(/#[1-9]\d*\b/gm)?.map(tag => parseInt(tag.substring(1)));
        if (!gitTags)
            return;
    
        const issues = [];
        for (const tag of gitTags) {
            const response = await fetch(`https://api.github.com/repos/YimMenu/YimMenu/issues/${tag}`);
            if (!response.ok)
                continue;
            
            const issue = await response.json();
            issues.push(`<${issue?.html_url}>`);
        }
    
        if (issues.length)
        {
            const thread = await message.startThread({
                name: 'Linked PR/Issues/Discussions'
            });
            thread.send({ content: `- ${issues.join('\n - ')}` });
        }
    });
    
    client.login(process.env.DISCORD_TOKEN);
};