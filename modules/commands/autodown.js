const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports.config = {
    name: "autodown",
    version: "2.0.0",
    hasPermssion: 2,
    credits: "pcoder, Kenne400k", 
    description: "Tự động tải media từ hơn 40 nền tảng phổ biến (Tiktok, Youtube, Facebook, Instagram, Capcut, Reddit, Twitter, Soundcloud, Spotify, Zingmp3, Telegram, Vimeo, Bilibili, Pinterest, v.v...)",
    commandCategory: "Tiện ích",
    usages: "[help]",
    cooldowns: 5,
    usePrefix: true
};

module.exports.handleEvent = async function ({ api, event }) {
    if (!event.body) return;

    const url = event.body;
    const isURL = /^http(s)?:\/\//.test(url);

    // Đầy đủ các nền tảng phổ biến (dạng RegExp)
    const patterns = [
        /tiktok\.com/,
        /douyin\.com/,
        /capcut\.com/,
        /threads\.net/,
        /instagram\.com/,
        /facebook\.com/,
        /espn\.com/,
        /pinterest\.com/,
        /imdb\.com/,
        /imgur\.com/,
        /ifunny\.co/,
        /izlesene\.com/,
        /reddit\.com/,
        /youtube\.com/,
        /youtu\.be/,
        /twitter\.com/,
        /x\.com/,
        /vimeo\.com/,
        /snapchat\.com/,
        /bilibili\.com/,
        /dailymotion\.com/,
        /sharechat\.com/,
        /likee\.video/,
        /linkedin\.com/,
        /tumblr\.com/,
        /hipi\.co\.in/,
        /telegram\.org/,
        /getstickerpack\.com/,
        /bitchute\.com/,
        /febspot\.com/,
        /9gag\.com/,
        /ok\.ru/,
        /rumble\.com/,
        /streamable\.com/,
        /ted\.com/,
        /sohu\.com/,
        /xvideos\.com/,
        /xnxx\.com/,
        /xiaohongshu\.com/,
        /ixigua\.com/,
        /weibo\.com/,
        /miaopai\.com/,
        /meipai\.com/,
        /xiaoying\.tv/,
        /nationalvideo\.com/,
        /yingke\.com/,
        /sina\.com\.cn/,
        /vk\.com/,
        /vk\.ru/,
        /soundcloud\.com/,
        /mixcloud\.com/,
        /spotify\.com/,
        /zingmp3\.vn/,
        /bandcamp\.com/
    ];

    const matches = patterns.find(pattern => pattern.test(url));
    if (!isURL || !matches) return;

    // React with "⏳" to indicate processing
    api.setMessageReaction("⏳", event.messageID, null, true);

    let data;
    try {
        const down = await axios.get(`https://j2down.vercel.app/download?url=${encodeURIComponent(url)}`);
        data = down.data;
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        // React with "❌" to indicate failure
        return api.setMessageReaction("❌", event.messageID, null, true);
    }

    // Check if data or data.medias doesn't exist or isn't an array
    if (!data || !Array.isArray(data.medias) || data.medias.length === 0) {
        // React with "❓" to indicate no media found
        return api.setMessageReaction("❓", event.messageID, null, true);
    }

    let fileContent = [];
    const findImg = data.medias.find(item => item.type === 'image');

    if (findImg) {
        fileContent = data.medias
            .filter(item => item.type === 'image' || item.type === 'video')
            .map((item, index) => ({
                path: path.join(__dirname, '..', '..', 'cache', `${Date.now() + index}.${item.type === 'video' ? 'mp4' : 'jpg'}`),
                url: item.url
            }));
    } else {
        fileContent.push({
            path: path.join(__dirname, '..', '..', 'cache', `${Date.now()}.${data.medias[0].type === 'video' ? 'mp4' : data.medias[0].type === 'audio' ? 'mp3' : 'jpg'}`),
            url: data.medias[0].url
        });
    }

    let attachments = [];
    for (const content of fileContent) {
        try {
            const attachment = await download(content.url, content.path);
            if (attachment.err) {
                // React with "⚠️" if there's an error with one of the downloads
                api.setMessageReaction("⚠️", event.messageID, null, true);
                continue;
            }
            attachments.push(attachment);
        } catch (error) {
            console.error('Download error:', error);
            continue;
        }
    }

    if (attachments.length === 0) {
        // React with "📭" if no attachments were successfully downloaded
        return api.setMessageReaction("📭", event.messageID, null, true);
    }

    // Lấy thêm unique_id, author, title nếu có
    let metaInfo = [];
    if (data.unique_id) metaInfo.push(`UID: ${data.unique_id}`);
    if (data.author) metaInfo.push(`Author: ${data.author}`);
    if (data.title) metaInfo.push(`Title: ${data.title}`);

    let messageBody = "🎦 AUTODOWN";
    if (metaInfo.length)
        messageBody += "\n" + metaInfo.join("\n");
    else
        messageBody += (data.title ? ("\n" + data.title) : "");

    // Send the message with attachments
    api.sendMessage({
        body: messageBody,
        attachment: attachments
    }, event.threadID, (err, info) => {
        if (err) {
            // React with "🔄" if sending failed
            return api.setMessageReaction("🔄", event.messageID, null, true);
        }
        // React with "✅" to indicate success
        api.setMessageReaction("✅", event.messageID, null, true);
    }, event.messageID);
};

