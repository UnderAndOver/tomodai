const {
  createAudioPlayer,
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");

const audioPlayers = new Map();

/*
  Name: joinVoice(Object interaction)
  Description: Joins the sender's voice channel, creating an audio player if needed
  Returns: None
*/
module.exports.joinVoice = (interaction) => {
  const channel = interaction.member.voice.channel;
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guildId,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  entersState(connection, VoiceConnectionStatus.Ready, 5000)
    .then(() => {
      interaction.reply("Joined voice channel!").catch(console.error);

      if (!audioPlayers.has(interaction.guildId)) {
        const player = createAudioPlayer();
        audioPlayers.set(interaction.guildId, player);
        connection.subscribe(player);
      }
    })
    .catch((error) => {
      connection.destroy();
      interaction.reply("Failed to join voice channel!").catch(console.error);
      console.error(error);
    });
};

/*
  Name: leaveVoice(Object interaction)
  Description: Leaves the voice channel and destroys the connection
  Returns: None
*/
module.exports.leaveVoice = (interaction) => {
  const connection = getVoiceConnection(interaction.guildId);
  if (!connection) {
    interaction
      .reply("I'm not connected to a voice channel! Use `/join` to join.")
      .catch(console.error);
    return;
  }

  connection.destroy();
  audioPlayers.delete(interaction.guildId);
  interaction.reply("Left voice channel! See you later!").catch(console.error);
};
