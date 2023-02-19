import { Client, Events, GatewayIntentBits } from "discord.js";
import { setPresence } from "./setPresence.js";

export const main = () => {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    });

    client.on(Events.ClientReady, c => {
        console.log(`Client ready, tag ${c.user.tag}\n\rInvite link: https://discord.com/api/oauth2/authorize?client_id=${c.user.id}&permissions=8&scope=bot%20applications.commands`);

        setPresence(c);
    });

    client.on(Events.MessageCreate, async message => {
        if (message.author.bot || message.author.system)
            return;
        if (message.channel?.name.toLowerCase() === "github")
            return;

        // repo=[YimMenu]
        let repo = message.content.match(/repo=\[([a-zA-Z0-9-_]+)\]/)?.[1]
        if (!repo) repo = "YimMenu";

        // commit[HEAD]
        const commits = [...message.content.matchAll(/commit=\[([a-zA-Z0-9\.~_-/]+)\]!?/g)].map(x => {
            return { hash: x[1], inline: x[0].endsWith("!") }
        })

        /**
         * There can only be one thread per message.
         * @type string?
         */
        let active_thread;
        if (commits.length) {
            const commit_links = []

            for (const commit of commits) {
                const response = await fetch(`https://api.github.com/repos/YimMenu/${repo}/${commit.hash.includes(".") ? "compare" : "commits"}/${commit.hash}`);
                if (!response.ok)
                    continue;

                const commit_info = await response.json();
                commit_links.push({
                    url: `<${commit_info?.html_url}>`,
                    inline: commit.inline
                });
            }

            if (commit_links.length) {
                const inline_commits = commit_links.filter(x => x.inline).map(x => x.url)
                const thread_commits = commit_links.filter(x => !x.inline).map(x => x.url)

                if (inline_commits.length) {
                    message.reply(`Linked Commits\n- ${inline_commits.join('\n- ')}`)
                }

                if (thread_commits.length) {
                    active_thread = await message.startThread({
                        name: 'Linked Commits'
                    });
                    active_thread.send({ content: `- ${thread_commits.join('\n- ')}` });
                }
            }
        }

        const gitTags = message.content.match(/#[1-9]\d*\b!?/gm)?.map(tag => {
            return { id: parseInt(tag.substring(1)), inline: tag.endsWith("!") }
        }).filter(x => x.id !== NaN);
        if (!gitTags || gitTags.length === 0)
            return;

        const issues = [];
        for (const tag of gitTags) {
            const response = await fetch(`https://api.github.com/repos/YimMenu/${repo}/issues/${tag.id}`);
            if (!response.ok)
                continue;

            const issue = await response.json();
            issues.push({
                url: `<${issue?.html_url}>`,
                inline: tag.inline
            });
        }

        if (issues.length) {
            const inline_issues = issues.filter(x => x.inline).map(x => x.url)
            const thread_issues = issues.filter(x => !x.inline).map(x => x.url)

            if (inline_issues.length) {
                message.reply(`Linked PR/Issues/Discussions\n- ${inline_issues.join('\n- ')}`)
            }

            if (thread_issues.length) {
                if (!active_thread) {
                    active_thread = await message.startThread({
                        name: 'Linked PR/Issues/Discussions'
                    });
                }
                active_thread.send({ content: `- ${thread_issues.join('\n- ')}` });
            }
        }
    });

    client.login(process.env.DISCORD_TOKEN);
};