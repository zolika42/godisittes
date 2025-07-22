const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const green = (str) => `\x1b[32m${str}\x1b[0m`;
const yellow = (str) => `\x1b[33m${str}\x1b[0m`;
const red = (str) => `\x1b[31m${str}\x1b[0m`;

// 1. translations.node.js generálása
const original = fs.readFileSync("translations.js", "utf-8");
const originalScript = fs.readFileSync("script.js", "utf-8");
const exported = original.replace(/^const translations =/, "module.exports =");
fs.writeFileSync("translations.node.js", exported);
console.log(green("✔ translations.node.js létrehozva."));

// 2. translations.min.js generálása
const minifiedTranslations = original
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\n/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/:\s+/g, ":")
    .replace(/,\s+/g, ",")
    .replace(/\{\s+/g, "{")
    .replace(/\s+\}/g, "}");
fs.writeFileSync("translations.min.js", minifiedTranslations);
console.log(green("✔ translations.min.js létrehozva."));

// 3. script.min.js generálása
const minifiedScript = originalScript
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\n/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/:\s+/g, ":")
    .replace(/,\s+/g, ",")
    .replace(/\{\s+/g, "{")
    .replace(/\s+\}/g, "}");
fs.writeFileSync("script.min.js", minifiedScript);
console.log(green("✔ script.min.js létrehozva."));

// 4. style.min.css generálása
const cssOriginal = fs.readFileSync("style.css", "utf-8");
const cssMinified = cssOriginal
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\n/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*{\s*/g, "{")
    .replace(/\s*}\s*/g, "}")
    .replace(/\s*;\s*/g, ";")
    .replace(/\s*:\s*/g, ":")
    .trim();
fs.writeFileSync("style.min.css", cssMinified);
console.log(green("✔ style.min.css létrehozva."));

// 5. Fordítások betöltése
const translations = require("./translations.node.js");
if (!translations || typeof translations !== "object") {
    console.error(red("❌ A translations objektum nem elérhető!"));
    process.exit(1);
}

// 6. dist mappa létrehozása
const targetDir = "dist";
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

// 7. Minifikált fájlok másolása
fs.copyFileSync("style.min.css", path.join(targetDir, "style.min.css"));
fs.copyFileSync("script.min.js", path.join(targetDir, "script.min.js"));
fs.copyFileSync("translations.min.js", path.join(targetDir, "translations.min.js"));
if (fs.existsSync("site.webmanifest")) {
    fs.copyFileSync("site.webmanifest", path.join(targetDir, "site.webmanifest"));
}
console.log(green("✔ Minifikált fájlok bemásolva a /dist mappába."));

// 8. images könyvtár másolása
function copyFolderRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        if (fs.lstatSync(srcPath).isDirectory()) {
            copyFolderRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}
if (fs.existsSync("images")) {
    copyFolderRecursive("images", path.join(targetDir, "images"));
    console.log(green("✔ images könyvtár másolva."));
}

// 9. HTML fájlok feldolgozása
const htmlFiles = fs.readdirSync(".").filter(file => file.endsWith(".html"));
const missingTranslationTable = [];

for (const htmlFile of htmlFiles) {
    const htmlContent = fs.readFileSync(htmlFile, "utf-8");
    const baseDom = new JSDOM(htmlContent);

    for (const lang of Object.keys(translations)) {
        const langDict = translations[lang];
        const doc = baseDom.window.document.cloneNode(true);
        const missingKeys = [];

        doc.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (langDict[key]) {
                el.innerHTML = langDict[key];
            } else {
                missingKeys.push(key);
                missingTranslationTable.push({ key, lang, file: htmlFile });
            }
        });

        doc.documentElement.lang = lang;

        // Frissítjük a canonical URL-t
        const canonical = doc.querySelector('link[rel="canonical"]');
        if (canonical) {
            const langPath = lang === "en" ? "" : `${lang}/`;
            canonical.href = `https://godisittes.hu/${langPath}${htmlFile}`;
        }

        // 🔁 Extra i18n csere nem data-i18n elemekhez
        const skipTags = ["option", "button", "span", "li"];
        const specialMap = {
            title: "pageTitle",
            "meta[name='description']": "metaDescription",
            "meta[property='og:title']": "ogTitle",
            "meta[property='og:description']": "ogDescription"
        };

        for (const [selector, key] of Object.entries(specialMap)) {
            const el = doc.querySelector(selector);
            if (el && langDict[key]) {
                if (el.tagName === "TITLE") el.textContent = langDict[key];
                else el.setAttribute("content", langDict[key]);
            }
        }

        doc.querySelectorAll("body *:not([data-i18n])").forEach(el => {
            if (skipTags.includes(el.tagName.toLowerCase())) return;
            if (el.children.length > 0) return;
            const text = el.textContent.trim();
            if (!text || text.length < 2) return;

            const autoKey = Object.keys(langDict).find(k => langDict["hu"]?.[k] === text || langDict[k] === text);
            if (autoKey && langDict[autoKey]) {
                el.textContent = langDict[autoKey];
            }
        });

        // Nyelvválasztó dropdown frissítése
        updateLanguageSelect(doc, lang);

        // Linkek átírása
        doc.querySelectorAll("a[href]").forEach((a) => {
            const href = a.getAttribute("href");
            if (a.closest(".language-switcher")) return;
            if (
                href.startsWith("/") &&
                !href.startsWith(`/${lang}/`) &&
                !href.startsWith("/images") &&
                !href.startsWith("/style") &&
                !href.startsWith("/script") &&
                !href.startsWith("/translations") &&
                !href.startsWith("http") &&
                !href.startsWith("#")
            ) {
                const newHref = `/${lang}${href}`;
                a.setAttribute("href", newHref);
            } else if (
                href.startsWith("/#") &&
                !href.startsWith(`/${lang}/`)
            ) {
                a.setAttribute("href", `/${lang}/${href.substring(2)}`);
            }
        });

        const langDir = path.join(targetDir, lang);
        if (!fs.existsSync(langDir)) fs.mkdirSync(langDir);

        const outputHtml = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
        fs.writeFileSync(path.join(langDir, htmlFile), outputHtml, "utf-8");
        console.log(green(`✅ ${lang}/${htmlFile} létrehozva.`));

        if (missingKeys.length > 0) {
            console.warn(yellow(`⚠️ ${lang}: Hiányzó fordítások a ${htmlFile}-ben: ${missingKeys.join(", ")}`));
        }
    }
}

