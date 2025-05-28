// Alamat dasar untuk API backend Anda
const API_BASE_URL = '/handover/bin/'; // Pastikan ini sesuai dengan setup server Anda
const API_HANDOVER = API_BASE_URL + 'handover.php';

// Konstanta untuk kunci status (sesuaikan dengan yang akan dikirim/diterima dari backend)
const STATUS_KEYS = {
    PENDING_SUPERIOR: 'pending_superior',
    PENDING_DEPT_HEAD: 'pending_dept_head',
    // ... tambahkan semua status sesuai alur
    COMPLETED_GA: 'completed_ga', // Contoh: Menunggu konfirmasi GA
    FINAL_COMPLETED: 'final_completed', // Contoh: Proses selesai sepenuhnya
    DENIED: 'denied'
};

// Mapping teks status untuk tampilan (bisa lebih banyak dari STATUS_KEYS jika ada variasi teks)
const STATUS_TEXT_MAP = {
    [STATUS_KEYS.PENDING_SUPERIOR]: '所属長確認待ち',
    [STATUS_KEYS.PENDING_DEPT_HEAD]: '部長確認待ち',
    // ... tambahkan semua teks status
    [STATUS_KEYS.COMPLETED_GA]: '総務確認待ち',
    [STATUS_KEYS.FINAL_COMPLETED]: '確認完了',
    [STATUS_KEYS.DENIED]: '否認済'
};

// Konstanta lain jika diperlukan
// Misalnya, peran pengguna jika akan dikelola di frontend (meski biasanya dari backend)
// const USER_ROLES = {
//     STAFF: 'staff',
//     SUPERIOR: 'superior',
//     ADMIN: 'admin'
// };