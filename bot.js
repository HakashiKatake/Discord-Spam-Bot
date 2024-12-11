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

    if (message.content.startsWith('!ban')) {
        const user = message.mentions.users.first();
        if (!user) return message.reply('Mention someone to ban!');
        message.channel.send(`🚨 ${user.tag} is being banned... 🚨`)
            .then(() => setTimeout(() => message.channel.send(`Actually, just kidding! 😂`), 3000));
    }

    const echoUsers = new Map();

    if (message.content.startsWith('!say')) {
    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention someone to echo!');
    if (echoUsers.has(user.id)) {
        echoUsers.delete(user.id);
        return message.reply(`Stopped echoing ${user.tag}.`);
    }
    echoUsers.set(user.id, Date.now());
    message.reply(`Started echoing ${user.tag}!`);
    }

    client.on('messageCreate', msg => {
    if (echoUsers.has(msg.author.id)) {
        const startTime = echoUsers.get(msg.author.id);
        if (Date.now() - startTime > 60000) { // Stops after 1 minute
            echoUsers.delete(msg.author.id);
        } else {
            msg.channel.send(msg.content); // Echoes the message
        }
    }
    });

    const flipText = (text) => {
        const chars = {
            a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ı', 
            j: 'ɾ', k: 'ʞ', l: 'ʃ', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
            s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
            A: '∀', B: '𐐒', C: 'Ɔ', D: '◖', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I',
            J: 'ſ', K: '⋊', L: '⅃', M: 'W', N: 'ᴎ', O: 'O', P: 'Ԁ', Q: 'Ὁ', R: 'ᴚ',
            S: 'S', T: '⊥', U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z', 
            1: 'Ɩ', 2: 'ᄅ', 3: 'Ɛ', 4: 'ㄣ', 5: 'ϛ', 6: '9', 7: 'ㄥ', 8: '8', 9: '6', 0: '0',
            '.': '˙', ',': "'", "'": ',', '"': ',', '_': '‾', '&': '⅋', '?': '¿', '!': '¡',
        };
        return text.split('').reverse().map(c => chars[c] || c).join('');
    };
    
    if (message.content.startsWith('!invert')) {
        const args = message.content.split(' ').slice(1);
        const user = message.mentions.users.first();
        if (!user || args.length < 2) return message.reply('Usage: !invert <@user> <message>');
        const invertedMessage = flipText(args.slice(1).join(' '));
        user.send(`🔄 ${invertedMessage}`)
            .then(() => message.reply(`Inverted the message for ${user.tag}!`))
            .catch(err => message.reply('Could not send the inverted message.'));
    }
    

    
});

// Log in the bot
client.login(process.env.DISCORD_TOKEN);

