
const exchangeRateApiKey = "c9623b0e6da83f06ef1bc4d7";
const exchangeRateApiBaseUrl = `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}`; // Base for different endpoints

const geminiApiKey = "AIzaSyCpln8wOSDC0zgXnv6h-Iay0gAs7eHgCUk"; // Your Google AI key
const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;

const supportedCurrenciesSet = new Set([ "USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "CNY", "HKD", "NZD", "SEK", "KRW", "SGD", "NOK", "MXN", "INR", "RUB", "ZAR", "TRY", "BRL", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BSD", "BTN", "BWP", "BYN", "BZD", "CDF", "CLF", "CLP", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "FJD", "FKP", "FOK", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD", "KES", "KGS", "KHR", "KID", "KMF", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MYR", "MZN", "NAD", "NGN", "NIO", "NPR", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "SAR", "SBD", "SCR", "SDG", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TTD", "TWD", "TZS", "UAH", "UGX", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR", "XOF", "XPF", "YER", "ZMW", "ZWL" ]);
const commonCurrencies = Array.from(supportedCurrenciesSet).sort();


let chatWindow, userInput, sendButton, clearChatButton, chatLoading,
    resultDisplayContent, formulaDisplayContent, rateDisplayContent,
    toggleConverterButton, quickConverterSection, amountInput,
    fromCurrencySelect, toCurrencySelect, convertButton,
    conversionResultDiv, converterLoading, converterErrorDiv;

function initializeDOMElements() {
    chatWindow = document.getElementById('chat-window');
    userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-button');
    clearChatButton = document.getElementById('clear-chat-button');
    chatLoading = document.getElementById('chat-loading');
    
    resultDisplayContent = document.getElementById('result-content');
    formulaDisplayContent = document.getElementById('formula-content');
    rateDisplayContent = document.getElementById('rate-content');
   
    toggleConverterButton = document.getElementById('toggle-converter-button');
    quickConverterSection = document.getElementById('quick-converter-section');
    amountInput = document.getElementById('amount-input');
    fromCurrencySelect = document.getElementById('from-currency');
    toCurrencySelect = document.getElementById('to-currency');
    convertButton = document.getElementById('convert-button');
    conversionResultDiv = document.getElementById('conversion-result');
    converterLoading = document.getElementById('converter-loading');
    converterErrorDiv = document.getElementById('converter-error');
}

document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    populateCurrencyDropdowns();
    addEventListeners();
    
    displayBotMessage("Hello! I'm an AI assistant. Ask me about currency conversions (e.g., '150 GBP to JPY') or chat about other topics!");
    clearInfoPanels();
});

function addEventListeners() {
    if (sendButton) sendButton.addEventListener('click', handleUserInput);
    if (userInput) userInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') handleUserInput(); });
    if (clearChatButton) clearChatButton.addEventListener('click', clearChat);
    if (convertButton) convertButton.addEventListener('click', handleQuickConversion);
    if (toggleConverterButton) toggleConverterButton.addEventListener('click', toggleQuickConverter);
}


function displayMessage(text, sender, isError = false) {
     if (!chatWindow) return;
     const messageDiv = document.createElement('div');
     messageDiv.classList.add('message', sender);
     if (isError) messageDiv.classList.add('error');
     const senderLabel = document.createElement('div');
     senderLabel.classList.add('sender-label');
     senderLabel.textContent = sender === 'user' ? 'You' : 'Bot';
     const bubbleDiv = document.createElement('div');
     bubbleDiv.classList.add('bubble');
     if (sender === 'bot' && !isError) {
        
         let sanitizedHtml = text.replace(/</g, "<").replace(/>/g, ">")
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/`(.*?)`/g, '<code>$1</code>')
                              .replace(/\n/g, '<br>');
         
         sanitizedHtml = sanitizedHtml.replace(/#### (.*?)(<br>|$)/g, '<h4>$1</h4>');
         bubbleDiv.innerHTML = sanitizedHtml;
     } else { bubbleDiv.textContent = text; }
     messageDiv.appendChild(senderLabel); messageDiv.appendChild(bubbleDiv);
     chatWindow.appendChild(messageDiv); chatWindow.scrollTop = chatWindow.scrollHeight;
}
function displayUserMessage(text) { displayMessage(text, 'user'); }
function displayBotMessage(text) { displayMessage(text, 'bot'); }
function displayErrorMessage(text) {
    displayMessage(text, 'bot', true);
    console.error("Chatbot Error:", text);
    clearInfoPanels();
}

