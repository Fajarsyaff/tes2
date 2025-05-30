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

    // Muat data dummy pekerja untuk filter "担当者 (前任者)"
    loadEmployeeDataForDatalistWithDummy($('#data-worker')); // Menggunakan fungsi versi dummy

    // Muat daftar serah terima (dengan data dummy) saat halaman pertama kali dibuka
    loadHandoverListWithDummy();

    // Event listener untuk form filter utama
    $('#mainFiltersForm').on('submit', function(event) { // ID form diubah ke mainFiltersForm
        event.preventDefault(); // Mencegah submit form standar
        console.log("Filter utama diterapkan (testing mode - data dummy).");
        // Untuk testing nyata, Anda mungkin ingin memfilter array dummyApiResponse.data di sini
        // atau cukup muat ulang data dummy yang sama untuk saat ini.
        loadHandoverListWithDummy();
    });

    // Event listener untuk tombol "新規作成" (Buat Baru)
    $('#btnCreateNew').on('click', function() {
        window.location.href = 'handover_edit.html'; // Arahkan ke halaman edit/buat baru
    });

    // Event listener untuk perubahan pada filter dropdown di luar form utama
    $('#filterOccupation, #filterStatusTop, #sortOrder').on('change', function() { // ID filter status atas disesuaikan
        console.log("Filter atas atau Urutan diubah (testing mode - data dummy).");
        loadHandoverListWithDummy();
    });

    // Event listener untuk input pencarian global
    // Untuk testing dengan data dummy, ini tidak akan melakukan apa-apa kecuali Anda tambahkan logika filter JS
    $('#globalSearch').on('input', function() {
        const searchTerm = $(this).val();
        console.log("Global search term:", searchTerm, "(testing mode - data dummy)");
        // Jika ingin ada efek, panggil loadHandoverListWithDummy() atau filter data dummy di sini
    });
}

// Komentar Indonesia: Variabel global untuk data dummy pekerja.
const dummyWorkersData = [
    { s_worker: 'S001', user_name: '佐藤 美咲' },
    { s_worker: 'S002', user_name: '鈴木 健太' },
    { s_worker: 'T003', user_name: '高橋 淳子' },
    { s_worker: 'A004', user_name: '田中 一郎' },
    { s_worker: 'B005', user_name: '山本 裕子' },
    { s_worker: 'C006', user_name: '中村 修平' },
    { s_worker: 'D007', user_name: '伊藤 さやか' }
];

// Komentar Indonesia: Fungsi untuk memuat data pekerja (karyawan) DUMMY ke dalam elemen datalist.
function loadEmployeeDataForDatalistWithDummy(datalistElement) {
    datalistElement.empty(); // Kosongkan opsi lama
    if (dummyWorkersData && dummyWorkersData.length > 0) {
        dummyWorkersData.forEach(worker => {
            // Format value pada datalist "ID - Nama"
            datalistElement.append(`<option value="${worker.s_worker} - ${worker.user_name}">`);
        });
        console.log("Datalist pekerja diisi dengan data dummy."); // Penanda untuk debugging
    } else {
        console.warn("Tidak ada data pekerja dummy untuk dimuat.");
    }
}

// Komentar Indonesia: Fungsi untuk memuat daftar serah terima DUMMY ke tabel.
function loadHandoverListWithDummy() {
    showLoader(true); // Tampilkan loader

    // --- DATA DUMMY untuk daftar serah terima ---
    const dummyApiResponse = {
        success: true,
        data: [
            {
                s_customer: 'C000001',
                dt_submitted: '2024-03-15',
                id_tkc_cd: '12345001',
                s_name: '株式会社トヨタ商事',
                s_rep_name: '田中 一郎',
                n_advisory_fee: 1000000,
                n_account_closing_fee: 250000,
                n_others_fee: 0,
                predecessor_user_name: '佐藤 美咲',
                current_status_key: STATUS_KEYS.PENDING_SUPERIOR
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
        pagination: {
            from: 1,
            to: 4,
            total: 4,
            total_pages: 1,
            current_page: 1
        }
    };

    // Kumpulkan nilai filter (untuk debugging atau jika Anda ingin menambahkan filter client-side pada data dummy)
    const filterParams = {
        globalSearch: $('#globalSearch').val(),
        predecessor: $('#filterPredecessor').val(),
        keyword: $('#filterKeyword').val(),
        status: $('#filterStatus').val(), // Ambil dari filter status di .filter-bar
        occupation: $('#filterOccupation').val(),
        statusTop: $('#filterStatusTop').val(),
        includeCompleted: $('#filterIncludeCompleted').is(':checked'),
        sortBy: $('#sortOrder').val()
    };
    console.log("Filter yang diterapkan (mode dummy):", filterParams);


    const tableBody = $('#handoverListTable tbody');
    const tableRowCountInfo = $('#tableRowCountInfo'); // Elemen untuk "Showing data..." di atas tabel (di .table-meta)
    const tableRowCountPagination = $('#tableRowCount'); // Elemen untuk "Showing data..." di pagination

    tableBody.empty();

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
        
        // Periksa apakah elemen ada sebelum mengubah teksnya
        if(tableRowCountInfo.length) {
            tableRowCountInfo.text(rowCountText);
        }
        if(tableRowCountPagination.length) {
            tableRowCountPagination.text(rowCountText);
        }

        // setupPaginationWithDummy(dummyApiResponse.pagination);
    } else {
        tableBody.append('<tr><td colspan="8" style="text-align:center;">該当するデータが見つかりません。</td></tr>');
        if(tableRowCountInfo.length) tableRowCountInfo.text("該当するデータが見つかりません。");
        if(tableRowCountPagination.length) tableRowCountPagination.text("該当するデータが見つかりません。");
    }

    showLoader(false);
}


// Komentar Indonesia: Anda mungkin perlu fungsi terpisah untuk pagination dengan data dummy
// function setupPaginationWithDummy(paginationData) {
//     const controlsContainer = $('#paginationControls .pagination-buttons');
//     controlsContainer.empty();
//     if (!paginationData || paginationData.total_pages <= 1) {
//         $('#paginationControls').hide(); // Sembunyikan pagination jika tidak perlu
//         return;
//     }
//     $('#paginationControls').show();
//     // Logika untuk membuat tombol halaman (Previous, 1, 2, ..., Next)
//     // ...
//     console.log("Setup pagination dengan data dummy:", paginationData);
// }

// === END === Inisialisasi dan Fungsi Halaman Beranda