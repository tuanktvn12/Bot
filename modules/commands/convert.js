const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports.config = {
    name: "convert",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "hoanle",
    description: "Reply video để chuyển từ video sang âm thanh (mp3)",
    commandCategory: "Tiện ích",
    usages: "reply video",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    try {
        if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0)
            return api.sendMessage("⚠️ Vui lòng reply 1 video cần chuyển sang mp3.", event.threadID, event.messageID);

        const attachment = event.messageReply.attachments[0];
        if (attachment.type !== "video") {
            return api.sendMessage("❎ Tệp đính kèm không phải video!", event.threadID, event.messageID);
        }

        const url = attachment.url;
        const inputPath = path.join(__dirname, "cache", `input_${Date.now()}.mp4`);
        const outputPath = path.join(__dirname, "cache", `output_${Date.now()}.mp3`);

        const res = await axios.get(url, { responseType: "stream" });
        const writer = fs.createWriteStream(inputPath);
        res.data.pipe(writer);

        writer.on("finish", () => {
            ffmpeg(inputPath)
                .noVideo()
                .audioCodec("libmp3lame")
                .save(outputPath)
                .on("end", () => {
                    api.sendMessage({
                        body: "✅ Đã chuyển video sang file âm thanh:",
                        attachment: fs.createReadStream(outputPath)
                    }, event.threadID, () => {
                        // Xóa file sau khi gửi
                        fs.unlinkSync(inputPath);
                        fs.unlinkSync(outputPath);
                    }, event.messageID);
                })
                .on("error", (err) => {
                    console.error("FFMPEG error:", err);
                    api.sendMessage("❌ Lỗi khi chuyển video sang mp3.", event.threadID, event.messageID);
                });
        });

    } catch (err) {
        console.error(err);
        api.sendMessage("❌ Đã xảy ra lỗi khi xử lý video.", event.threadID, event.messageID);
    }
};
