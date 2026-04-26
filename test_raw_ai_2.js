const https = require('https');
const fs = require('fs');

const promptsFile = fs.readFileSync('./lib/prompts.ts', 'utf8');
const promptMatch = promptsFile.match(/export const LEAD_EVALUATION_PROMPT = `([\s\S]*?)`;/);
const promptTemplate = promptMatch ? promptMatch[1] : '';

const finalPrompt = promptTemplate
    .replace('[name]', 'Rumah Makan Ampera Indah')
    .replace('[category]', 'Restoran Padang')
    .replace('[city]', 'Bukittinggi')
    .replace('[province]', 'Sumatera Barat')
    .replace('[district]', 'Guguk Panjang')
    .replace('[rating]', '4.5')
    .replace('[wa]', '081234567890')
    .replace('[website]', 'N/A')
    .replace('[reviewsCount]', '120')
    .replace('[address]', 'Jl. Sudirman No. 1, Guguk Panjang, Bukittinggi');

const data = JSON.stringify({
    model: 'gemini-2.5-flash',
    messages: [{ role: 'user', content: finalPrompt }],
    temperature: 0.2
});

const options = {
    hostname: 'api.kie.ai',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`
    }
};

const req = https.request(options, (res) => {
    let raw = '';
    res.on('data', (d) => raw += d);
    res.on('end', () => {
        try {
            const json = JSON.parse(raw);
            console.log(json.choices[0].message.content);
        } catch(e) {
            console.log("Raw:", raw);
        }
    });
});
req.write(data);
req.end();
