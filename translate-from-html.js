import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load translations.node.js dynamically
const translations = (await import(path.join(__dirname, "./translations.node.js"))).default;

const GOOGLE_API = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=hu&dt=t&tl=";

const langs = Object.keys(translations);
const autoTranslations = langs.reduce((acc, lang) => ({ ...acc, [lang]: {} }), {});

const rootHtmlFiles = fs.readdirSync(".").filter(f => f.endsWith(".html"));
const blogHtmlFiles = fs.existsSync("blog") ? fs.readdirSync("blog").filter(f => f.endsWith(".html")).map(f => `blog/${f}`) : [];
const htmlFiles = [...rootHtmlFiles, ...blogHtmlFiles];

const missing = [];

for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, "utf-8");
    const dom = new JSDOM(html);

    dom.window.document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        langs.forEach(lang => {
            const dict = translations[lang];
            if (!dict[key]) {
                missing.push({ key, lang, source: el.textContent.trim() });
            }
        });
    });
}

console.log(`📋 Found ${missing.length} missing translations.`);

let requests = 0;
const limit = 100;
const resetAfter = 60 * 1000;
let lastReset = Date.now();

for (const item of missing) {
    if (!item.source || item.source.length < 1) continue;
    if (requests >= limit) {
        const now = Date.now();
        const diff = now - lastReset;
        if (diff < resetAfter) {
            const wait = resetAfter - diff;
            console.log(`⏳ Rate limit hit. Waiting ${wait}ms...`);
            await new Promise(res => setTimeout(res, wait));
        }
        requests = 0;
        lastReset = Date.now();
    }

    const url = `${GOOGLE_API}${item.lang}&q=${encodeURIComponent(item.source)}`;
    try {
        const res = await fetch(url);
        const json = await res.json();
        const translated = json[0][0][0];
        autoTranslations[item.lang][item.key] = translated;
        requests++;
        console.log(`✅ ${item.lang}: "${item.source}" => "${translated}"`);
    } catch (err) {
        console.warn(`❌ ${item.lang} FAILED: "${item.source}"`);
    }
}

fs.writeFileSync("translations.auto.json", JSON.stringify(autoTranslations, null, 2), "utf-8");
console.log("✅ translations.auto.json created.");
