require('dotenv').config({ path: '.env' })
const { LEAD_EVALUATION_PROMPT } = require('./lib/prompts.ts');

async function run() {
    // Read the prompt from the compiled JS or just hardcode it for the test
    const fs = require('fs');
    const promptsFile = fs.readFileSync('./lib/prompts.ts', 'utf8');
    const promptMatch = promptsFile.match(/export const LEAD_EVALUATION_PROMPT = `([\s\S]*?)`;/);
    let promptTemplate = promptMatch ? promptMatch[1] : '';

    if (!promptTemplate) {
        console.error("Could not find prompt template");
        return;
    }

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

    console.log("Calling Kie.ai...");
    
    try {
        const res = await fetch('https://api.kie.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.KIE_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gemini-2.5-flash',
                messages: [
                    { role: 'user', content: finalPrompt }
                ],
                temperature: 0.2
            })
        });

        const data = await res.json();
        console.log(JSON.stringify(data.choices[0].message.content, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
