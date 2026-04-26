import { callKieAI } from './lib/actions/ai';
import { LEAD_EVALUATION_PROMPT } from './lib/prompts';

async function run() {
    const finalPrompt = LEAD_EVALUATION_PROMPT
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

    console.log("Calling AI...");
    try {
        const aiResponse = await callKieAI(finalPrompt);
        console.log("AI Response:");
        console.log(aiResponse);
    } catch (e) {
        console.error(e);
    }
}
run();
