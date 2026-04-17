const axios = require("axios");
const fs = require("fs-extra");
const FormData = require("form-data");
const path = require("path");

module.exports.config = {
  name: "catbox",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Hoàn Lê",
  description: "Tải file ảnh/video lên catbox.moe",
  commandCategory: "Tiện ích",
  usages: "reply video hoặc ảnh",
  cooldowns: 5,
};

module.exports.run = async function ({ api, event }) {
  const { messageReply, threadID, messageID } = event;

  if (
    !messageReply ||
    !messageReply.attachments ||
    messageReply.attachments.length === 0
  ) {
    return api.sendMessage(
      "Vui lòng reply 1 file ảnh hoặc video.",
      threadID,
      messageID
    );
  }

  const attachment = messageReply.attachments[0];
  const url = attachment.url;
  const ext = path.extname(url).split("?")[0] || ".mp4"; // lấy đuôi file
  const fileName = `cache/catbox_${Date.now()}${ext}`;

  try {
    // Tải file về
    const res = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(fileName, res.data);

    // Tạo form gửi lên catbox
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(fileName));

    // Gửi POST request lên catbox
    const upload = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    // Xóa file sau khi upload xong
    fs.unlinkSync(fileName);

    const catboxURL = upload.data.trim();
    if (catboxURL.startsWith("https://")) {
      return api.sendMessage(
        `File đã được upload:\n🔗 ${catboxURL}`,
        threadID,
        messageID
      );
    } else {
      return api.sendMessage(
        `Upload thất bại: ${catboxURL}`,
        threadID,
        messageID
      );
    }
  } catch (err) {
    console.error("Lỗi:", err);
    return api.sendMessage(
      `Lỗi upload file: ${err.message}`,
      threadID,
      messageID
    );
  }
};
