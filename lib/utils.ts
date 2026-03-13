export function slugify(text: string) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Ganti spasi dengan -
        .replace(/[^\w-]+/g, '')  // Hapus karakter non-alphanumeric
        .replace(/--+/g, '-');    // Ganti multiple - dengan single -
}
