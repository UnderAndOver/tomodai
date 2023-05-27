const { SlashCommandBuilder } = require("@discordjs/builders");
const { getVoiceConnection, EndBehaviorType } = require("@discordjs/voice");
const prism = require("prism-media");
const { Configuration, OpenAIApi } = require("openai");
const { Readable, Writable } = require("stream");
const ffmpeg = require("fluent-ffmpeg");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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
          duration: 800,
        },
      });

      const opusDecoder = new prism.opus.Decoder({
        frameSize: 960,
        channels: 2,
        rate: 48000,
      });

      const decodedBuffer = [];
      audioStream.pipe(opusDecoder).on("data", (chunk) => {
        decodedBuffer.push(chunk);
      });

      audioStream.on("end", async () => {
        console.log(user.username + " stopped speaking");
        const audioDecoded = Buffer.concat(decodedBuffer);
        const monoBuffer = convert_audio(audioDecoded);
        console.log(monoBuffer);
        await transcribe(monoBuffer);
      });
    });

    await interaction.reply("Listening to voice chat");
  },
};

function convert_audio(input) {
  try {
    const data = new Int16Array(input);
    const ndata = data.filter((el, idx) => idx % 2);
    return Buffer.from(ndata);
  } catch (e) {
    console.log(e);
    console.log("convert_audio: " + e);
    throw e;
  }
}

async function transcribe(buffer) {
  const audioReadStream = Readable.from(buffer);
  const resizedBuffer = await reduceBitrate(audioReadStream);
  const resizedStream = bufferToReadableStream(resizedBuffer, "audio.mp3");
  const {
    data: { text },
  } = await openai.createTranscription(resizedStream, "whisper-1");
  console.log(text);
  return text;
}

function reduceBitrate(inputStream) {
  return new Promise((resolve, reject) => {
    const outputChunks = [];
    ffmpeg()
      .input(inputStream)
      .inputFormat("s16le")
      .inputOptions("-ar 48000")
      .inputOptions("-ac 1")
      .audioBitrate(64)
      .format("mp3")
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(outputChunks)))
      .pipe(
        new Writable({
          write(chunk, encoding, callback) {
            outputChunks.push(chunk);
            callback();
          },
        })
      );
  });
}

function bufferToReadableStream(buffer, filename) {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
  readable.path = filename;
  return readable;
}
