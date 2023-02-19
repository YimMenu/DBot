import { Client, Events, GatewayIntentBits } from "discord.js";
import { setPresence } from "./setPresence.js";

const regex = {
    issue: /(?<repo>[a-zA-Z0-9_\-\/]+)?#(?<id>[1-9]\d*\b)(?<inline>!?)/gmi,
    repo: /repo=\[([a-zA-Z0-9\-_\/]+)\]/i,
    commit: /((?<repo>[a-zA-Z0-9_\-\/]+)#)?commit=\[(?<id>[a-zA-Z0-9\.~_\-/]+)\]!?/gi
}

/**
 * @param {string?} repo 
 * @returns {{owner: string, repo: string}}
 */
const parse_repo = (repo) => {
    if (!repo) {
        return {
            owner: "YimMenu",
            repo: "YimMenu"
        }
    }
    if (!repo.includes("/")) {
        return {
            owner: "YimMenu",
            repo
        }
    }
    const [owner, repo_name] = repo.split("/", 2);
    return {
        owner,
        repo: repo_name
    }
}

/**
 * @param {{url: string, inline: boolean}} obj 
 * @returns {{thread: string, inline: string}}
 */
const thread_inline = (obj) => {
    return {
        thread: obj.filter(x => !x.inline).map(x => x.url),
        inline: obj.filter(x => x.inline).map(x => x.url)
    }
}

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
        const repo = parse_repo(message.content.match(regex.repo)?.[1])

        // commit[HEAD]
        const commits = [...message.content.matchAll(regex.commit)].map(x => {
            return { hash: x.groups.id, inline: !!x.groups.inline, repo: x.groups.repo }
        })

        /**
         * There can only be one thread per message.
         * @type {AnyThreadChannel<boolean>}
         */
        let active_thread;
        if (commits.length) {
            /** @type {{url: string, inline: boolean}} */
            const commit_links = []

            for (const commit of commits) {
                const commit_repo = commit.repo ? parse_repo(commit.repo) : repo;
                const response = await fetch(`https://api.github.com/repos/${commit_repo.owner}/${commit_repo.repo}/${commit.hash.includes(".") ? "compare" : "commits"}/${commit.hash}`);
                if (!response.ok)
                    continue;

                const commit_info = await response.json();
                commit_links.push({
                    url: `<${commit_info?.html_url}>`,
                    inline: commit.inline
                });
            }

            if (commit_links.length) {
                const commits_thread_inline = thread_inline(commit_links)

                if (commits_thread_inline.inline.length) {
                    message.reply(`Linked Commits\n- ${commits_thread_inline.inline.join('\n- ')}`)
                }

                if (commits_thread_inline.thread.length) {
                    active_thread = await message.startThread({
                        name: 'Linked Commits'
                    });
                    active_thread.send({ content: `- ${commits_thread_inline.thread.join('\n- ')}` });
                }
            }
        }

        const gitTags = [...message.content.matchAll(regex.issue)]?.map(tag => {
            return { id: parseInt(tag.groups.id), inline: !!tag.groups.inline, repo: tag.groups.repo }
        }).filter(x => x.id !== NaN);
        if (!gitTags || gitTags.length === 0)
            return;

        /** @type {{url: string, inline: boolean}} */
        const issues = [];
        for (const tag of gitTags) {
            const tag_repo = tag.repo ? parse_repo(tag.repo) : repo;

            const response = await fetch(`https://api.github.com/repos/${tag_repo.owner}/${tag_repo.repo}/issues/${tag.id}`);
            if (!response.ok)
                continue;

            const issue = await response.json();
            issues.push({
                url: `<${issue?.html_url}>`,
                inline: tag.inline
            });
        }

        if (issues.length) {
            const issues_thread_inline = thread_inline(issues)

            if (issues_thread_inline.inline.length) {
                message.reply(`Linked PR/Issues/Discussions\n- ${issues_thread_inline.inline.join('\n- ')}`)
            }

            if (issues_thread_inline.thread.length) {
                if (!active_thread) {
                    active_thread = await message.startThread({
                        name: 'Linked PR/Issues/Discussions'
                    });
                }
                active_thread.send({ content: `- ${issues_thread_inline.thread.join('\n- ')}` });
            }
        }
    });

    client.login(process.env.DISCORD_TOKEN);
};