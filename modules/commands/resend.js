const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "resend",
  version: "2.0.0",
  hasPermssion: 1,
  credits: "hoanle",
  description: "Xem lại tin nhắn bị gỡ (có thể bật/tắt)",
  commandCategory: "group",
  usages: "resend on / off",
  cooldowns: 0
};

const dataPath = path.join(__dirname, "resendSetting.json");
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));

const logMessage = new Map();

module.exports.handleEvent = async ({ event, api, Users }) => {
  const { messageID, senderID, threadID, type, body, attachments } = event;

  // Bỏ qua nếu bot gửi hoặc chưa bật
  const settings = JSON.parse(fs.readFileSync(dataPath));
  if (!settings[threadID]) return;
  if (type !== "message_unsend" && type !== "message") return;

  if (type === "message") {
    logMessage.set(messageID, {
      senderID,
      body,
      attachments
    });
    return;
  }

  // Tin bị gỡ
  const data = logMessage.get(messageID);
  if (!data) return;

  const name = (await Users.getNameUser(data.senderID)) || "Người dùng";
  let msg = `🔁 ${name} vừa gỡ một tin nhắn:\n`;
  if (data.body) msg += `📨 Nội dung: ${data.body}\n`;

  const files = [];
  if (data.attachments?.length > 0) {
    for (let i = 0; i < data.attachments.length; i++) {
      const fileURL = data.attachments[i].url;
      const ext = path.extname(fileURL).split("?")[0] || ".jpg";
      const filePath = path.join(__dirname, "cache", `resend_${Date.now()}_${i}${ext}`);

      const res = await axios.get(fileURL, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, Buffer.from(res.data, "utf-8"));
      files.push(fs.createReadStream(filePath));
    }
  }

  api.sendMessage(
    {
      body: msg.trim(),
      attachment: files
    },
    threadID,
    () => files.forEach(f => fs.unlinkSync(f.path))
  );
};

module.exports.run = async ({ api, event, args }) => {
  const { threadID, messageID } = event;
  const settings = JSON.parse(fs.readFileSync(dataPath));

  const state = args[0]?.toLowerCase();
  if (!["on", "off"].includes(state)) {
    return api.sendMessage("⚠️ Vui lòng dùng: resend on / resend off", threadID, messageID);
  }

  if (state === "on") {
    settings[threadID] = true;
    fs.writeFileSync(dataPath, JSON.stringify(settings, null, 2));
    return api.sendMessage("✅ Đã bật resend (theo dõi tin nhắn bị gỡ).", threadID, messageID);
  } else {
    delete settings[threadID];
    fs.writeFileSync(dataPath, JSON.stringify(settings, null, 2));
    return api.sendMessage("⛔ Đã tắt resend tại nhóm này.", threadID, messageID);
  }
};
