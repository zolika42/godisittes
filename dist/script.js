
document.addEventListener("DOMContentLoaded", () => {
    attachDzsoniSpeech(); // automatikus minden dzsoni-sticky elemhez

    const supported = ['en', 'hu', 'de', 'fr', 'nl', 'es'];
    const savedLang = localStorage.getItem('lang');
    const parts = window.location.pathname.split('/');
    const currentLang = parts[1]; // e.g., 'en' from /en/index.html

    // Ha a gyökérből jövünk és van mentett nyelv, irányítsuk át
    if (window.location.pathname === '/' && savedLang && supported.includes(savedLang)) {
        window.location.href = `/${savedLang}/index.html`;
        return;
    }

    // Ha nincs mentett nyelv, és támogatott az aktuális, mentsük el
    if (!savedLang && supported.includes(currentLang)) {
        localStorage.setItem('lang', currentLang);
    }

    // Set dropdown érték
    const selector = document.getElementById('language');
    if (selector && supported.includes(currentLang)) {
        selector.value = `/${currentLang}/index.html`;
    }

    // Lefordítjuk az oldalt
    translatePage(currentLang || savedLang || detectBrowserLanguage());
});

// A szövegobjektumot a speechtexts.js tölti be globálisan dzsoniSpeechTexts néven

function attachDzsoniSpeech(manualId = null, manualKey = null, lang = 'hu') {
    // Manuális vagy automatikus
    let targets = [];

    if (manualId && manualKey) {
        targets.push({ id: manualId, key: manualKey });
    } else {
        document.querySelectorAll('[id^="dzsoni-sticky-"]').forEach(el => {
            const id = el.id;
            const key = id.replace("dzsoni-sticky-", ""); // pl. 'contact'
            targets.push({ id, key });
        });
    }

    targets.forEach(({ id, key }) => {
        const dzsoni = document.getElementById(id);
        if (!dzsoni) return;

        // Már van buborék? Ne adjunk hozzá mégegyet
        if (dzsoni.querySelector('.speech-bubble')) return;

        const bubble = document.createElement("div");
        bubble.classList.add("speech-bubble");
        dzsoni.appendChild(bubble);

        dzsoni.addEventListener("mouseenter", () => {
            const currentLang = document.documentElement.lang || lang;
            const messages = dzsoniSpeechTexts[key] && dzsoniSpeechTexts[key][currentLang];
            if (!messages || !messages.length) {
                bubble.textContent = `[${key} (${currentLang})] nincs szöveg`;
            } else {
                const randomText = messages[Math.floor(Math.random() * messages.length)];
                bubble.textContent = randomText;
            }
            bubble.style.display = "block";
        });

        dzsoni.addEventListener("mouseleave", () => {
            bubble.style.display = "none";
        });
    });
}

function setLanguage(lang) {
    localStorage.setItem("lang", lang);
    window.location.href = `/${lang}/index.html`;
}

function translatePage(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });
}

function detectBrowserLanguage() {
    const supported = Object.keys(translations);
    const browserLang = navigator.language.slice(0, 2).toLowerCase();
    return supported.includes(browserLang) ? browserLang : 'en';
}
