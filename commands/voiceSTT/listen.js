"use strict";
const { SlashCommandBuilder } = require("@discordjs/builders");
const { getVoiceConnection, EndBehaviorType } = require("@discordjs/voice");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("listen")
    .setDescription("Listen to voice chat"),
  category: "voiceSTT",
  async execute({ client, interaction }) {
    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      interaction
        .reply("I'm not connected to a voice channel! Use `/join` to join.")
        .catch(console.error);
      return;
    }
    const receiver = connection.receiver;
    const speakerMap = receiver.speaking;

    speakerMap.on("start", (userId) => {
      const user = client.users.cache.get(userId);
      console.log(user.username + " started speaking");

      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 500,
        },
      });

      audioStream.on("end", async () => {
        console.log(user.username + " stopped speaking");
      });
    });

    await interaction.reply("Listening to voice chat");
  },
};
