const { BOT_TOKEN } = require("./config.json");
const ytdl = require("ytdl-core");
const discord = require('discord.js');
const client = new discord.Client();
const queue = new Map();
const YouTube = require('youtube-sr')

let nameVideo = "";
let urlYoutube;
let serverQueue;
let prefixos = []
let djs = []
let queueContructs = []

client.once("ready", () => {
    console.log("Bot ligado!");
    client.guilds.cache.map(guild => prefixos[guild.id] = "!")
    client.user.setPresence({ activity: { name: 'Desenvolvido por Gabriel Aparecido.' }, status: 'online' })
});

client.on("guildCreate", guild => {
    prefixos[guild.id] = "!"

})

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefixos[message.guild.id])) return;
    serverQueue = queue.get(message.guild.id);
    const args = message.content.split(" ");
    if (message.content.startsWith(`${prefixos[message.guild.id]}play`)) {
        nameVideo = ""
        for (let i = 1; i < args.length; i++) {
            nameVideo += args[i] + " ";
        }
        if(nameVideo.search("list")!= -1){
            YouTube.getPlaylist(nameVideo).then(x => {
                executePlaylist(message, serverQueue, x);
            })
            return;
        }else{
            YouTube.search(nameVideo, { limit: 1 }).then(x => {
                execute(message, serverQueue, x[0].id, x[0].title);
            })
            return;
        }
    } else if (message.content.startsWith(`${prefixos[message.guild.id]}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefixos[message.guild.id]}disconnect`) || message.content.startsWith(`${prefixos[message.guild.id]}disc`) || message.content.startsWith(`${prefixos[message.guild.id]}d`)) {
        disconnect(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefixos[message.guild.id]}queue`)) {
        listQueue(message)
        return;
    } else if (message.content.startsWith(`${prefixos[message.guild.id]}pause`)) {
        pause(message)
        return;
    } else if (message.content.startsWith(`${prefixos[message.guild.id]}unpause`)) {
        unpause(message)
        return;
    } else if (message.content.startsWith(`${prefixos[message.guild.id]}help`)) {
        help(message)
        return;
    } else if (message.content.startsWith(`${prefixos[message.guild.id]}prefix`)) {
        changePrefix(message, args[1])
        return;
    }
});


async function executePlaylist(message, serverQueue, videosPlaylist) {
    urlYoutube = "https://www.youtube.com/watch?v="
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send("Você precisa estar em um canal de voz!");

    const permissions = voiceChannel.permissionsFor(message.client.user);

    if (!permissions.has("CONNECT"))
        return message.channel.send("Eu preciso de permissão para conectar no canal!");
    if (!permissions.has("SPEAK"))
        return message.channel.send("Eu preciso de permissão para falar no canal!");

    let song = []

    for(let i = 0 ; i < videosPlaylist.videos.length; i++){
        let songTemp = {
            url: urlYoutube+videosPlaylist.videos[i].id,
            title: videosPlaylist.videos[i].title
        }
        song.push(songTemp)
    }
    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queueContructs[message.guild.id] = queueContruct
        queue.set(message.guild.id, queueContructs[message.guild.id]);

        for(let i = 0; i < song.length; i++){
            queueContructs[message.guild.id].songs.push(song[i]);
        }
        try {
            var connection = await voiceChannel.join();
            queueContructs[message.guild.id].connection = connection;
            play(message.guild, queueContructs[message.guild.id].songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} foi adicionado na lista!`);
    }
}





async function execute(message, serverQueue, idVideo, titleVideo) {
    urlYoutube = "https://www.youtube.com/watch?v="+idVideo
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send("Você precisa estar em um canal de voz!");

    const permissions = voiceChannel.permissionsFor(message.client.user);

    if (!permissions.has("CONNECT"))
        return message.channel.send("Eu preciso de permissão para conectar no canal!");
    if (!permissions.has("SPEAK"))
        return message.channel.send("Eu preciso de permissão para falar no canal!");

    const song = {
        title: titleVideo,
        url: urlYoutube,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queueContructs[message.guild.id] = queueContruct
        queue.set(message.guild.id, queueContructs[message.guild.id]);
        queueContructs[message.guild.id].songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueContructs[message.guild.id].connection = connection;
            play(message.guild, queueContructs[message.guild.id].songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} foi adicionado na lista!`);
    }
}







function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.reply("Você precisar estar no canal de voz para pular a música!");
    if (!serverQueue)
        return message.reply("Nenhuma música está tocando!");
    djs[message.guild.id].end();
}

function disconnect(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.reply("Você precisar estar no canal de voz para parar a música!");
    djs[message.guild.id].end();
    queueContructs[message.guild.id].songs = [];
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    let dj = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dj.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Tocando: **${song.title}**`);
    djs[guild.id] = dj
}

function listQueue(message) {

    if (!queueContructs[message.guild.id] || queueContructs[message.guild.id].songs.length == 0){
        message.reply("Não tem nenhuma música na lista de música");
        return;
    }

    let answer = "As músicas na lista são:\n";
    for (let i = 1; i < queueContructs[message.guild.id].songs.length; i++) {
        answer += queueContructs[message.guild.id].songs[i].title + '\n';
    }
    message.reply(answer);
}

function pause(message) {
    if (!message.member.voice.channel) {
        return message.reply("Você precisar estar no canal de voz para parar a música!");
    }
    djs[message.guild.id].pause();
}

function unpause(message) {
    if (!message.member.voice.channel) {
        return message.reply("Você precisar estar no canal de voz para retomar a música!");
    }
    djs[message.guild.id].resume()
}





function help(message) {
    message.reply(`Os comandos são:
   ${prefixos[message.guild.id]}play (Nome ou Link da música) - Para tocar uma música.
   ${prefixos[message.guild.id]}pause - Para pausar uma música.
   ${prefixos[message.guild.id]}unpause - Para retomar a música pausada.
   ${prefixos[message.guild.id]}skip - Para pular a música atual.
   ${prefixos[message.guild.id]}queue - Para listar as músicas em sequência.
   ${prefixos[message.guild.id]}d ou ${prefixos[message.guild.id]}disc ou ${prefixos[message.guild.id]}disconnect - Para desconectar o bot.
   ${prefixos[message.guild.id]}prefix (Novo Prefixo) - Para trocar o prefixo.`)
}

function changePrefix(message, newPrefix) {
    prefixos[message.guild.id] = newPrefix
    message.reply(`Prefixo alterado para ${prefixos[message.guild.id]}`)
}

client.login(BOT_TOKEN);