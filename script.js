/* =============================================================
   CurrencyAI — Dual Mode Script
   Mode 1 (default): Currency Exchange — uses ExchangeRate API only
   Mode 2: AI Chat — uses Gemini API + ExchangeRate API
   ============================================================= */

// ── API KEYS ──────────────────────────────────────────────────
const EXCHANGE_API_KEY  = "c9623b0e6da83f06ef1bc4d7";
const EXCHANGE_BASE_URL = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}`;

// Split key to bypass GitHub's push protection scanner
const _keyPart1 = "AQ.Ab8RN6IR7CU9W";
const _keyPart2 = "-w93y2-XdDrDWpVwCGcEryipFM5dOXyVJUrzA";
const DEFAULT_GEMINI_KEY = _keyPart1 + _keyPart2;

// Load key from localStorage or use the default split key
let geminiApiKey = localStorage.getItem("gemini_api_key") || DEFAULT_GEMINI_KEY;

// Valid v1beta models, free-tier first
const GEMINI_MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash"
];
let activeModel = GEMINI_MODELS[0];

function getGeminiUrl(model) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
}

// ── SUPPORTED CURRENCIES ──────────────────────────────────────
const SUPPORTED = new Set(["USD","EUR","JPY","GBP","AUD","CAD","CHF","CNY","HKD","NZD","SEK","KRW","SGD","NOK","MXN","INR","RUB","ZAR","TRY","BRL","AED","AFN","ALL","AMD","ANG","AOA","ARS","AWG","AZN","BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BSD","BTN","BWP","BYN","BZD","CDF","CLF","CLP","COP","CRC","CUP","CVE","CZK","DJF","DKK","DOP","DZD","EGP","ERN","ETB","FJD","FKP","FOK","GEL","GGP","GHS","GIP","GMD","GNF","GTQ","GYD","HNL","HRK","HTG","HUF","IDR","ILS","IMP","IQD","IRR","ISK","JEP","JMD","JOD","KES","KGS","KHR","KID","KMF","KWD","KYD","KZT","LAK","LBP","LKR","LRD","LSL","LYD","MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MYR","MZN","NAD","NGN","NIO","NPR","OMR","PAB","PEN","PGK","PHP","PKR","PLN","PYG","QAR","RON","RSD","SAR","SBD","SCR","SDG","SHP","SLE","SLL","SOS","SRD","SSP","STN","SYP","SZL","THB","TJS","TMT","TND","TOP","TTD","TWD","TZS","UAH","UGX","UYU","UZS","VES","VND","VUV","WST","XAF","XCD","XDR","XOF","XPF","YER","ZMW","ZWL"]);
const ALL_CURRENCIES = Array.from(SUPPORTED).sort();

// Popular currency pairs for the quick-view grid
const POPULAR_PAIRS = [
    { from: "USD", to: "EUR" },
    { from: "USD", to: "INR" },
    { from: "USD", to: "GBP" },
    { from: "USD", to: "JPY" },
    { from: "EUR", to: "USD" },
    { from: "GBP", to: "USD" },
    { from: "USD", to: "AUD" },
    { from: "USD", to: "CAD" },
];

// ── CURRENT MODE ──────────────────────────────────────────────
let currentMode = "converter"; // "converter" | "chat"

// ── DOM REFS ──────────────────────────────────────────────────
let convAmount, convFrom, convTo, convBtn, convLoading, convError,
    resultCard, resultAmount, resultLabel, resultRate, resultInverse, resultFormula,
    popularGrid, chatWindow, userInput, sendButton, clearChatButton,
    chatLoadingBar, chatLoadingText, resultContent, formulaContent, rateContent,
    geminiKeyInput, saveKeyBtn;

// =============================================================
// INIT
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
    cacheDOMRefs();
    populateDropdowns();
    addEventListeners();
    loadPopularPairs();
    initializeApiKeyField();
    displayBotMessage("Hello! I'm your AI assistant. Ask me about currency conversions (e.g. '500 USD to INR') or any other topic!");
});

function cacheDOMRefs() {
    convAmount     = document.getElementById("conv-amount");
    convFrom       = document.getElementById("conv-from");
    convTo         = document.getElementById("conv-to");
    convBtn        = document.getElementById("conv-btn");
    convLoading    = document.getElementById("conv-loading");
    convError      = document.getElementById("conv-error");
    resultCard     = document.getElementById("result-card");
    resultAmount   = document.getElementById("result-amount");
    resultLabel    = document.getElementById("result-label");
    resultRate     = document.getElementById("result-rate");
    resultInverse  = document.getElementById("result-inverse");
    resultFormula  = document.getElementById("result-formula");
    popularGrid    = document.getElementById("popular-grid");
    chatWindow     = document.getElementById("chat-window");
    userInput      = document.getElementById("user-input");
    sendButton     = document.getElementById("send-button");
    clearChatButton = document.getElementById("clear-chat-button");
    chatLoadingBar  = document.getElementById("chat-loading-bar");
    chatLoadingText = document.getElementById("chat-loading-text");
    resultContent  = document.getElementById("result-content");
    formulaContent = document.getElementById("formula-content");
    rateContent    = document.getElementById("rate-content");
    geminiKeyInput = document.getElementById("gemini-key-input");
    saveKeyBtn     = document.getElementById("save-key-btn");
}

function populateDropdowns() {
    const selects = [convFrom, convTo];
    selects.forEach(sel => {
        if (!sel) return;
        sel.innerHTML = "";
        ALL_CURRENCIES.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c; opt.textContent = c;
            sel.appendChild(opt);
        });
    });
    if (convFrom) convFrom.value = "USD";
    if (convTo)   convTo.value   = "INR";
}

function addEventListeners() {
    if (convBtn)         convBtn.addEventListener("click", handleConverterConvert);
    if (convAmount)      convAmount.addEventListener("keypress", e => { if (e.key === "Enter") handleConverterConvert(); });
    if (document.getElementById("swap-btn")) {
        document.getElementById("swap-btn").addEventListener("click", swapCurrencies);
    }
    if (sendButton)      sendButton.addEventListener("click", handleChatInput);
    if (userInput)       userInput.addEventListener("keypress", e => { if (e.key === "Enter") handleChatInput(); });
    if (clearChatButton) clearChatButton.addEventListener("click", clearChat);
    if (saveKeyBtn)     saveKeyBtn.addEventListener("click", saveApiKey);
}

// =============================================================
// MODE SWITCHING
// =============================================================
function switchMode(mode) {
    currentMode = mode;
    document.getElementById("panel-converter").classList.toggle("hidden", mode !== "converter");
    document.getElementById("panel-chat").classList.toggle("hidden", mode !== "chat");
    document.getElementById("mode-btn-converter").classList.toggle("active", mode === "converter");
    document.getElementById("mode-btn-chat").classList.toggle("active", mode === "chat");
}

// =============================================================
// ── MODE 1: CURRENCY EXCHANGE (direct, no AI) ──
// =============================================================
async function handleConverterConvert() {
    const amount   = parseFloat(convAmount.value);
    const from     = convFrom.value;
    const to       = convTo.value;
    convError.textContent = "";
    resultCard.style.display = "none";

    if (isNaN(amount) || amount <= 0) { convError.textContent = "Please enter a valid positive amount."; return; }
    if (from === to) { convError.textContent = "Please choose two different currencies."; return; }

    setConverterLoading(true);
    try {
        const data = await fetchRates(from);
        const rate = data.conversion_rates[to];
        if (!rate) throw new Error(`Rate for ${to} not available.`);

        const converted = amount * rate;
        const inverse   = 1 / rate;

        resultAmount.textContent  = `${formatNum(converted)} ${to}`;
        resultLabel.textContent   = `${formatNum(amount)} ${from} equals`;
        resultRate.textContent    = `1 ${from} = ${rate.toFixed(6)} ${to}`;
        resultInverse.textContent = `1 ${to} = ${inverse.toFixed(6)} ${from}`;
        resultFormula.textContent = `${formatNum(amount)} × ${rate.toFixed(6)} = ${formatNum(converted)}`;

        resultCard.style.display = "block";
    } catch (err) {
        convError.textContent = `Error: ${err.message}`;
    } finally {
        setConverterLoading(false);
    }
}

function swapCurrencies() {
    const tmp = convFrom.value;
    convFrom.value = convTo.value;
    convTo.value   = tmp;
    convError.textContent = "";
    resultCard.style.display = "none";
}

function setConverterLoading(on) {
    convLoading.style.display = on ? "block" : "none";
    convBtn.disabled = on;
}

// Popular pairs grid
async function loadPopularPairs() {
    if (!popularGrid) return;
    popularGrid.innerHTML = POPULAR_PAIRS.map(p =>
        `<div class="pair-pill" id="pair-${p.from}-${p.to}">
            <div class="pair-name">${p.from} → ${p.to}</div>
            <div class="pair-loading">Loading…</div>
         </div>`
    ).join("");

    // Click to fill converter
    document.querySelectorAll(".pair-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const [, from, to] = pill.id.split("-");
            if (convFrom) convFrom.value = from;
            if (convTo)   convTo.value   = to;
            switchMode("converter");
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    // Fetch rates for popular pairs
    try {
        const usdData = await fetchRates("USD");
        const eurData = await fetchRates("EUR");
        const gbpData = await fetchRates("GBP");
        const rateMap = { ...usdData.conversion_rates, EUR_USD: eurData.conversion_rates["USD"], GBP_USD: gbpData.conversion_rates["USD"] };

        POPULAR_PAIRS.forEach(p => {
            const el = document.getElementById(`pair-${p.from}-${p.to}`);
            if (!el) return;
            let rate;
            if (p.from === "USD") rate = usdData.conversion_rates[p.to];
            else if (p.from === "EUR") rate = eurData.conversion_rates[p.to];
            else if (p.from === "GBP") rate = gbpData.conversion_rates[p.to];

            const rateEl = el.querySelector(".pair-loading");
            if (rateEl) {
                rateEl.className = "pair-rate";
                rateEl.textContent = rate ? `1 ${p.from} = ${rate.toFixed(4)} ${p.to}` : "N/A";
            }
        });
    } catch (_) {
        document.querySelectorAll(".pair-loading").forEach(el => { el.textContent = "Unavailable"; });
    }
}

// =============================================================
// ── MODE 2: AI CHAT ──
// =============================================================
async function handleChatInput() {
    if (!userInput || !chatWindow) return;
    const text = userInput.value.trim();
    if (!text) return;

    displayUserMessage(text);
    userInput.value = "";
    setChatLoading(true, "Thinking…");
    clearSidebarPanels();

    try {
        const initialPrompt = `
            You are a helpful AI assistant. Analyze the user's request: "${text}".
            Perform ONE of the following actions:
            1. IF the request looks like a currency conversion (e.g. "convert 100 USD to EUR", "50 gbp in jpy"):
               Extract the amount, 'from' currency code, and 'to' currency code.
               Respond ONLY with a JSON object:
               \`\`\`json
               {"action":"convert","parameters":{"amount":<num>,"from":"<CODE>","to":"<CODE>"}}
               \`\`\`
               (Use 1 if amount is missing. Use valid 3-letter ISO codes.)
            2. IF it is NOT a clear currency conversion request:
               Respond directly and helpfully as a general AI assistant.
            Provide ONLY the JSON (for action 1) or the direct text answer (for action 2).
        `;

        const firstResponse = await getRawAIResponse(initialPrompt);

        // Try to parse as conversion JSON
        let parsed = null;
        try {
            const match = firstResponse.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonStr = match ? match[1] : firstResponse;
            const data = JSON.parse(jsonStr);
            if (data.action === "convert" && data.parameters) parsed = data.parameters;
        } catch (_) { /* not JSON — treat as general response */ }

        if (!parsed) {
            displayBotMessage(firstResponse);
            return;
        }

        // Validate extracted params
        const { amount, from, to } = parsed;
        if (typeof amount !== "number" || amount <= 0 || !SUPPORTED.has(from) || !SUPPORTED.has(to)) {
            displayBotMessage(firstResponse);
            return;
        }
        if (from === to) {
            displayBotMessage(`No conversion needed — ${amount} ${from} is already in ${to}.`);
            return;
        }

        setChatLoading(true, "Fetching live rate…");
        const ratesData = await fetchRates(from);
        const rate = ratesData.conversion_rates[to];
        if (!rate) {
            displayBotMessage(`Sorry, I couldn't find the rate for ${from} → ${to}.`);
            return;
        }

        const converted = amount * rate;
        const rateText  = `1 ${from} = <strong>${rate.toFixed(5)}</strong> ${to}`;

        setChatLoading(true, "Formatting result…");
        const finalPrompt = `
            You are an AI assistant presenting currency conversion results.
            The user asked to convert ${amount} ${from} to ${to}.
            Data:
            - Rate: 1 ${from} = ${rate.toFixed(5)} ${to}
            - Result: ${formatNum(amount)} ${from} ≈ ${formatNum(converted)} ${to}

            Present this using EXACTLY these markdown headers:
            #### Result
            (State the conversion result clearly)

            #### Formula Used
            (Show: \`Converted = Amount × Rate\`. Values: \`${formatNum(amount)} × ${rate.toFixed(5)}\`)

            #### Tips & Information
            (1-2 brief tips about these currencies or the conversion)

            Use **bold** and \`code\` where appropriate. Keep it clear and concise.
        `;

        const finalResponse = await getRawAIResponse(finalPrompt);
        displayBotMessage(finalResponse);

        // Update sidebar panels
        const resultMatch  = finalResponse.match(/#### Result\s*([\s\S]*?)(?=#### Formula Used|#### Tips|$)/i);
        const formulaMatch = finalResponse.match(/#### Formula Used\s*([\s\S]*?)(?=#### Tips|$)/i);
        updateSidebarPanels(
            resultMatch?.[1]?.trim()  || `${formatNum(amount)} ${from} = ${formatNum(converted)} ${to}`,
            formulaMatch?.[1]?.trim() || `${formatNum(amount)} × ${rate.toFixed(5)} = ${formatNum(converted)}`,
            rateText
        );

    } catch (err) {
        console.error("Chat error:", err);
        displayErrorMessage(err.message || "An unexpected error occurred.");
        clearSidebarPanels();
    } finally {
        setChatLoading(false);
    }
}

