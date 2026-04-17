module.exports.config = {
  name: "prefix",
  version: "1.0",
  hasPermssion: 0,
  credits: "Hoàn Lê",
  description: "Xem prefix hiện tại kèm video",
  commandCategory: "Tiện ích",
  usages: "prefix",
  usePrefix: false,
  cooldowns: 3
};

module.exports.run = async function ({ api, event }) {
  const prefix = global.config.PREFIX || "undefined";
  return api.sendMessage({
    body: `🔧 Prefix hiện tại là: ${prefix}`,
    attachment: vdani.splice(0, 1)
  }, event.threadID, event.messageID);
};
