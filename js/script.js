// /js/script.js

// === START === Fungsi Helper (Penanda Awal Fungsi Bantuan)
// Komentar Indonesia: Fungsi bantuan untuk mendapatkan parameter dari URL.
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Komentar Indonesia: Fungsi bantuan untuk menampilkan pesan sederhana.
function showMessage(message, type = 'info') { // type can be 'info', 'success', 'error'
    alert(message); // Placeholder, replace with a better notification system
}

// Komentar Indonesia: Fungsi bantuan untuk menampilkan/menyembunyikan loader.
function showLoader(show = true) {
    // TODO: Implement UI loader (e.g., a spinning icon)
    if (show) {
        console.log("Loader tampil..."); // Placeholder
    } else {
        console.log("Loader sembunyi..."); // Placeholder
    }
}
// === END === Fungsi Helper


$(document).ready(function() {
    const currentPageId = $('body').attr('id');

    if (currentPageId === 'page-home') {
        initHomePage();
    } else if (currentPageId === 'page-edit') {
        // initEditPage(); // Akan kita kerjakan nanti
    } else if (currentPageId === 'page-view') {
        // initViewPage(); // Akan kita kerjakan nanti
    }
});


// === START === Inisialisasi dan Fungsi Halaman Beranda (Penanda Awal Inisialisasi dan Fungsi Halaman Beranda)
// Komentar Indonesia: Fungsi utama untuk menginisialisasi semua fungsionalitas di halaman beranda.
function initHomePage() {
    console.log("Halaman Beranda (Home) diinisialisasi."); // Logging for debugging

    // Muat data pekerja untuk filter "担当者 (前任者)"
    loadEmployeeDataForDatalist($('#data-worker')); // [cite: 21] (getApprovaRoot bisa diadaptasi untuk ini atau fungsi baru)

    // Muat daftar serah terima saat halaman pertama kali dibuka
    loadHandoverList(); // [cite: 21]

    // Event listener untuk form filter utama (yang berisi 담당자, キーワード, dll.)
    $('#searchFiltersForm').on('submit', function(event) {
        event.preventDefault(); // Mencegah submit form standar
        loadHandoverList(); // Panggil fungsi untuk memuat daftar dengan filter baru
    });

    // Event listener untuk tombol "新規作成" (Buat Baru)
    $('#btnCreateNew').on('click', function() {
        window.location.href = 'handover_edit.html'; // Arahkan ke halaman edit/buat baru
    });

    // Event listener untuk perubahan pada filter dropdown di luar form utama
    // (Select Occupation, Status, dan Sort Order)
    $('#filterOccupation, #filterStatus, #sortOrder').on('change', function() {
        loadHandoverList(); // Muat ulang daftar jika filter ini berubah
    });

    // Event listener untuk input pencarian global
    $('#globalSearch').on('input', function() {
        // Anda bisa memilih untuk memuat ulang daftar secara otomatis saat mengetik (dengan debounce)
        // atau menunggu tombol filter utama. Untuk sekarang, kita tunggu tombol filter.
        // Jika ingin otomatis, tambahkan pemanggilan loadHandoverList() di sini (mungkin dengan debounce).
    });
}