function setLoading(isLoading, type = 'chat') {
    const indicator = type === 'chat' ? chatLoading : converterLoading;
    const buttonsToDisable = type === 'chat' ? [sendButton, clearChatButton] : [convertButton];
    const inputsToDisable = type === 'chat' ? [userInput] : [amountInput, fromCurrencySelect, toCurrencySelect];
    if (indicator) indicator.style.display = isLoading ? 'block' : 'none';
    buttonsToDisable.forEach(btn => { if (btn) btn.disabled = isLoading; });
    inputsToDisable.forEach(input => { if (input) input.disabled = isLoading; });
}

function clearChat() {
    if (chatWindow) chatWindow.innerHTML = '';
    clearInfoPanels();
    
    displayBotMessage("Chat cleared. How can I help?");
}

function toggleQuickConverter() {
    if (!quickConverterSection || !toggleConverterButton) return;
    quickConverterSection.classList.toggle('visible');
    toggleConverterButton.textContent = quickConverterSection.classList.contains('visible') ? 'Hide Quick Check Tool' : 'Show Quick Check Tool';
    toggleConverterButton.title = quickConverterSection.classList.contains('visible') ? 'Hide Quick Check Tool' : 'Show Quick Check Tool';
}

function clearInfoPanels() {
    if (resultDisplayContent) resultDisplayContent.textContent = 'N/A';
    if (formulaDisplayContent) formulaDisplayContent.textContent = 'N/A';
    if (rateDisplayContent) rateDisplayContent.textContent = 'N/A';
}

function updateInfoPanels(resultText, formulaText, rateText) {
    if (resultDisplayContent) resultDisplayContent.innerHTML = resultText || 'N/A';
    if (formulaDisplayContent) formulaDisplayContent.innerHTML = formulaText || 'N/A';
    if (rateDisplayContent) rateDisplayContent.innerHTML = rateText || 'N/A';
}