// 10. Táblázatos jelentés hiányzó fordításokról
function pad(str, len) {
    return str + " ".repeat(Math.max(0, len - str.length));
}

if (missingTranslationTable.length > 0) {
    const col1 = "key";
    const col2 = "language";
    const col3 = "file";

    const col1Len = Math.max(...missingTranslationTable.map(r => r.key.length), col1.length);
    const col2Len = Math.max(...missingTranslationTable.map(r => r.lang.length), col2.length);
    const col3Len = Math.max(...missingTranslationTable.map(r => r.file.length), col3.length);

    const line = `┌${"─".repeat(col1Len + 2)}┬${"─".repeat(col2Len + 2)}┬${"─".repeat(col3Len + 2)}┐`;
    const sep = `├${"─".repeat(col1Len + 2)}┼${"─".repeat(col2Len + 2)}┼${"─".repeat(col3Len + 2)}┤`;
    const end = `└${"─".repeat(col1Len + 2)}┴${"─".repeat(col2Len + 2)}┴${"─".repeat(col3Len + 2)}┘`;

    console.log("\n📝 Hiányzó fordítások összesítése:");
    console.log(line);
    console.log(`│ ${pad(col1, col1Len)} │ ${pad(col2, col2Len)} │ ${pad(col3, col3Len)} │`);
    console.log(sep);
    for (const row of missingTranslationTable) {
        console.log(red(`│ ${pad(row.key, col1Len)} │ ${pad(row.lang, col2Len)} │ ${pad(row.file, col3Len)} │`));
    }
    console.log(end);
} else {
    console.log(green("🎉 Minden fordítás megvan az összes nyelven!"));
}

// 11. sitemap.xml generálása
const siteBase = "https://godisittes.hu";
const sitemapEntries = [];

for (const htmlFile of htmlFiles) {
    const filename = path.basename(htmlFile);
    for (const lang of Object.keys(translations)) {
        const url = `${siteBase}${lang === "en" ? "" : `/${lang}`}/${filename}`;
        sitemapEntries.push(`<url><loc>${url}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
    }
}

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapEntries.join("\n") +
    `\n</urlset>`;

fs.writeFileSync(path.join(targetDir, "sitemap.xml"), sitemapXml, "utf-8");
console.log(green("✔ sitemap.xml létrehozva."));

// 12. robots.txt generálása
const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${siteBase}/sitemap.xml`;
fs.writeFileSync(path.join(targetDir, "robots.txt"), robotsTxt, "utf-8");
console.log(green("✔ robots.txt létrehozva."));

// Nyelvválasztó dropdown frissítése adott nyelvre
function updateLanguageSelect(doc, currentLang) {
    const select = doc.querySelector("select#language");
    if (!select) return;

    const options = select.querySelectorAll("option");
    options.forEach((opt) => {
        // Kivonjuk a nyelvi kódot a value értékből pl. "/de/index.html" → "de"
        const langFromValue = (opt.value.match(/^\/([a-z]{2})\//) || [])[1];
        if (langFromValue === currentLang) {
            opt.setAttribute("selected", "selected");
        } else {
            opt.removeAttribute("selected");
        }
    });
}