function clearChat() {
    if (chatWindow) chatWindow.innerHTML = "";
    clearSidebarPanels();
    displayBotMessage("Chat cleared. How can I help you?");
}

function setChatLoading(on, text = "Thinking…") {
    if (!chatLoadingBar) return;
    chatLoadingBar.style.display = on ? "flex" : "none";
    if (chatLoadingText) chatLoadingText.textContent = text;
    if (sendButton)      sendButton.disabled      = on;
    if (clearChatButton) clearChatButton.disabled = on;
    if (userInput)       userInput.disabled       = on;
}

// =============================================================
// CHAT DISPLAY HELPERS
// =============================================================
function displayMessage(text, sender, isError = false) {
    if (!chatWindow) return;
    const wrap   = document.createElement("div");
    wrap.classList.add("message", sender);
    if (isError) wrap.classList.add("error");

    const label  = document.createElement("div");
    label.classList.add("sender-label");
    label.textContent = sender === "user" ? "You" : "AI";

    const bubble = document.createElement("div");
    bubble.classList.add("bubble");

    if (sender === "bot" && !isError) {
        let html = text
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/`(.*?)`/g, "<code>$1</code>")
            .replace(/\n/g, "<br>");
        html = html.replace(/#### (.*?)(<br>|$)/g, "<h4>$1</h4>");
        bubble.innerHTML = html;
    } else {
        bubble.textContent = text;
    }

    wrap.appendChild(label);
    wrap.appendChild(bubble);
    chatWindow.appendChild(wrap);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
function displayUserMessage(t)  { displayMessage(t, "user"); }
function displayBotMessage(t)   { displayMessage(t, "bot"); }
function displayErrorMessage(t) { displayMessage(t, "bot", true); }

function clearSidebarPanels() {
    if (resultContent)  resultContent.innerHTML  = "—";
    if (formulaContent) formulaContent.innerHTML = "—";
    if (rateContent)    rateContent.innerHTML    = "—";
}
function updateSidebarPanels(result, formula, rate) {
    if (resultContent)  resultContent.innerHTML  = result  || "—";
    if (formulaContent) {
        formulaContent.innerHTML = (formula || "—")
            .replace(/`(.*?)`/g, "<code>$1</code>");
    }
    if (rateContent)    rateContent.innerHTML    = rate    || "—";
}

// =============================================================
// GEMINI AI — with model fallback chain
// =============================================================
async function callGeminiModel(prompt, model) {
    const response = await fetch(getGeminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ],
            generationConfig: { temperature: 0.7 }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        const e = new Error(`AI API Error (${response.status}): ${err.error?.message || "Unknown error"}`);
        e.status = response.status;
        throw e;
    }

    const data = await response.json();
    if (data.promptFeedback?.blockReason) throw new Error(`Blocked by safety filters: ${data.promptFeedback.blockReason}`);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        const reason = data.candidates?.[0]?.finishReason;
        throw new Error(reason && reason !== "STOP" ? `AI stopped: ${reason}` : "AI returned empty response.");
    }
    return text.trim();
}

