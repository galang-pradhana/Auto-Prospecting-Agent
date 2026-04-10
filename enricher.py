import json
import os
import requests
import time
import sys
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION (Senior Dev Logic) ---
KIE_AI_KEY = os.getenv("KIE_AI_API_KEY")
ENDPOINT = "https://api.kie.ai/gemini-3.1-pro/v1/chat/completions"

def enrich_with_gemini_3_1_pro(business_name, reviews, category=""):
    """
    Logika: Pakai Gemini 3.1 Pro via Kie.ai (BYOC).
    Streaming diaktifkan untuk menjaga koneksi tetap 'alive', lalu dijahit ulang.
    Category-aware: Tone branding disesuaikan dengan jenis bisnis.
    """
    reviews_text = " | ".join(reviews)
    
    # Category-specific tone instruction
    tone_map = {
        "Dental Clinic": "Gunakan gaya bahasa profesional, terpercaya, dan bersih. Fokus pada keamanan, higienitas, dan keahlian medis.",
        "Law Firm": "Gunakan gaya bahasa formal, autoritatif, dan prestisius. Fokus pada keadilan, kepercayaan, dan rekam jejak.",
        "Auto Detailing Service": "Gunakan gaya bahasa maskulin, premium, dan agresif. Fokus pada performa, kualitas, dan eksklusivitas.",
        "Wedding Organizer": "Gunakan gaya bahasa romantis, elegan, dan hangat. Fokus pada momen berharga, keindahan, dan memorable experience.",
        "Interior Design": "Gunakan gaya bahasa kreatif, modern, dan sophisticated. Fokus pada estetika, fungsionalitas, dan transformasi ruang.",
    }
    tone_instruction = tone_map.get(category, "Gunakan gaya bahasa yang sesuai dengan jenis bisnis ini, profesional namun ramah.")
    
    headers = {
        "Authorization": f"Bearer {KIE_AI_KEY}",
        "Content-Type": "application/json"
    }

    # Payload sesuai spesifikasi Gemini 3.1 Pro yang kamu lampirkan
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Ubah data UMKM ini jadi branding premium. Nama: {business_name}. "
                            f"Kategori: {category}. Review: {reviews_text}. "
                            f"Instruksi Tone: {tone_instruction} "
                            f"Output WAJIB JSON murni tanpa yapping."
                        )
                    }
                ]
            }
        ],
        "stream": True, # Stream aktif biar gak gampang timeout
        "include_thoughts": False, # ROI Focus: jangan buang kredit buat 'thoughts'
        "reasoning_effort": "high",  # Gemini 3.1 Pro is better at high reasoning
        "response_format": {
            "type": "json_object"
        }
    }

    full_content = ""
    try:
        # Timeout 90s buat model Pro yang lebih berat
        response = requests.post(url=ENDPOINT, headers=headers, json=payload, stream=True, timeout=90)
        
        if response.status_code != 200:
            print(f"   [!] API Error {response.status_code}: {response.text}")
            return None

        # Stitching/Menjahit potongan stream
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith('data: '):
                    if "[DONE]" in decoded_line: break
                    try:
                        chunk = json.loads(decoded_line[6:])
                        content = chunk.get('choices', [{}])[0].get('delta', {}).get('content', '')
                        full_content += content
                    except: continue
        
        if full_content:
            # Bersihkan backticks jika AI bandel
            clean_json = full_content.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
            
    except Exception as e:
        print(f"   [!] Runtime Error di {business_name}: {e}")
    
    return None

def main():
    print("[*] Engine Start: Memproses leads dengan Gemini 3.1 Pro (High Accuracy).")
    output_file = "enriched_results.json"
    
    if not os.path.exists("results.json"):
        print("[!] results.json hilang! Scrape dulu sana.")
        return

    with open("results.json", "r", encoding="utf-8") as f:
        leads = json.load(f)

    if not os.path.exists(output_file):
        with open(output_file, "w", encoding="utf-8") as f: json.dump([], f)

    # Target filtering if names provided via CLI
    target_names = sys.argv[1:] if len(sys.argv) > 1 else None
    
    for i, lead in enumerate(leads):
        # Skip if we have a specific target list and this lead isn't in it
        if target_names and lead['name'] not in target_names:
            continue
            
        with open(output_file, "r", encoding="utf-8") as f:
            enriched_data = json.load(f)
        
        if any(item['name'] == lead['name'] for item in enriched_data):
            print(f"[{i+1}/{len(leads)}] SKIP: '{lead['name']}' (Already in enriched_results.json)")
            continue

        print(f"[{i+1}/{len(leads)}] ENRICHING: '{lead['name']}' [{lead.get('category', 'N/A')}]...")
        
        review_texts = [r.get('Description', '') if isinstance(r, dict) else str(r) for r in lead.get('reviews', []) if r]
        result = enrich_with_gemini_3_1_pro(lead['name'], review_texts, lead.get('category', ''))
        
        if result:
            combined = { **lead, "ai_branding": result, "isEnriched": True }
            enriched_data.append(combined)
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(enriched_data, f, indent=4, ensure_ascii=False)
            
            # Update results.json with enriched status
            leads[i]["isEnriched"] = True
            with open("results.json", "w", encoding="utf-8") as f:
                json.dump(leads, f, indent=4, ensure_ascii=False)
                
            print(f"   [+] Sukses: Branding {lead['name']} siap pakai.")
        else:
            print(f"   [-] Gagal memoles {lead['name']}.")
        
        time.sleep(1) # Flash itu kenceng, 1 detik cukup buat napas

    print("\n[*] Phase 2 Selesai. Cek enriched_results.json.")

if __name__ == "__main__":
    main()