module.exports.run = async function ({ api, event, args }) {
    if (args[0] === 'help') {
        return api.sendMessage(
            '🔍 AUTODOWN HELPER\n\n' +
            'Tự động tải xuống media từ các link được chia sẻ trong nhóm.\n\n' +
            '📌 Các nền tảng được hỗ trợ:\n' +
            'Tiktok, Douyin, Capcut, Threads, Instagram, Facebook, Espn, Pinterest, IMDb, Imgur, Ifunny, Izlesene, Reddit, Youtube, Twitter/X, Vimeo, Snapchat, Bilibili, Dailymotion, Sharechat, Likee, Linkedin, Tumblr, Hipi, Telegram, Getstickerpack, Bitchute, Febspot, 9GAG, oke.ru, Rumble, Streamable, Ted, SohuTv, Xvideos, Xnxx, Xiaohongshu, Ixigua, Weibo, Miaopai, Meipai, Xiaoying, National Video, Yingke, Sina, VK (vkvideo), Soundcloud, Mixcloud, Spotify, Zingmp3, Bandcamp.\n\n' +
            '💡 Cách sử dụng: Chỉ cần gửi link http:// hoặc https:// vào nhóm, bot sẽ tự động tải nếu nền tảng được hỗ trợ.\n\n' +
            '🔰 Phản hồi bằng emoji:\n' +
            '⏳ - Đang xử lý\n' +
            '✅ - Tải thành công\n' +
            '❌ - Lỗi khi tải\n' +
            '❓ - Không tìm thấy media\n' +
            '⚠️ - Lỗi một phần\n' +
            '📭 - Không thể tải bất kỳ tệp nào',
            event.threadID,
            event.messageID
        );
    } else {
        return api.sendMessage(
            '🎦 AUTODOWN\n\nModule tự động tải xuống media từ các link được chia sẻ.\nDùng "autodown help" để xem hướng dẫn chi tiết.',
            event.threadID,
            event.messageID
        );
    }
};

async function download(url, savePath) {
    try {
        const dirPath = path.dirname(savePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        fs.writeFileSync(savePath, response.data);
        setTimeout(() => {
            fs.unlink(savePath, (err) => {
                if (err) console.error('Lỗi khi xóa tệp:', err);
            });
        }, 1000 * 60);
        
        return fs.createReadStream(savePath);
    } catch (error) {
        console.error('Lỗi khi tải:', error.message);
        return { err: true };
    }
}