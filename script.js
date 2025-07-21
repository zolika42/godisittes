
document.addEventListener("DOMContentLoaded", () => {
    attachDzsoniSpeech(); // automatikus minden dzsoni-sticky elemhez
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
