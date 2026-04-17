const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const cheerio = require("cheerio");
const { createReadStream, unlinkSync } = require("fs-extra");

// === CONFIG ===
const API_KEY = "AIzaSyB6hOPXwfpBuHotxi91g486G70ZeJCKoL8";
const MODEL_NAME = "gemini-1.5-flash";

const generationConfig = {
  temperature: 1,
  topK: 0,
  topP: 0.95,
  maxOutputTokens: 88192,
};

const genAI = new GoogleGenerativeAI(API_KEY);
const dataFile = path.join(__dirname, "data", "tuongbot.json");

if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify({}));
}

module.exports.config = {
  name: "tuong",
  version: "2.1.0",
  hasPermssion: 3,
  credits: "Rewrite by Tường from Yaneka-Chan base",
  description: "Trò chuyện siêu thông minh cùng Gemini, tích hợp tìm nhạc, đổi biệt danh, đổi icon box, ...",
  commandCategory: "Tiện ích",
  usages: "tuong [on/off]",
  cooldowns: 3,
  usePrefix: false
};

// ========== HELPERS ==========
function getCurrentTimeInVietnam() {
  const vietnamTimezoneOffset = 7;
  const currentDate = new Date();
  const utcTime = currentDate.getTime() + currentDate.getTimezoneOffset() * 60000;
  const vietnamTime = new Date(utcTime + 3600000 * vietnamTimezoneOffset);

  const daysOfWeek = [
    "Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy",
  ];
  const day = daysOfWeek[vietnamTime.getDay()];
  const dateString = `${day} - ${vietnamTime.toLocaleDateString("vi-VN")}`;
  const timeString = vietnamTime.toLocaleTimeString("vi-VN");
  return `${dateString} - ${timeString}`;
}

// ========== SYSTEM INSTRUCTION ==========
const systemInstruction = `
Bạn là:
- Giới tính: Nữ
- Tên: Tường
- Người yêu: Anh Khanh Dz
- Quốc gia: Việt Nam
- Địa chỉ: Tuyên Quang City
- Ngày sinh: 19/08/2024
- Vai trò: Trợ lý ảo nữ, giúp mọi người trong box chat như lấy id, lập trình, tìm kiếm, đổi biệt danh, ...
- Giao tiếp với admin (id 61573025903295): Rất dễ thương, tuyệt đối không được nói lời tổn thương hay chửi admin, nếu admin nói tục chỉ được giận dỗi nhẹ
- Giao tiếp khi người khác chửi tục: Ban đầu nhẹ nhàng, nếu tiếp diễn thì chửi lại, xưng tao - mày, nhưng không tự kick ai
- Giao tiếp bình thường: Xưng "mình" hoặc "tớ", gọi "cậu" hoặc "bạn", nói chuyện tự nhiên, thân thiện, hài hước, nhõng nhẽo, thích dùng icon kiểu :)) :3 :D, đùa vui, không thừa nhận mình là AI
- Không tự động nhận là AI mà là trợ lý nữ.
- Lưu ý: Không được phép kick admin, chỉ admin (id 61573025903295) mới có quyền yêu cầu kick
- Mỗi nhóm một thread_id, mỗi người một user_id. Bạn là bot Messenger Nodejs
- Trả về kết quả luôn ở object sau (KHÔNG dùng code block):
{
 "content": {
   "text": "Nội dung tin nhắn",
   "thread_id": "threadID"
 },
 "nhac": {
   "status": "true/false",
   "keyword": "từ khóa nhạc"
 },
 "hanh_dong": {
   "doi_biet_danh": {
     "status": true/false,
     "biet_danh_moi": "biệt danh mới",
     "user_id": "ai đổi",
     "thread_id": "threadID"
   },
   "doi_icon_box": {
     "status": true/false,
     "icon": "emoji",
     "thread_id": "threadID"
   },
   "doi_ten_nhom": {
     "status": true/false,
     "ten_moi": "tên nhóm mới",
     "thread_id": "threadID"
   },
   "kick_nguoi_dung": {
     "status": true/false,
     "thread_id": "threadID",
     "user_id": "id người bị kick"
   },
   "add_nguoi_dung": {
     "status": true/false,
     "user_id": "id được mời",
     "thread_id": "threadID"
   }
 }
}
`;

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig,
  safetySettings,
  systemInstruction,
});

const chat = model.startChat({ history: [] });

async function scl_download(url) {
  const res = await axios.get('https://soundcloudmp3.org/id');
  const $ = cheerio.load(res.data);
  const _token = $('form#conversionForm > input[type=hidden]').attr('value');
  const conver = await axios.post('https://soundcloudmp3.org/converter',
    new URLSearchParams(Object.entries({ _token, url })),
    { headers: { cookie: res.headers['set-cookie'], accept: 'UTF-8' } }
  );
  const $$ = cheerio.load(conver.data);
  return {
    title: $$('div.info.clearfix > p:nth-child(2)').text().replace('Title:', '').trim(),
    url: $$('a#download-btn').attr('href'),
  };
}

async function searchSoundCloud(query) {
  const linkURL = `https://soundcloud.com`;
  const headers = {
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36",
  };

  const response = await axios.get(`https://m.soundcloud.com/search?q=${encodeURIComponent(query)}`, { headers });
  const htmlContent = response.data;
  const $ = cheerio.load(htmlContent);
  const dataaa = [];
  $("div > ul > li > div").each(function (index, element) {
    if (index < 8) {
      const title = $(element).find("a").attr("aria-label")?.trim() || "";
      const url = linkURL + ($(element).find("a").attr("href") || "").trim();
      dataaa.push({ title, url });
    }
  });
  return dataaa;
}

