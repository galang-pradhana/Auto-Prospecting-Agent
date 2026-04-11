import (
	"fmt"
	"net/url"

	"github.com/gosom/google-maps-scraper/api"
)

// RenderTemplate prepares the WhatsApp message based on the template number and prospect data.
func RenderTemplate(templateNum int, data api.ProspectData) string {
	switch templateNum {
	case 2:
		return fmt.Sprintf("Halo %s, saya lihat Anda sempat mampir ke halaman yang saya kirimkan sebelumnya. Ada yang ingin ditanyakan atau didiskusikan lebih lanjut? Saya siap bantu. 🙏", data.Name)
	case 3:
		return fmt.Sprintf("Halo %s, minggu ini saya baru selesai bantu beberapa bisnis di %s dengan solusi serupa. Kalau Anda tertarik melihat hasilnya atau ingin ngobrol santai dulu, boleh langsung balas pesan ini. Tidak ada pressure sama sekali. 😊", data.Name, data.City)
	case 4:
		return fmt.Sprintf("Halo %s, ini pesan terakhir dari saya agar tidak mengganggu. Jika suatu saat Anda membutuhkan bantuan untuk %s, pintu saya selalu terbuka. Semoga bisnis %s terus berkembang! 🙌", data.Name, data.BusinessType, data.Name)
	default:
		return ""
	}
}

// BuildWaLink constructs a full wa.me link with the encoded message.
func BuildWaLink(phone, message string) string {
	// Ensure phone is clean (numeric only)
	return fmt.Sprintf("https://wa.me/%s?text=%s", phone, url.QueryEscape(message))
}
