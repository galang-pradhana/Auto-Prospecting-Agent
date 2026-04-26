import { callKieAI } from './lib/actions/ai';
import { LEAD_EVALUATION_PROMPT } from './lib/prompts';

async function run() {
    console.log("Starting test...");
    const prompt = LEAD_EVALUATION_PROMPT
        .replace('[name]', 'Bali Shanti Wedding')
        .replace('[category]', 'Wedding Organizer')
        .replace('[city]', 'Denpasar')
        .replace('[province]', 'Bali')
        .replace('[district]', 'Denpasar Barat')
        .replace('[rating]', '4.8')
        .replace('[wa]', '081234567890')
        .replace('[website]', 'N/A')
        .replace('[reviewsCount]', '45')
        .replace('[address]', 'Jl. Teuku Umar, Denpasar Barat');

    try {
        const response = await callKieAI(prompt);
        console.log("Raw Response:", response);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
