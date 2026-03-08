// script.js

document.addEventListener("DOMContentLoaded", function () {
    attachDzsoniSpeech();

    var supported = ['en', 'hu', 'de'];
    var savedLang = localStorage.getItem('lang');
    var parts = window.location.pathname.split('/');
    var currentLang = parts[1];

    if (window.location.pathname === '/' && savedLang && supported.indexOf(savedLang) !== -1) {
        window.location.href = '/' + savedLang + '/index.html';
        return;
    }

    if (!savedLang && supported.indexOf(currentLang) !== -1) {
        localStorage.setItem('lang', currentLang);
    }

    var selector = document.getElementById('language');
    if (selector && supported.indexOf(currentLang) !== -1) {
        selector.value = '/' + currentLang + '/index.html';
    }

    translatePage(currentLang || savedLang || detectBrowserLanguage());

    initLazyAutocomplete();
});

var mapsApiPromise = null;
var autocompleteInitialized = false;

function loadGoogleMapsPlacesApi() {
    if (mapsApiPromise) {
        return mapsApiPromise;
    }

    mapsApiPromise = new Promise(function (resolve, reject) {
        if (window.google && window.google.maps && window.google.maps.places) {
            resolve(window.google);
            return;
        }

        var existingScript = document.querySelector('script[data-google-maps="places"]');
        if (existingScript) {
            existingScript.addEventListener('load', function () {
                if (window.google && window.google.maps && window.google.maps.places) {
                    resolve(window.google);
                } else {
                    reject(new Error("Google Maps Places API betoltott, de a places nem erheto el."));
                }
            });
            existingScript.addEventListener('error', function () {
                reject(new Error("Google Maps API betoltese sikertelen."));
            });
            return;
        }

        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBdUZ8hQ6M5X1P2dLqBmtpDal8iAkH2_q4&libraries=places&loading=async';
        script.async = true;
        script.defer = true;
        script.setAttribute('data-google-maps', 'places');

        script.onload = function () {
            if (window.google && window.google.maps && window.google.maps.places) {
                resolve(window.google);
            } else {
                reject(new Error("Google Maps Places API betoltott, de a places nem erheto el."));
            }
        };

        script.onerror = function () {
            reject(new Error("Google Maps API betoltese sikertelen."));
        };

        document.head.appendChild(script);
    });

    return mapsApiPromise;
}

function initLazyAutocomplete() {
    var addressInput = document.getElementById('address');
    if (!addressInput) return;

    function activateAutocomplete() {
        if (autocompleteInitialized) return;

        loadGoogleMapsPlacesApi()
            .then(function () {
                new google.maps.places.Autocomplete(addressInput, {
                    types: ['geocode'],
                    componentRestrictions: { country: 'hu' }
                });

                autocompleteInitialized = true;
            })
            .catch(function (error) {
                console.error(error);
            });
    }

    addressInput.addEventListener('focus', activateAutocomplete, { once: true });
    addressInput.addEventListener('pointerdown', activateAutocomplete, { once: true });
    addressInput.addEventListener('touchstart', activateAutocomplete, { once: true });
}

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
        const currentLang = document.documentElement.lang || lang;
        const dzsoni = document.getElementById(id);
        if (!dzsoni) return;

        // Már van buborék? Ne adjunk hozzá mégegyet
        if (dzsoni.querySelector('.speech-bubble')) return;

        const bubble = document.createElement("div");
        bubble.classList.add("speech-bubble");
        bubble.textContent = translations[lang]?.[key] || key;

        dzsoni.appendChild(bubble);

        dzsoni.addEventListener("mouseenter", () => {
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