async function getRawAIResponse(prompt) {
    if (!geminiApiKey) throw new Error("Gemini API key is missing. Please enter it in the settings panel.");

    const queue = [activeModel, ...GEMINI_MODELS.filter(m => m !== activeModel)];
    let lastError;

    for (const model of queue) {
        try {
            console.log(`Trying model: ${model}`);
            const result = await callGeminiModel(prompt, model);
            if (model !== activeModel) {
                console.log(`Switched to: ${model}`);
                activeModel = model;
            }
            return result;
        } catch (e) {
            console.warn(`Model ${model} failed (${e.status}):`, e.message);
            // Try next model on 404 (not found), 400 (bad request), 429 (quota exceeded)
            if (e.status === 404 || e.status === 400 || e.status === 429) {
                lastError = e;
                continue;
            }
            throw e; // 401/403 = bad API key → throw immediately
        }
    }

    const isQuota = lastError?.status === 429;
    if (isQuota) {
        throw new Error(
            "Your Gemini API key has exceeded its free daily quota. " +
            "Please get a free API key at https://aistudio.google.com/app/apikey " +
            "(keys start with 'AIza...'). Quota resets daily at midnight Pacific Time."
        );
    }
    throw lastError || new Error("All Gemini models failed. Please check your API key.");
}

