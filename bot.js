require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const youtube = require('youtube-sr').default;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages
    ] 
});
const queue = new Map();

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    if (message.author.bot) return;

    if (args[0] === 'start') {
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

    if (args[0] === 'stop') {
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
    const args = message.content.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    const serverQueue = queue.get(message.guild.id);

    switch (command) {
        case 'join':
            join(message, serverQueue);
            break;
        case 'play':
            playMusic(message, args, serverQueue);
            break;
        case 'pause':
            pauseMusic(message, serverQueue);
            break;
        case 'resume':
            resumeMusic(message, serverQueue);
            break;
        case 'stop':
            stopMusic(message, serverQueue);
            break;
        case 'leave':
            leaveChannel(message, serverQueue);
            break;
        case 'queue':
            showQueue(message, serverQueue);
            break;
        default:
            message.channel.send('Unknown command.');
    }
});

// Functions for Music Commands

async function join(message, serverQueue) {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('You need to join a voice channel first!');
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
    });
    message.reply(`Joined ${channel.name}!`);
    if (!serverQueue) {
        queue.set(message.guild.id, {
            connection,
            songs: [],
            player: createAudioPlayer(),
        });
    }
}

async function playMusic(message, args, serverQueue) {
    const query = args.join(' ');
    if (!query) return message.reply('Provide a song name or YouTube URL.');
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('You need to be in a voice channel!');

    const songInfo = await youtube.searchOne(query);
    if (!songInfo) return message.reply('Could not find the song.');

    const song = {
        title: songInfo.title,
        url: `https://www.youtube.com/watch?v=${songInfo.id}`,
    };

    if (!serverQueue) {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });
        const player = createAudioPlayer();
        queue.set(message.guild.id, { connection, songs: [song], player });

        playNext(message.guild.id);

        connection.subscribe(player);
        message.reply(`Playing: **${song.title}**`);
    } else {
        serverQueue.songs.push(song);
        message.reply(`Added to queue: **${song.title}**`);
    }
}

function playNext(guildId) {
    const serverQueue = queue.get(guildId);
    if (!serverQueue || serverQueue.songs.length === 0) {
        queue.delete(guildId);
        return;
    }

    const song = serverQueue.songs.shift();
    const stream = ytdl(song.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);

    serverQueue.player.play(resource);
    serverQueue.player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
    serverQueue.connection.subscribe(serverQueue.player);
}

function pauseMusic(message, serverQueue) {
    if (!serverQueue || serverQueue.player.state.status !== AudioPlayerStatus.Playing) {
        return message.reply('No music is playing.');
    }
    serverQueue.player.pause();
    message.reply('Paused the music.');
}

function resumeMusic(message, serverQueue) {
    if (!serverQueue || serverQueue.player.state.status !== AudioPlayerStatus.Paused) {
        return message.reply('The music is not paused.');
    }
    serverQueue.player.unpause();
    message.reply('Resumed the music.');
}

function stopMusic(message, serverQueue) {
    if (!serverQueue) return message.reply('No music is playing.');
    serverQueue.songs = [];
    serverQueue.player.stop();
    message.reply('Stopped the music.');
}

function leaveChannel(message, serverQueue) {
    if (!serverQueue) return message.reply('I am not in a voice channel.');
    serverQueue.connection.destroy();
    queue.delete(message.guild.id);
    message.reply('Left the voice channel.');
}

function showQueue(message, serverQueue) {
    if (!serverQueue || serverQueue.songs.length === 0) {
        return message.reply('The queue is empty.');
    }
    const songList = serverQueue.songs.map((song, index) => `${index + 1}. ${song.title}`).join('\n');
    message.reply(`**Queue:**\n${songList}`);
}

client.login(process.env.DISCORD_TOKEN);