async function handleUserInput() {
    if (!userInput || !chatLoading || !resultDisplayContent || !formulaDisplayContent || !rateDisplayContent) {
        console.error("Required DOM elements not found for handleUserInput.");
        return;
    }

    const messageText = userInput.value.trim();
    if (!messageText) return;

    displayUserMessage(messageText);
    userInput.value = '';
    setLoading(true, 'chat');
    chatLoading.textContent = "Thinking..."; 
    clearInfoPanels();

    try {
        
        const initialPrompt = `
            You are a helpful AI assistant. Analyze the user's request: "${messageText}".

            Perform ONE of the following actions:
            1.  IF the request looks like a currency conversion (e.g., "convert 100 USD to EUR", "50 gbp in jpy"): Extract the amount, 'from' currency code, and 'to' currency code. Respond ONLY with a JSON object in the format:
                \`\`\`json
                {"action": "convert", "parameters": {"amount": <num>, "from": "<CODE>", "to": "<CODE>"}}
                \`\`\`
                (Use 1 if amount missing. Ensure codes are valid 3-letter codes.)
            2.  IF it's NOT a clear currency conversion request: Respond directly and helpfully to the user's query as a general AI assistant.

            Provide ONLY the JSON (for action 1) or the direct text answer (for action 2).
        `;

        const firstAIResponse = await getRawAIResponse(initialPrompt);

       
        let parsedParams = null;
        let isConversion = false;

        

        try {
            // Try to parse as JSON to see if it's a conversion request
            const jsonMatch = firstAIResponse.match(/```json\s*([\s\S]*?)\s*```/);
            const potentialJson = jsonMatch ? jsonMatch[1] : firstAIResponse;
            const parsedData = JSON.parse(potentialJson);

            if (parsedData.action === "convert" && parsedData.parameters) {
                parsedParams = parsedData.parameters;
                
                if (typeof parsedParams.amount !== 'number' || isNaN(parsedParams.amount) || parsedParams.amount <= 0 ||
                    typeof parsedParams.from !== 'string' || !supportedCurrenciesSet.has(parsedParams.from) ||
                    typeof parsedParams.to !== 'string' || !supportedCurrenciesSet.has(parsedParams.to)) {
                    
                    console.warn("AI identified conversion but parameters invalid. Treating as general text.", parsedParams);
                    displayBotMessage(firstAIResponse); 
                    return;
                }
                if (parsedParams.from === parsedParams.to) {
                    displayBotMessage(`No conversion needed for ${parsedParams.amount.toLocaleString()} ${parsedParams.from}.`);
                    return;
                }
                isConversion = true;
                chatLoading.textContent = "Fetching exchange rate...";
            } else {
                
                displayBotMessage(firstAIResponse);
                return;
            }
        } catch (e) {
            
            displayBotMessage(firstAIResponse);
            return; 
        }

        
        if (isConversion && parsedParams) {
            const { amount, from, to } = parsedParams;

            
            const latestRatesData = await fetchExchangeRates(`${exchangeRateApiBaseUrl}/latest/${from}`);
            const latestRate = latestRatesData.conversion_rates[to];
            if (!latestRate) {
                
                 displayErrorMessage(`Sorry, I couldn't get the current exchange rate from ${from} to ${to}. Please check the currency codes.`);
                 return; 
            }

            
            const convertedAmount = amount * latestRate;

            
            const rateText = `1 ${from} = <strong>${latestRate.toFixed(5)}</strong> ${to}`;

            
            chatLoading.textContent = "Formatting results...";
            
            const finalPrompt = `
                You are an AI assistant presenting currency conversion results.
                The user asked to convert ${amount} ${from} to ${to}.
                Data fetched:
                - Latest Rate: 1 ${from} = ${latestRate.toFixed(5)} ${to}
                - Calculated Result: ${amount.toLocaleString()} ${from} ≈ ${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${to}

                Present this in the CHAT WINDOW using markdown headers:
                #### Result
                (State the conversion result clearly)

                #### Formula Used
                (Show formula: \`Converted Amount = Amount * Rate\`. Include values: \`${amount.toLocaleString()} * ${latestRate.toFixed(5)}\`)

                #### Tips & Information
                (Provide 1-2 brief, potentially relevant tips or bits of information. Can be about rates, currencies, or a related follow-up.)

                Use simple markdown like **bold** or \`code\`. Keep the presentation clear.
            `;

            const finalAIResponse = await getRawAIResponse(finalPrompt);

           
            displayBotMessage(finalAIResponse);

            
            let resultForPanel = 'Could not extract from AI response.';
            let formulaForPanel = 'Could not extract from AI response.';

            const resultMatch = finalAIResponse.match(/#### Result\s*([\s\S]*?)(?=#### Formula Used|#### Tips & Information|$)/i);
            if (resultMatch && resultMatch[1]) {
                resultForPanel = resultMatch[1].trim().replace(/<strong>(.*?)<\/strong>/g, '$1').replace(/<code>(.*?)<\/code>/g, '$1').replace(/<br>/g, '\n');
            }

            const formulaMatch = finalAIResponse.match(/#### Formula Used\s*([\s\S]*?)(?=#### Tips & Information|$)/i);
            if (formulaMatch && formulaMatch[1]) {
                formulaForPanel = formulaMatch[1].trim().replace(/`(.*?)`/g, '<code>$1</code>').replace(/<br>/g, '\n');
            }

            
            updateInfoPanels(resultForPanel, formulaForPanel, rateText);
        }

    } catch (error) {
        console.error("Error in handleUserInput:", error);
        
        if (!chatWindow.querySelector('.message.error')) { 
             displayErrorMessage(`An unexpected error occurred: ${error.message}`);
        }
        clearInfoPanels();
    } finally {
        setLoading(false, 'chat');
        if (chatLoading) chatLoading.textContent = "Thinking...";
    }
}



async function getRawAIResponse(prompt) {
    
    const safetyThreshold = "BLOCK_MEDIUM_AND_ABOVE"; 

    if (!geminiApiKey) throw new Error("AI API key is missing.");
    try {
        const response = await fetch(geminiApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], safetySettings: [ { category: "HARM_CATEGORY_HARASSMENT", threshold: safetyThreshold }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: safetyThreshold }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: safetyThreshold }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: safetyThreshold } ], generationConfig: { temperature: 0.7 } // Increased temperature slightly for more varied chat
         }), });
        if (!response.ok) { const errorData = await response.json(); console.error("Gemini API Error Response:", errorData); throw new Error(`AI API Error (${response.status}): ${errorData.error?.message || 'Unknown AI error'}`); }
        const data = await response.json();
        if (data.promptFeedback?.blockReason) { throw new Error(`AI request blocked by safety filters: ${data.promptFeedback.blockReason}`); }
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) { const finishReason = data.candidates?.[0]?.finishReason; if (finishReason && finishReason !== 'STOP') { throw new Error(`AI generation stopped unexpectedly (Reason: ${finishReason}).`); } throw new Error("AI returned an empty or invalid response."); }
        return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        console.error("Error calling Gemini AI:", error);
        if (error instanceof Error && error.message.includes('AI API Error')) throw error;
        throw new Error(`Failed to get response from AI. (${error.message})`);
    }
}