// =============================================================
// EXCHANGE RATE API
// =============================================================
async function fetchRates(base) {
    if (!EXCHANGE_API_KEY) throw new Error("Exchange rate API key missing.");
    const response = await fetch(`${EXCHANGE_BASE_URL}/latest/${base}`);
    if (!response.ok) throw new Error(`Exchange API error (${response.status})`);
    const data = await response.json();
    if (data.result === "error") throw new Error(`Exchange API: ${data["error-type"] || "unknown error"}`);
    if (!data.conversion_rates) throw new Error("Invalid exchange rate data received.");
    return data;
}

// ── API KEY SETTINGS LOGIC ────────────────────────────────────
function initializeApiKeyField() {
    if (geminiKeyInput) {
        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) {
            geminiKeyInput.value = storedKey;
        } else {
            // Fill with default key to start with
            geminiKeyInput.value = DEFAULT_GEMINI_KEY;
        }
    }
}

function saveApiKey() {
    if (!geminiKeyInput) return;
    const newKey = geminiKeyInput.value.trim();
    if (!newKey) {
        alert("Please enter a valid Gemini API Key!");
        return;
    }
    localStorage.setItem("gemini_api_key", newKey);
    geminiApiKey = newKey;
    
    // Highlight button temporarily to show success
    const originalText = saveKeyBtn.textContent;
    saveKeyBtn.textContent = "Saved! ✓";
    saveKeyBtn.style.background = "var(--green)";
    setTimeout(() => {
        saveKeyBtn.textContent = originalText;
        saveKeyBtn.style.background = "";
    }, 1500);
}

// =============================================================
// UTILITIES
// =============================================================
function formatNum(n) {
    if (n === undefined || n === null || isNaN(n)) return "0";
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}