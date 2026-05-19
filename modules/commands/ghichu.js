const fs = require("fs-extra");
const axios = require("axios");
const request = require("request");
const cheerio = require("cheerio");
const { resolve } = require("path");

module.exports.config = {
    name: "ghichu",
    version: "1.1.0",
    hasPermssion: 2,
    credits: "D-Jukie + fix",
    description: "Apply code từ link hoặc up pastebin",
    commandCategory: "Tiện ích",
    usages: "[reply link] [tên file] | [tên file]",
    cooldowns: 0,
    dependencies: {
        "pastebin-api": "",
        "cheerio": "",
        "request": "",
        "fs-extra": ""
    }
};

module.exports.run = async function ({
    api,
    event,
    args,
    utils
}) {

    try {

        const {
            threadID,
            messageID,
            messageReply,
            type
        } = event;

        const fileName = args[0];

        // reply link
        const text =
            type === "message_reply"
                ? messageReply.body
                : null;

        if (!text && !fileName) {
            return api.sendMessage(
                "⚠️ Reply link hoặc nhập tên file",
                threadID,
                messageID
            );
        }

        // upload code lên pastebin
        if (!text && fileName) {

            const filePath =
                `${__dirname}/${fileName}.js`;

            if (!fs.existsSync(filePath)) {
                return api.sendMessage(
                    `❌ File ${fileName}.js không tồn tại`,
                    threadID,
                    messageID
                );
            }

            const data = fs.readFileSync(
                filePath,
                "utf-8"
            );

            const { PasteClient } =
                require("pastebin-api");

            const client = new PasteClient(
                "R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb"
            );

            const url = await client.createPaste({
                code: data,
                expireDate: "N",
                format: "javascript",
                name: args[1] || fileName,
                publicity: 1
            });

            const id = url.split("/")[3];

            return api.sendMessage(
                `✅ Link raw:\nhttps://pastebin.com/raw/${id}`,
                threadID,
                messageID
            );
        }

        // regex url
        const urlRegex =
            /https?:\/\/[^\s]+/g;

        const match = text.match(urlRegex);

        if (!match) {
            return api.sendMessage(
                "❌ Không tìm thấy link",
                threadID,
                messageID
            );
        }

        const url = match[0];

        if (!args[0]) {
            return api.sendMessage(
                "⚠️ Vui lòng nhập tên file",
                threadID,
                messageID
            );
        }

        const savePath =
            `${__dirname}/${args[0]}.js`;

        // pastebin
        if (url.includes("pastebin")) {

            let raw = url;

            if (!url.includes("/raw/")) {

                const id =
                    url.split("/").pop();

                raw =
                    `https://pastebin.com/raw/${id}`;
            }

            const res = await axios.get(raw);

            fs.writeFileSync(
                savePath,
                res.data,
                "utf-8"
            );

            return api.sendMessage(
                `✅ Đã apply code vào ${args[0]}.js`,
                threadID,
                messageID
            );
        }

        // buildtool/tinyurl
        if (
            url.includes("buildtool") ||
            url.includes("tinyurl.com")
        ) {

            request(
                {
                    method: "GET",
                    url
                },
                function (error, response, body) {

                    if (error) {
                        return api.sendMessage(
                            "❌ Không thể tải code",
                            threadID,
                            messageID
                        );
                    }

                    const load =
                        cheerio.load(body);

                    let found = false;

                    load(".language-js").each(
                        (index, el) => {

                            if (found) return;

                            found = true;

                            const code =
                                el.children?.[0]?.data;

                            if (!code) {
                                return api.sendMessage(
                                    "❌ Không đọc được code",
                                    threadID,
                                    messageID
                                );
                            }

                            fs.writeFileSync(
                                savePath,
                                code,
                                "utf-8"
                            );

                            return api.sendMessage(
                                `✅ Đã apply code vào ${args[0]}.js`,
                                threadID,
                                messageID
                            );
                        }
                    );

                    if (!found) {
                        return api.sendMessage(
                            "❌ Không tìm thấy code JS",
                            threadID,
                            messageID
                        );
                    }
                }
            );

            return;
        }

        // google drive
        if (url.includes("drive.google")) {

            const id =
                url.match(/[-\w]{25,}/);

            if (!id) {
                return api.sendMessage(
                    "❌ Không lấy được ID Drive",
                    threadID,
                    messageID
                );
            }

            const path = resolve(
                __dirname,
                `${args[0]}.js`
            );

            try {

                await utils.downloadFile(
                    `https://drive.google.com/u/0/uc?id=${id[0]}&export=download`,
                    path
                );

                return api.sendMessage(
                    `✅ Đã tải code vào ${args[0]}.js`,
                    threadID,
                    messageID
                );

            } catch (e) {

                console.log(e);

                return api.sendMessage(
                    "❌ Lỗi tải file drive",
                    threadID,
                    messageID
                );
            }
        }

        return api.sendMessage(
            "❌ Link không được hỗ trợ",
            threadID,
            messageID
        );

    } catch (e) {

        console.log(e);

        return api.sendMessage(
            "❌ Đã xảy ra lỗi",
            event.threadID,
            event.messageID
        );
    }
};