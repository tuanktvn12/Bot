// ===== FIX crash Node 20 =====
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

// ===== REQUIRE =====
const { 
    readdirSync, readFileSync, writeFileSync, 
    existsSync, unlinkSync, rm, mkdirSync 
} = require("fs-extra");

const { join, resolve } = require("path");
const { execSync } = require("child_process");
const logger = require("./utils/log.js");
const login = require("@dongdev/fca-unofficial");
const chalk = require("chalk");
const moment = require("moment-timezone");
const axios = require("axios");
const fs = require("fs");
const assets = require("cfonts");

// ===== GLOBAL =====
global.client = {
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: [],
    handleSchedule: [],
    handleReaction: [],
    handleReply: [],
    mainPath: process.cwd(),
    configPath: "",
    getTime: new Map()
};

global.data = {
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: [],
    allUserID: [],
    allThreadID: []
};

global.utils = require("./utils");
global.nodemodule = {};
global.config = {};
global.configModule = {};
global.language = {};

// ===== LOAD CONFIG =====
try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    const configValue = require(global.client.configPath);
    Object.assign(global.config, configValue);
    logger.loader("Config Loaded!");
} catch {
    return logger.loader("Không tìm thấy config.json!", "error");
}

// ===== LOAD LANGUAGE =====
const langFile = readFileSync(`${__dirname}/languages/${global.config.language || "vi"}.lang`, "utf-8").split(/\r?\n/);
for (const item of langFile) {
    if (!item || item.startsWith("#")) continue;
    const [key, ...rest] = item.split("=");
    const value = rest.join("=").replace(/\\n/g, "\n");
    const [head, sub] = key.split(".");
    if (!global.language[head]) global.language[head] = {};
    global.language[head][sub] = value;
}

global.getText = function (head, key, ...args) {
    let text = global.language?.[head]?.[key] || "";
    args.forEach((arg, i) => {
        text = text.replace(new RegExp(`%${i + 1}`, "g"), arg);
    });
    return text;
};

// ===== LOAD APPSTATE =====
let appState;
try {
    const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
    appState = require(appStateFile);
    logger.loader("Đã load appstate");
} catch {
    return logger.loader("Không tìm thấy appstate!", "error");
}

// ===== LOGIN =====
function onBot({ models }) {
    if (!appState || typeof appState !== "object") {
        logger("Appstate lỗi!", "[ LOGIN ]");
        return process.exit(0);
    }

    login({ appState }, async (err, api) => {
        if (err) return logger(JSON.stringify(err), "[ LOGIN ERROR ]");

        // ===== OPTIONS =====
        api.setOptions({
            selfListen: false,
            listenEvents: true,
            updatePresence: false,
            forceLogin: false
        });

        // ===== SAVE APPSTATE =====
        try {
            writeFileSync("appstate.json", JSON.stringify(api.getAppState(), null, 2));
        } catch {}

        global.client.api = api;

        // ===== LOAD COMMAND =====
        const commands = readdirSync("./modules/commands").filter(f => f.endsWith(".js"));
        for (const file of commands) {
            try {
                const cmd = require(`./modules/commands/${file}`);
                global.client.commands.set(cmd.config.name, cmd);
                logger.loader(`Loaded command: ${cmd.config.name}`);
            } catch (e) {
                logger.loader(`Lỗi load command ${file}: ${e.message}`, "error");
            }
        }

        // ===== LOAD EVENT =====
        const events = readdirSync("./modules/events").filter(f => f.endsWith(".js"));
        for (const file of events) {
            try {
                const ev = require(`./modules/events/${file}`);
                global.client.events.set(ev.config.name, ev);
                logger.loader(`Loaded event: ${ev.config.name}`);
            } catch (e) {
                logger.loader(`Lỗi load event ${file}: ${e.message}`, "error");
            }
        }

        // ===== LISTEN =====
        const listener = require("./includes/listen")({ api, models });

        try {
            global.handleListen = api.listenMqtt((err, msg) => {
                if (err) return logger(err, "[ LISTEN ERROR ]");
                if (!msg || ["presence", "typ"].includes(msg.type)) return;
                listener(msg);
            });
        } catch (e) {
            logger("listenMqtt lỗi: " + e.message, "[ ERROR ]");
        }

        // ===== START =====
        logger("Bot đã sẵn sàng 🚀", "[ START ]");

        assets.say("MAGUS", {
            font: "block",
            align: "left",
            colors: ["cyan"]
        });
    });
}

// ===== DATABASE =====
const { Sequelize, sequelize } = require("./includes/database");

(async () => {
    try {
        await sequelize.authenticate();
        const models = require("./includes/database/model")({ Sequelize, sequelize });
        logger("Kết nối database thành công", "[ DATA ]");
        onBot({ models });
    } catch (e) {
        logger("Lỗi database: " + e.message, "[ ERROR ]");
    }
})();