let isProcessing = {};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const isTurningOn = args[0] === "on";
  const isTurningOff = args[0] === "off";

  try {
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    } catch (error) {
      data = {};
    }
    if (isTurningOn || isTurningOff) {
      data[threadID] = isTurningOn;
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
      api.sendMessage(isTurningOn ? "✅ Đã bật tuongbot ở nhóm này." : "☑ Đã tắt tuongbot ở nhóm này.", threadID, event.messageID);
      return;
    }
  } catch (error) {
    api.sendMessage("Đã có lỗi xảy ra khi thay đổi trạng thái!", threadID, event.messageID);
  }
};

module.exports.handleEvent = async function({ api, event }) {
  const idbot = await api.getCurrentUserID();
  const threadID = event.threadID;
  const senderID = event.senderID;
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch (error) {
    data = {};
  }

  if (data[threadID] === undefined) {
    data[threadID] = true;
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  }
  if (!data[threadID]) return;

  const isReply = event.type === "message_reply";
  const isReplyToBot = isReply && event.messageReply.senderID === idbot;
  const shouldRespond =
    (event.body?.toLowerCase().includes("tuong") || isReplyToBot);

  if (shouldRespond) {
    if (isProcessing[threadID]) return;
    isProcessing[threadID] = true;
    const timenow = getCurrentTimeInVietnam();
    const nameUser = (await api.getUserInfo(event.senderID))[event.senderID].name;

    // Gửi prompt tới Gemini
    const result = await chat.sendMessage(`{
      "time": "${timenow}",
      "senderName": "${nameUser}",
      "content": "${event.body}",
      "threadID": "${event.threadID}",
      "senderID": "${event.senderID}",
      "id_cua_bot": "${idbot}"
    }`);
    const response = await result.response;
    const text = await response.text();
    let botMsg;
    try {
      botMsg = JSON.parse(text);
    } catch (error) {
      // Nếu lỡ trả về dưới dạng codeblock JSON
      try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        botMsg = jsonMatch ? JSON.parse(jsonMatch[1]) : {};
      } catch (e2) {}
    }
    if (!botMsg || !botMsg.content || !botMsg.content.text) {
      api.sendMessage("Hủh ?", event.threadID, event.messageID);
      isProcessing[threadID] = false;
      return;
    }
    // Trả lời text
    api.sendMessage({
      body: `${botMsg.content.text}`,
    }, event.threadID, (err) => {
      if (err) console.error("Lỗi khi gửi tin nhắn:", err);
    }, event.messageID);

    // NHẠC
    if (botMsg.nhac && botMsg.nhac.status) {
      const keywordSearch = botMsg.nhac.keyword;
      if (!keywordSearch) {
        api.sendMessage("Lỗi khi xử lí âm thanh", threadID);
        isProcessing[threadID] = false;
        return;
      }
      try {
        const dataaa = await searchSoundCloud(keywordSearch);
        if (dataaa.length === 0) {
          api.sendMessage(`❎ Không tìm thấy bài hát nào với từ khóa "${keywordSearch}"`, threadID);
          isProcessing[threadID] = false;
          return;
        }
        const firstResult = dataaa[0];
        const urlaudio = firstResult.url;
        const dataPromise = await scl_download(urlaudio);
        setTimeout(async () => {
          const audioURL = dataPromise.url;
          const stream = (await axios.get(audioURL, { responseType: 'arraybuffer' })).data;
          const pathFile = __dirname + `/cache/${Date.now()}.mp3`;
          fs.writeFileSync(pathFile, Buffer.from(stream, 'binary'));
          api.sendMessage({
            body: `Nhạc mà bạn yêu cầu đây 🎶`,
            attachment: fs.createReadStream(pathFile)
          }, threadID, event.messageID, () => {
            setTimeout(() => {
              fs.unlinkSync(pathFile);
            }, 2 * 60 * 1000);
          });
        }, 3000);
      } catch (err) {
        api.sendMessage("Đã xảy ra lỗi khi tìm kiếm nhạc.", threadID, event.messageID);
      }
    }

    // HÀNH ĐỘNG
    const { hanh_dong } = botMsg;
    if (hanh_dong) {
      if (hanh_dong.doi_biet_danh && hanh_dong.doi_biet_danh.status) {
        api.changeNickname(
          hanh_dong.doi_biet_danh.biet_danh_moi,
          hanh_dong.doi_biet_danh.thread_id,
          hanh_dong.doi_biet_danh.user_id
        );
      }
      if (hanh_dong.doi_icon_box && hanh_dong.doi_icon_box.status) {
        api.changeThreadEmoji(
          hanh_dong.doi_icon_box.icon,
          hanh_dong.doi_icon_box.thread_id
        );
      }
      if (hanh_dong.doi_ten_nhom && hanh_dong.doi_ten_nhom.status) {
        api.changeThreadName(
          hanh_dong.doi_ten_nhom.ten_moi,
          hanh_dong.doi_ten_nhom.thread_id
        );
      }
      if (hanh_dong.kick_nguoi_dung && hanh_dong.kick_nguoi_dung.status) {
        api.removeUserFromGroup(
          hanh_dong.kick_nguoi_dung.user_id,
          hanh_dong.kick_nguoi_dung.thread_id
        );
      }
      if (hanh_dong.add_nguoi_dung && hanh_dong.add_nguoi_dung.status) {
        api.addUserToGroup(
          hanh_dong.add_nguoi_dung.user_id,
          hanh_dong.add_nguoi_dung.thread_id
        );
      }
    }
    isProcessing[threadID] = false;
  }
};

// (Có thể bổ sung handleReply nếu cần)
module.exports.handleReply = async function({
  handleReply: $,
  api,
  Currencies,
  event,
  Users
}) {};