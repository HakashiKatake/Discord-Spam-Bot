const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Enables reading message content
    ],
});



// Command to start spamming
let spammingIntervals = new Map(); // To keep track of active spamming tasks

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');

    if (args[0] === '!start') {
        if (args.length < 3) {
            message.channel.send('Usage: `!start <@user> <message>`');
            return;
        }

        const targetUserMention = args[1];
        const spamMessage = args.slice(2).join(' '); // Combine remaining args as the message
        const targetUserId = targetUserMention.replace(/[<@!>]/g, ''); // Extract user ID

        const targetUser = await client.users.fetch(targetUserId).catch(() => null);

        if (!targetUser) {
            message.channel.send('Could not find the specified user.');
            return;
        }

        if (spammingIntervals.has(targetUserId)) {
            message.channel.send('Already spamming this user!');
            return;
        }

        message.channel.send(`Starting spam for ${targetUser.tag}`);

        // Start spamming
        const intervalId = setInterval(() => {
            targetUser.send(spamMessage).catch((error) => {
                console.error('Failed to send DM:', error);
                clearInterval(intervalId);
                spammingIntervals.delete(targetUserId);
            });
        }, 3000); // Send a DM every 3 seconds

        spammingIntervals.set(targetUserId, intervalId);
    }

    if (args[0] === '!stop') {
        if (args.length < 2) {
            message.channel.send('Usage: `!stop <@user>`');
            return;
        }

        const targetUserMention = args[1];
        const targetUserId = targetUserMention.replace(/[<@!>]/g, '');

        if (!spammingIntervals.has(targetUserId)) {
            message.channel.send('No spam session found for this user.');
            return;
        }

        clearInterval(spammingIntervals.get(targetUserId));
        spammingIntervals.delete(targetUserId);
        message.channel.send(`Stopped spam for <@${targetUserId}>.`);
    }
});

// Log in the bot
client.login(process.env.DISCORD_TOKEN);