async function fetchExchangeRates(apiUrl) {
    if (!exchangeRateApiKey) { throw new Error("Exchange Rate API key is missing."); }
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) { let errorMsg = `API Request Failed (${response.status})`; try { const errorData = await response.json(); if (errorData?.['error-type']) { errorMsg += `: ${errorData['error-type']}`; } else { errorMsg += `: ${response.statusText}`; } } catch (e) { errorMsg += `: ${response.statusText}`; } throw new Error(errorMsg); }
        const data = await response.json();
        if (data.result === 'error') { throw new Error(`Exchange Rate API Error: ${data['error-type'] || 'Unknown API error'}`); }
        if (!data.conversion_rates) { throw new Error("Invalid data format from Exchange Rate API: 'conversion_rates' missing."); }
        return data;
    } catch (error) {
        console.error(`Error fetching from ${apiUrl}:`, error);
        throw new Error(`Could not fetch exchange rates. (${error.message})`);
    }
}


function populateCurrencyDropdowns() {
    const selects = [fromCurrencySelect, toCurrencySelect];
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        commonCurrencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency; option.textContent = currency;
            select.appendChild(option);
        });
    });
    if (fromCurrencySelect) fromCurrencySelect.value = "USD";
    if (toCurrencySelect) toCurrencySelect.value = "EUR";
}

async function handleQuickConversion() {
    if (!amountInput || !fromCurrencySelect || !toCurrencySelect || !converterErrorDiv || !conversionResultDiv || !converterLoading) return;
    const amount = parseFloat(amountInput.value);
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;
    converterErrorDiv.textContent = '';
    conversionResultDiv.textContent = 'Result';
    if (isNaN(amount) || amount <= 0) { converterErrorDiv.textContent = "Invalid amount."; return; }
    if (fromCurrency === toCurrency) { converterErrorDiv.textContent = "Same currency."; return; }
    setLoading(true, 'converter');
    try {
        const ratesData = await fetchExchangeRates(`${exchangeRateApiBaseUrl}/latest/${fromCurrency}`);
        const rate = ratesData.conversion_rates[toCurrency];
        if (rate) {
            const convertedAmount = (amount * rate).toFixed(4);
            conversionResultDiv.textContent = `${amount.toLocaleString()} ${fromCurrency} = ${Number(convertedAmount).toLocaleString()} ${toCurrency}`;
        } else { throw new Error(`Rate for ${toCurrency} not found.`); }
    } catch (error) {
        console.error("Quick conversion error:", error);
        converterErrorDiv.textContent = `Error: ${error.message}.`;
        conversionResultDiv.textContent = 'Failed';
    } finally { setLoading(false, 'converter'); }
}