// Komentar Indonesia: Fungsi untuk memuat daftar serah terima ke tabel.
// Ini sesuai dengan fungsi `getHandoverList` yang disebutkan dalam dokumen. [cite: 21]
function loadHandoverList() {
    showLoader(true); // Tampilkan loader

    // Kumpulkan semua parameter filter
    const globalSearchVal = $('#globalSearch').val();
    const predecessorVal = $('#filterPredecessor').val();
    let predecessorId = '';
    if (predecessorVal && predecessorVal.includes(' - ')) {
        predecessorId = predecessorVal.split(' - ')[0].trim(); // Ambil ID saja
    }

    const params = {
        action: 'getHandoverList', // Sesuai dengan yang diharapkan backend PHP [cite: 22]
        // Filter dari dokumen spesifikasi [cite: 12]
        predecessor: predecessorId, // "「担当者」は前任者" [cite: 12]
        status: $('#filterStatus').val(), // "「ステータス」は承認ルートに沿った形で設定" [cite: 12]
        keyword: $('#filterKeyword').val(), // "「キーワード」は関与先商号、代表者名、住所、質問・苦情・要望等、その他申し送り事項" [cite: 12]
        include_completed: $('#filterIncludeCompleted').is(':checked'), // "「完了分を含む」チェックボックス" [cite: 12]
        // Filter tambahan dari desain baru
        occupation: $('#filterOccupation').val(), // Filter "Select Occupation"
        // Pencarian global (bisa ditambahkan ke parameter keyword atau sebagai parameter terpisah)
        // Untuk saat ini, gabungkan dengan keyword atau backend yang akan menangani jika ada parameter 'q' atau 'global_search'
        global_search: globalSearchVal,
        // Parameter sorting [cite: 12]
        sort_by: $('#sortOrder').val().split('_')[0], // Misal: 'dt_submitted', 'id_tkc_cd', 's_name'
        sort_dir: $('#sortOrder').val().split('_')[1]  // Misal: 'desc', 'asc'
    };

    // Logging parameter untuk debugging
    console.log("Memuat daftar dengan parameter:", params);

    $.ajax({
        url: API_HANDOVER, // Variabel dari global_constants.js
        type: 'POST', // Sesuai dengan dokumen, PHP akan menggunakan $_POST [cite: 22]
        data: params,
        dataType: 'json', // Mengharapkan respons JSON dari server [cite: 21]
        success: function(response) {
            // Debugging: tampilkan respons mentah dari server
            console.log("Respons dari server:", response);

            const tableBody = $('#handoverListTable tbody');
            const tableRowCountInfo = $('#tableRowCountInfo'); // Elemen untuk "Showing data..." di atas tabel
            const tableRowCountPagination = $('#tableRowCount'); // Elemen untuk "Showing data..." di pagination

            tableBody.empty(); // Kosongkan isi tabel sebelumnya

            if (response && response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
                response.data.forEach(item => {
                    // Kolom yang ditampilkan sesuai dokumen: 提出日／関与先CD／関与先商号／代表者名／報酬金額計／前任者名／ステータス [cite: 12]
                    const kanyoCdFormatted = item.id_tkc_cd ? `${item.id_tkc_cd.substring(0,5)}-${item.id_tkc_cd.substring(5)}` : '-';
                    // Hitung報酬金額計 jika backend tidak menyediakannya secara langsung
                    const totalFee = (parseInt(item.n_advisory_fee) || 0) +
                                     (parseInt(item.n_account_closing_fee) || 0) +
                                     (parseInt(item.n_others_fee) || 0);

                    const row = `<tr>
                        <td>${item.dt_submitted || '-'}</td>
                        <td>${kanyoCdFormatted}</td>
                        <td>${item.s_name || '-'}</td>
                        <td>${item.s_rep_name || '-'}</td>
                        <td>${totalFee.toLocaleString()}</td>
                        <td>${item.predecessor_user_name || item.s_predecessor || '-'}</td>
                        <td>${STATUS_TEXT_MAP[item.current_status_key] || item.current_status_key || '-'}</td>
                        <td class="table-actions">
                            <a href="handover_view.html?id=${item.s_customer}" class="action-view" title="詳細表示">
                                <i class="fas fa-eye"></i>
                            </a>
                            </td>
                    </tr>`;
                    tableBody.append(row);
                });

                // Update info jumlah data
                // Asumsi backend mengirimkan informasi pagination
                const startEntry = response.pagination?.from || 1;
                const endEntry = response.pagination?.to || response.data.length;
                const totalEntries = response.pagination?.total || response.data.length;
                const rowCountText = `Showing data ${startEntry} to ${endEntry} of ${totalEntries} entries`;
                tableRowCountInfo.text(rowCountText);
                tableRowCountPagination.text(rowCountText);


                // Setup pagination (fungsi ini perlu dibuat)
                // setupPagination(response.pagination); // [cite: 21] (implied for list display)
            } else if (response && !response.success) {
                tableBody.append(`<tr><td colspan="8" style="text-align:center;">エラー: ${response.message || 'リストの取得に失敗しました。'}</td></tr>`);
                tableRowCountInfo.text("No data to show");
                tableRowCountPagination.text("No data to show");
            } else {
                tableBody.append('<tr><td colspan="8" style="text-align:center;">該当するデータが見つかりません。</td></tr>');
                tableRowCountInfo.text("該当するデータが見つかりません。");
                tableRowCountPagination.text("該当するデータが見つかりません。");
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
            $('#handoverListTable tbody').empty().append('<tr><td colspan="8" style="text-align:center;">データの読み込み中にエラーが発生しました。</td></tr>');
            $('#tableRowCountInfo').text("エラーが発生しました。");
            $('#tableRowCount').text("エラーが発生しました。");
        },
        complete: function() {
            showLoader(false); // Sembunyikan loader setelah selesai
        }
    });
}

// Komentar Indonesia: Fungsi untuk memuat data pekerja (karyawan) ke dalam elemen datalist.
// Ini bisa dianggap sebagai bagian dari pemenuhan kebutuhan untuk filter "担当者" atau fungsi `getApprovaRoot` [cite: 21]
// jika `getApprovaRoot` mengembalikan daftar karyawan yang relevan.
// Dokumen juga menyebutkan view `v_worker` [cite: 10] yang berisi `s_worker` dan `user_name`.
function loadEmployeeDataForDatalist(datalistElement) {
    $.ajax({
        url: API_HANDOVER, // Asumsi backend memiliki action untuk ini
        type: 'POST',
        data: { action: 'getWorkerList' }, // Action spesifik untuk mengambil daftar pekerja
        dataType: 'json',
        success: function(response) {
            if (response && response.success && response.data && Array.isArray(response.data)) {
                datalistElement.empty(); // Kosongkan opsi lama
                response.data.forEach(worker => {
                    // Format value pada datalist bisa "ID - Nama" untuk memudahkan pengambilan ID saat submit filter
                    // atau hanya nama jika backend bisa mencari berdasarkan nama.
                    // Field dari v_worker: s_worker (ID), user_name (Nama) [cite: 10]
                    datalistElement.append(`<option value="${worker.s_worker} - ${worker.user_name}">`);
                });
            } else {
                console.warn("Tidak ada data pekerja yang dimuat atau terjadi kesalahan:", response?.message);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Gagal memuat data pekerja untuk datalist:", textStatus, errorThrown);
        }
    });
}

// Komentar Indonesia: Fungsi untuk mengatur pagination. Ini perlu diimplementasikan.
// function setupPagination(paginationData) {
//     const controlsContainer = $('#paginationControls .pagination-buttons'); // Targetkan pembungkus tombol
//     controlsContainer.empty();
//     if (!paginationData || paginationData.total_pages <= 1) {
//         return; // Tidak perlu pagination jika hanya 1 halaman atau tidak ada data
//     }
//     // Logika untuk membuat tombol halaman (Previous, 1, 2, ..., Next)
//     // ...
// }

// === END === Inisialisasi dan Fungsi Halaman Beranda

// /js/script.js

// === START === Fungsi Helper (Penanda Awal Fungsi Bantuan)
// ... (Fungsi getUrlParameter, showMessage, showLoader tetap sama) ...
// === END === Fungsi Helper


$(document).ready(function() {
    const currentPageId = $('body').attr('id');

    if (currentPageId === 'page-home') {
        initHomePage();
    } else if (currentPageId === 'page-edit') {
        // initEditPage();
    } else if (currentPageId === 'page-view') {
        // initViewPage();
    }
});


// === START === Inisialisasi dan Fungsi Halaman Beranda (Penanda Awal Inisialisasi dan Fungsi Halaman Beranda)
function initHomePage() {
    console.log("Halaman Beranda (Home) diinisialisasi.");

    // Untuk testing tanpa backend, kita bisa langsung panggil loadHandoverList
    // loadEmployeeDataForDatalist($('#data-worker')); // Bisa dikomentari jika backend belum ada

    loadHandoverList(); // Muat daftar (dengan data dummy untuk sekarang)

    $('#searchFiltersForm').on('submit', function(event) {
        event.preventDefault();
        // Untuk testing, ini mungkin tidak akan memfilter data dummy kecuali Anda implementasikan logika filternya di JS
        console.log("Filter diterapkan (testing mode - tidak ada AJAX call)");
        loadHandoverList(); // Panggil lagi untuk menunjukkan data (atau data dummy yang difilter jika ada)
    });

    $('#btnCreateNew').on('click', function() {
        window.location.href = 'handover_edit.html';
    });

    $('#filterOccupation, #filterStatus, #sortOrder').on('change', function() {
        // Sama seperti di atas, ini mungkin tidak akan benar-benar memfilter/mengurutkan data dummy
        console.log("Filter atau Urutan diubah (testing mode - tidak ada AJAX call)");
        loadHandoverList();
    });
}

// Komentar Indonesia: Fungsi untuk memuat daftar serah terima ke tabel.
// VERSI TESTING DENGAN DATA DUMMY
function loadHandoverList() {
    showLoader(true); // Tampilkan loader

    // --- AWAL DATA DUMMY ---
    const dummyApiResponse = {
        success: true,
        data: [
            {
                s_customer: 'C000001',
                dt_submitted: '2024-03-15',
                id_tkc_cd: '12345001', // 9 digit tanpa strip
                s_name: '株式会社トヨタ商事',
                s_rep_name: '田中 一郎',
                n_advisory_fee: 1000000,
                n_account_closing_fee: 250000,
                n_others_fee: 0,
                predecessor_user_name: '佐藤 美咲', // Atau s_predecessor: 'S001'
                current_status_key: STATUS_KEYS.PENDING_SUPERIOR // Gunakan konstanta dari global_constants.js
            },
            {
                s_customer: 'C000002',
                dt_submitted: '2024-03-14',
                id_tkc_cd: '54321002',
                s_name: '株式会社ソフトバンク',
                s_rep_name: '山本 裕子',
                n_advisory_fee: 800000,
                n_account_closing_fee: 180000,
                n_others_fee: 0,
                predecessor_user_name: '鈴木 健太',
                current_status_key: STATUS_KEYS.PENDING_DEPT_HEAD
            },
            {
                s_customer: 'C000003',
                dt_submitted: '2024-03-12',
                id_tkc_cd: '00789003',
                s_name: '株式会社日立製作所',
                s_rep_name: '伊藤 正道',
                n_advisory_fee: 2000000,
                n_account_closing_fee: 300000,
                n_others_fee: 0,
                predecessor_user_name: '高橋 淳子',
                current_status_key: STATUS_KEYS.FINAL_COMPLETED
            },
            {
                s_customer: 'C000004',
                dt_submitted: '2024-03-10',
                id_tkc_cd: '11223004',
                s_name: '株式会社パナソニック',
                s_rep_name: '渡辺 翔太',
                n_advisory_fee: 1500000,
                n_account_closing_fee: 250000,
                n_others_fee: 50000,
                predecessor_user_name: '中村 優子',
                current_status_key: STATUS_KEYS.DENIED
            }
        ],
        pagination: { // Contoh data pagination jika Anda ingin mengujinya juga
            from: 1,
            to: 4,
            total: 4,
            total_pages: 1,
            current_page: 1
        }
    };
    // --- AKHIR DATA DUMMY ---

    // Kumpulkan parameter filter (Meskipun tidak digunakan untuk mengambil data, ini baik untuk debugging)
    const globalSearchVal = $('#globalSearch').val();
    const predecessorVal = $('#filterPredecessor').val();
    // ... (parameter filter lain bisa tetap dikumpulkan untuk melihat nilainya)

    console.log("Memuat daftar dengan filter (mode dummy):", {
        globalSearch: globalSearchVal,
        predecessor: predecessorVal,
        status: $('#filterStatus').val(),
        keyword: $('#filterKeyword').val()
        // ...
    });

    // Langsung proses data dummy seolah-olah itu adalah respons dari AJAX
    const tableBody = $('#handoverListTable tbody');
    const tableRowCountInfo = $('#tableRowCountInfo');
    const tableRowCountPagination = $('#tableRowCount');

    tableBody.empty(); // Kosongkan isi tabel sebelumnya

    if (dummyApiResponse && dummyApiResponse.success && dummyApiResponse.data && Array.isArray(dummyApiResponse.data) && dummyApiResponse.data.length > 0) {
        dummyApiResponse.data.forEach(item => {
            const kanyoCdFormatted = item.id_tkc_cd ? `${item.id_tkc_cd.substring(0,5)}-${item.id_tkc_cd.substring(5)}` : '-';
            const totalFee = (parseInt(item.n_advisory_fee) || 0) +
                             (parseInt(item.n_account_closing_fee) || 0) +
                             (parseInt(item.n_others_fee) || 0);

            const row = `<tr>
                <td>${item.dt_submitted || '-'}</td>
                <td>${kanyoCdFormatted}</td>
                <td>${item.s_name || '-'}</td>
                <td>${item.s_rep_name || '-'}</td>
                <td>${totalFee.toLocaleString()}</td>
                <td>${item.predecessor_user_name || item.s_predecessor || '-'}</td>
                <td>${STATUS_TEXT_MAP[item.current_status_key] || item.current_status_key || '-'}</td>
                <td class="table-actions">
                    <a href="handover_view.html?id=${item.s_customer}" class="action-view" title="詳細表示">
                        <i class="fas fa-eye"></i>
                    </a>
                </td>
            </tr>`;
            tableBody.append(row);
        });

        const startEntry = dummyApiResponse.pagination?.from || 1;
        const endEntry = dummyApiResponse.pagination?.to || dummyApiResponse.data.length;
        const totalEntries = dummyApiResponse.pagination?.total || dummyApiResponse.data.length;
        const rowCountText = `Showing data ${startEntry} to ${endEntry} of ${totalEntries} entries`;
        tableRowCountInfo.text(rowCountText);
        tableRowCountPagination.text(rowCountText);

        // setupPagination(dummyApiResponse.pagination); // Panggil fungsi pagination jika sudah ada
    } else {
        tableBody.append('<tr><td colspan="8" style="text-align:center;">該当するデータが見つかりません。</td></tr>');
        tableRowCountInfo.text("データなし");
        tableRowCountPagination.text("データなし");
    }

    showLoader(false); // Sembunyikan loader
}


// Komentar Indonesia: Fungsi untuk memuat data pekerja ke dalam elemen datalist.
// VERSI TESTING DENGAN DATA DUMMY
function loadEmployeeDataForDatalist(datalistElement) {
    // --- AWAL DATA DUMMY KARYAWAN ---
    const dummyWorkers = [
        { s_worker: 'S001', user_name: '佐藤 美咲' },
        { s_worker: 'S002', user_name: '鈴木 健太' },
        { s_worker: 'S003', user_name: '高橋 淳子' },
        { s_worker: 'S004', user_name: '中村 優子' },
        { s_worker: 'M001', user_name: '村田 (課長)'}
    ];
    // --- AKHIR DATA DUMMY KARYAWAN ---

    datalistElement.empty();
    dummyWorkers.forEach(worker => {
        datalistElement.append(`<option value="${worker.s_worker} - ${worker.user_name}">`);
    });
    console.log("Datalist pekerja diisi dengan data dummy.");
}

// ... (Fungsi setupPagination dan fungsi untuk halaman lain bisa tetap ada atau dikomentari) ...

// === END === Inisialisasi dan Fungsi Halaman Beranda