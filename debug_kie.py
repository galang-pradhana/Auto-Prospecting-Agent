import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def debug_enrichment():
    api_key = os.getenv("KIE_AI_API_KEY")
    # Coba endpoint ini, sesuaikan dengan hasil check_credit yang sukses tadi
    url = "https://api.kie.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Payload minimalis untuk tes koneksi
    payload = {
        "model": "gpt-4o-mini", 
        "messages": [{"role": "user", "content": "p"}],
        "max_tokens": 5
    }

    print(f"[*] Menembak Endpoint: {url}")
    try:
        response = requests.post(url, headers=headers, json=payload)
        print(f"[*] Status Code: {response.status_code}")
        print(f"[*] Raw Response: {response.text}")
        
        if response.status_code == 404:
            print("\n[!] ANALISIS: Endpoint 404. Kie.ai tidak mengenali path ini.")
            print("[?] Coba cek dashboard Kie.ai, apakah URL base-nya benar-benar /api/v1 atau langsung /v1?")
        elif response.status_code == 400:
            print("\n[!] ANALISIS: Bad Request. Biasanya karena nama MODEL salah.")
            
    except Exception as e:
        print(f"[!] Koneksi gagal total: {e}")

if __name__ == "__main__":
    debug_enrichment()