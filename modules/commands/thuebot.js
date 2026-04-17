const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const crypto = require('crypto');

module.exports.config = {
    name: "thuebot",
    version: "1.0.0",
    hasPermission: 2,
    credits: "Gojo Satoru",
    description: "thuê bot.",
    commandCategory: "Admin",
    usages: "[key/check/list]",
    cooldowns: 5,
    dependencies: {
        "crypto": "",
        "fs": "",
        "path": "",
        "moment-timezone": ""
    }
};

const keysDataPath = path.join(__dirname, 'data', 'keysData.json');
const thuebotDataPath = path.join(__dirname, 'data', 'thuebot.json');
let form_mm_dd_yyyy = (input = '', split = input.split('/')) => `${split[1]}/${split[0]}/${split[2]}`;
let keysData = fs.existsSync(keysDataPath) ? require(keysDataPath) : [];
let data = fs.existsSync(thuebotDataPath) ? require(thuebotDataPath) : [];

function saveKeysData() {
    fs.writeFileSync(keysDataPath, JSON.stringify(keysData, null, 4));
}
function saveThuebotData() {
    fs.writeFileSync(thuebotDataPath, JSON.stringify(data, null, 4));
}
function createNewKey(durationInDays) {
    const randomPart = crypto.randomBytes(2).toString('hex');
    const newKey = `qtdzs1_${randomPart}`;
    keysData.push({ key: newKey, used: false, duration: durationInDays });
    saveKeysData();
    return newKey;
}

module.exports.run = async function (o) {
    const send = (msg, callback) => o.api.sendMessage(msg, o.event.threadID, callback, o.event.messageID);
    const prefix = (global.data.threadData.get(o.event.threadID) || {}).PREFIX || global.config.PREFIX;
    const info = data.find($ => $.t_id == o.event.threadID);

    switch (o.args[0]) {
        case 'clear': {
            keysData = [];
            saveKeysData();
            return send('✅ Đã xóa toàn bộ dữ liệu key.');
        }

        case 'key': {
            const duration = parseInt(o.args[1]);
            if (isNaN(duration) || duration <= 0) return send('❎ Số ngày không hợp lệ.');
            const key = createNewKey(duration);
            return send(`✅ Key ${duration} ngày: ${key}`);
        }

        case 'check': {
            let message = '[ KEY LIST ]\n';
            keysData.forEach((k, i) => {
                message += `${i + 1}. Key: ${k.key}\n - Trạng thái: ${k.used ? 'Đã sử dụng' : 'Chưa sử dụng'}\n - Thời hạn: ${k.duration} ngày\n`;
            });
            return send(message);
        }

        case 'list': {
            if (!data.length) return send('❎ Chưa có nhóm nào thuê bot.');
            let list = data.map((item, i) => {
                let status = new Date(form_mm_dd_yyyy(item.time_end)).getTime() >= Date.now() + 25200000 ? 'Chưa hết hạn ✅' : 'Đã hết hạn ❎';
                return `${i + 1}. ${global.data.userName.get(item.id) || 'Không rõ'}\n📝 ${status}\n🌾 Nhóm: ${(global.data.threadInfo.get(item.t_id) || {}).threadName || 'Không rõ'}\nTừ: ${item.time_start}\nĐến: ${item.time_end}`;
            }).join('\n------------------\n');
            return send(`[ Danh sách thuê bot ]\n\n${list}`);
        }

        default:
            return send(`Lệnh không hợp lệ.\nDùng: \n${prefix}thuebot key [số ngày]\n${prefix}thuebot list\n${prefix}thuebot clear\n${prefix}thuebot check`);
    }
};

module.exports.handleEvent = async function ({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    if (!event.body || !event.body.startsWith('qtdzs1_')) return;

    const keyIndex = keysData.findIndex(k => k.key === event.body.trim());
    const alreadyActive = data.some(d => d.t_id === threadID);

    if (keyIndex === -1) return api.sendMessage('❎ Key không tồn tại.', threadID);
    if (keysData[keyIndex].used) return api.sendMessage('❎ Key đã được sử dụng.', threadID);
    if (alreadyActive) return api.sendMessage('❎ Nhóm đã kích hoạt bot.', threadID);

    keysData[keyIndex].used = true;
    const duration = keysData[keyIndex].duration;
    const start = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY");
    const end = moment.tz("Asia/Ho_Chi_Minh").add(duration, 'days').format("DD/MM/YYYY");

    data.push({ id: senderID, t_id: threadID, time_start: start, time_end: end });
    saveKeysData();
    saveThuebotData();

    api.changeNickname(`[ ${global.config.PREFIX} ] • ${global.config.BOTNAME || "BOT"} | HSD: ${end}`, threadID, api.getCurrentUserID());
    api.sendMessage(`✅ Đã kích hoạt bot\n📆 Bắt đầu: ${start}\n⏳ Hết hạn: ${end}`, threadID);
};
