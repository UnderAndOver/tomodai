const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  category: "utility",
  async execute(interaction) {
    await interaction.reply("Pong!");
  },
};
