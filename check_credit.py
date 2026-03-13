import os
import requests
from dotenv import load_dotenv

load_dotenv()

def check_kie_credit():
    api_key = os.getenv("KIE_AI_API_KEY")
    # Alamat endpoint resmi untuk cek saldo
    url = "https://api.kie.ai/api/v1/chat/credit"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    print("[*] Menghubungi Kie.ai untuk verifikasi saldo...")
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            res_data = response.json()
            # Kie.ai biasanya mengembalikan data saldo di field 'data'
            balance = res_data.get('data', '0')
            print(f"[+] Koneksi Sukses!")
            print(f"[+] Saldo Kredit Anda: {balance} Credits")
        elif response.status_code == 404:
            print("[!] Error 404: Endpoint tidak ditemukan. Pastikan URL menggunakan /api/v1/")
        else:
            print(f"[!] Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[!] Gagal terkoneksi: {e}")

if __name__ == "__main__":
    check_kie_credit()