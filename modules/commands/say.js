module.exports.config = {
	name: "say",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "Khiến bot trả về file âm thanh của chị google thông qua văn bản",
	commandCategory: "Media",
	usages: "[ru/en/ko/ja] [Text]",
	cooldowns: 5,
	dependencies: {
		"path": "",
		"fs-extra": ""
	}
};

module.exports.run = async function({ api, event, args }) {
	const { createReadStream, unlinkSync } = global.nodemodule["fs-extra"];
	const { resolve } = global.nodemodule["path"];
	try {
		var content = (event.type == "message_reply") ? event.messageReply.body : args.join(" ");
		if (!content) return api.sendMessage("❎ Vui lòng nhập nội dung để bot đọc.", event.threadID, event.messageID);

		var languageToSay = (["ru","en","ko","ja"].some(item => content.indexOf(item) == 0)) ? content.slice(0, content.indexOf(" ")) : global.config.language || "vi";
		var msg = (languageToSay != global.config.language) ? content.slice(languageToSay.length + 1) : content;

		const path = resolve(__dirname, 'cache', `${event.threadID}_${event.senderID}.mp3`);
		const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(msg)}&tl=${languageToSay}&client=gtx`;

		await global.utils.downloadFile(url, path);
		return api.sendMessage({ attachment: createReadStream(path) }, event.threadID, () => unlinkSync(path), event.messageID);
	} catch (e) {
		console.log(e);
		return api.sendMessage("⚠️ Đã xảy ra lỗi khi tạo file âm thanh!", event.threadID, event.messageID);
	}
}
