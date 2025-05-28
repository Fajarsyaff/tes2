// Fungsi helper untuk mendapatkan parameter dari URL query string
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Fungsi untuk menampilkan pesan (bisa diganti dengan library notifikasi yang lebih baik)
function showMessage(message, type = 'info') { // type bisa 'info', 'success', 'error'
    alert(message); // Placeholder sederhana
    // TODO: Implementasi notifikasi yang lebih baik (misal: toast, modal)
}

// Fungsi untuk menampilkan/menyembunyikan loader/spinner global
function showLoader(show = true) {
    // TODO: Implementasi UI loader
    if (show) {
        console.log("Loader tampil...");
    } else {
        console.log("Loader sembunyi...");
    }
}


$(document).ready(function() {
    // Deteksi halaman saat ini berdasarkan ID body
    const currentPageId = $('body').attr('id');

    if (currentPageId === 'page-home') {
        initHomePage();
    } else if (currentPageId === 'page-edit') {
        initEditPage();
    } else if (currentPageId === 'page-view') {
        initViewPage();
    }

    // Event listener umum untuk <details> agar hanya satu yang terbuka (opsional)
    // $('details.form-collapsible-section, details.view-collapsible-section').on('toggle', function(e) {
    //     if (this.open) {
    //         $('details[open]').not(this).removeAttr('open');
    //     }
    // });
});


// =========================================
// Inisialisasi dan Fungsi Halaman Beranda
// =========================================
function initHomePage() {
    console.log("Halaman Beranda (Home) diinisialisasi.");
    loadEmployeeDataForDatalist($('#data-worker')); // Load data untuk filter担当者
    loadHandoverList(); // Muat daftar saat halaman pertama kali dibuka

    $('#searchFiltersForm').on('submit', function(event) {
        event.preventDefault();
        loadHandoverList();
    });

    $('#btnCreateNew').on('click', function() {
        window.location.href = 'handover_edit.html'; // Atau 'handover_edit.html?mode=new'
    });

    $('#sortOrder').on('change', function() {
        loadHandoverList(); // Muat ulang daftar dengan urutan baru
    });
}

function loadHandoverList() {
    showLoader(true);
    const params = {
        action: 'getHandoverList',
        predecessor: $('#filterPredecessor').val(), // Mungkin perlu ID nya saja, bukan "ID - Nama"
        status: $('#filterStatus').val(),
        keyword: $('#filterKeyword').val(),
        include_completed: $('#filterIncludeCompleted').is(':checked'),
        sort_by: $('#sortOrder').val().split('_')[0], // Misal: 'dt_submitted'
        sort_dir: $('#sortOrder').val().split('_')[1]  // Misal: 'desc'
    };

    // Ambil ID dari value datalist jika formatnya "ID - Nama"
    const predecessorVal = $('#filterPredecessor').val();
    if (predecessorVal && predecessorVal.includes(' - ')) {
        params.predecessor_id = predecessorVal.split(' - ')[0];
    } else {
        params.predecessor_id = ''; // Atau handle jika hanya nama/ID
    }
    // Hapus params.predecessor karena sudah ada params.predecessor_id
    delete params.predecessor;


    $.ajax({
        url: API_HANDOVER,
        type: 'POST',
        data: params,
        dataType: 'json',
        success: function(response) {
            const tableBody = $('#handoverListTable tbody');
            tableBody.empty();
            if (response && response.success && response.data && response.data.length > 0) {
                response.data.forEach(item => {
                    // Sesuaikan dengan field dari backend
                    const kanyoCd = item.id_tkc_cd ? `${item.id_tkc_cd.substring(0,5)}-${item.id_tkc_cd.substring(5)}` : '-';
                    const row = `<tr>
                        <td>${item.dt_submitted || '-'}</td>
                        <td>${kanyoCd}</td>
                        <td>${item.s_name || '-'}</td>
                        <td>${item.s_rep_name || '-'}</td>
                        <td>${(item.n_advisory_fee + item.n_account_closing_fee + (item.n_others_fee || 0)).toLocaleString()} 円</td>
                        <td>${item.predecessor_user_name || '-'}</td>
                        <td>${STATUS_TEXT_MAP[item.current_status_key] || item.current_status_key || '-'}</td>
                        <td class="table-actions">
                            <a href="handover_view.html?id=${item.s_customer}" title="詳細表示">
                                <span class="material-symbols-outlined">visibility</span>
                            </a>
                        </td>
                    </tr>`;
                    tableBody.append(row);
                });
                // Implementasi pagination jika backend mengirim info pagination
                // setupPagination(response.pagination);
            } else if (response && !response.success) {
                tableBody.append(`<tr><td colspan="8" style="text-align:center;">エラー: ${response.message || 'リストの取得に失敗しました。'}</td></tr>`);
            }
            else {
                tableBody.append('<tr><td colspan="8" style="text-align:center;">該当するデータが見つかりません。</td></tr>');
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("AJAX Error:", textStatus, errorThrown, jqXHR.responseText);
            $('#handoverListTable tbody').empty().append('<tr><td colspan="8" style="text-align:center;">データの読み込み中にエラーが発生しました。</td></tr>');
        },
        complete: function() {
            showLoader(false);
        }
    });
}

// Fungsi untuk memuat data pekerja ke datalist
function loadEmployeeDataForDatalist(datalistElement) {
    // Ini juga bisa digunakan untuk select jika diperlukan
    $.ajax({
        url: API_HANDOVER, // Asumsi ada endpoint/action untuk mengambil daftar pekerja
        type: 'POST',
        data: { action: 'getWorkerList' }, // Atau 'getApprovalRoot' jika relevan
        dataType: 'json',
        success: function(response) {
            if (response && response.success && response.data) {
                datalistElement.empty();
                response.data.forEach(worker => {
                    // Dokumen menyebut user_name dari v_worker adalah concat(w.s_lname, ‘ ‘, w.s_fname) [cite: 11]
                    // s_worker adalah PK char(4) [cite: 10]
                    datalistElement.append(`<option value="${worker.s_worker} - ${worker.user_name}">`);
                });
            }
        },
        error: function() {
            console.error("Datalist pekerja gagal dimuat.");
        }
    });
}

// =========================================
// Inisialisasi dan Fungsi Halaman Edit
// =========================================
function initEditPage() {
    console.log("Halaman Edit diinisialisasi.");
    const handoverId = getUrlParameter('id'); // s_customer adalah PK [cite: 6]
    const editPageTitle = $('#editPageTitle');

    loadEmployeeDataForDatalist($('#data-worker')); // Untuk pilihan 所属長ID, 後任者ID

    if (handoverId) {
        editPageTitle.text('引継ぎ情報 編集');
        loadHandoverDataForEdit(handoverId);
    } else {
        editPageTitle.text('引継ぎ情報 新規作成');
        // Set default values for new form if any (misal: 前任者ID dari user login)
        // updateProgressBar('new'); // Status awal untuk progress bar
        // setupApprovalButtons('new'); // Tombol untuk form baru
    }

    $('#handoverEditForm').on('submit', function(event) {
        event.preventDefault();
        submitHandoverForm(handoverId);
    });

    $('#btnCancelEdit').on('click', function() {
        if (confirm('変更を破棄して一覧に戻りますか？')) {
            window.location.href = 'handover.html';
        }
    });
}

function loadHandoverDataForEdit(id) {
    showLoader(true);
    $.ajax({
        url: API_HANDOVER,
        type: 'POST',
        data: { action: 'getHandoverData', id: id },
        dataType: 'json',
        success: function(response) {
            if (response && response.success && response.data) {
                const data = response.data;
                // Isi semua field form berdasarkan 'data'
                $('#s_customer_display').text(data.s_customer || 'N/A');
                if (data.id_tkc_cd) {
                    $('#id_tkc_cd_1').val(data.id_tkc_cd.substring(0,5));
                    $('#id_tkc_cd_2').val(data.id_tkc_cd.substring(5));
                }
                $('#s_name').val(data.s_name || '');
                // ... Lanjutkan untuk semua field dari t_handover [cite: 6]
                // Contoh untuk field TINYINT (0 atau 1) yang direpresentasikan sebagai checkbox/radio
                // if (data.n_interim_return !== null) {
                //    $(`input[name="n_interim_return"][value="${data.n_interim_return}"]`).prop('checked', true);
                // }

                // Isi field FK (s_superior, s_in_charge)
                // Backend idealnya mengirimkan ID dan juga teks display untuk datalist jika formatnya "ID - Nama"
                $('#s_superior').val(data.s_superior ? `${data.s_superior} - ${data.s_superior_name || ''}` : '');
                $('#s_in_charge').val(data.s_in_charge ? `${data.s_in_charge} - ${data.s_in_charge_name || ''}` : '');
                 $('#s_predecessor').val(data.s_predecessor); // Hidden input
                 $('#s_predecessor_display').text(`${data.s_predecessor} - ${data.predecessor_user_name || '不明'}`);


                // renderProgressBar(data.current_status_key, data.approval_path); // Fungsi untuk membuat progress bar
                // setupApprovalSection(data.current_status_key, data.user_role, data.approval_history); // Fungsi untuk mengatur tombol & komentar approval
            } else {
                showMessage(response.message || 'データの取得に失敗しました。', 'error');
            }
        },
        error: function() { showMessage('詳細データの読み込み中にエラー。', 'error'); },
        complete: function() { showLoader(false); }
    });
}

function submitHandoverForm(handoverId) {
    showLoader(true);
    const formData = new FormData($('#handoverEditForm')[0]); // FormData untuk file jika ada

    // Gabungkan id_tkc_cd
    const id_tkc_cd_1 = formData.get('id_tkc_cd_1') || "";
    const id_tkc_cd_2 = formData.get('id_tkc_cd_2') || "";
    formData.set('id_tkc_cd', id_tkc_cd_1 + id_tkc_cd_2);
    formData.delete('id_tkc_cd_1');
    formData.delete('id_tkc_cd_2');

    // Ambil ID dari datalist jika formatnya "ID - Nama"
    const superiorVal = formData.get('s_superior');
    if (superiorVal && superiorVal.includes(' - ')) {
        formData.set('s_superior', superiorVal.split(' - ')[0]);
    }
    const inChargeVal = formData.get('s_in_charge');
    if (inChargeVal && inChargeVal.includes(' - ')) {
        formData.set('s_in_charge', inChargeVal.split(' - ')[0]);
    }


    if (handoverId) {
        formData.append('id', handoverId); // s_customer adalah ID untuk update
        formData.append('action', 'updateHandoverData');
    } else {
        formData.append('action', 'createHandoverData'); // Action baru untuk create
    }

    // TODO: Tambahkan validasi sisi klien yang lebih baik

    $.ajax({
        url: API_HANDOVER,
        type: 'POST',
        data: formData,
        processData: false, // Penting untuk FormData
        contentType: false, // Penting untuk FormData
        dataType: 'json',
        success: function(response) {
            if (response && response.success) {
                showMessage(response.message || 'データが正常に保存されました。', 'success');
                // Dokumen menyebutkan email dikirim setelah update sukses [cite: 21]
                // Ini akan ditangani backend, tapi frontend bisa dapat info untuk redirect
                window.location.href = `handover_view.html?id=${response.id || handoverId}`;
            } else {
                showMessage(response.message || 'データの保存に失敗しました。', 'error');
            }
        },
        error: function() { showMessage('送信中にエラーが発生しました。', 'error'); },
        complete: function() { showLoader(false); }
    });
}


// =========================================
// Inisialisasi dan Fungsi Halaman View
// =========================================
function initViewPage() {
    console.log("Halaman View diinisialisasi.");
    const handoverId = getUrlParameter('id');

    if (handoverId) {
        loadHandoverDataForView(handoverId);
    } else {
        $('#handoverViewContent').html('<p class="error-message">表示する引継ぎIDが指定されていません。</p>');
    }

    $('#btnGoToEdit').on('click', function() {
        window.location.href = `handover_edit.html?id=${handoverId}`;
    });
}

function loadHandoverDataForView(id) {
    showLoader(true);
    $.ajax({
        url: API_HANDOVER,
        type: 'POST',
        data: { action: 'getHandoverData', id: id },
        dataType: 'json',
        success: function(response) {
            if (response && response.success && response.data) {
                const data = response.data;
                // Isi semua elemen <dd> dengan ID yang sesuai
                $('#view_s_customer').text(data.s_customer || '-');
                if (data.id_tkc_cd) {
                    $('#view_id_tkc_cd').text(`${data.id_tkc_cd.substring(0,5)}-${data.id_tkc_cd.substring(5)}`);
                } else {
                    $('#view_id_tkc_cd').text('-');
                }
                $('#view_s_name').text(data.s_name || '-');
                // ... Lanjutkan untuk semua field, tampilkan sebagai teks

                // Tampilkan riwayat approval
                // renderApprovalHistory($('#viewApprovalHistory'), data.approval_history);

                // Tampilkan/sembunyikan tombol edit berdasarkan status/peran
                // if (data.can_edit_based_on_status_and_role) {
                //    $('#btnGoToEdit').show();
                // }

                // renderProgressBar($('#progressBarContainerView'), data.current_status_key, data.approval_path);
            } else {
                $('#handoverViewContent').html(`<p class="error-message">${response.message || '詳細データの取得に失敗しました。'}</p>`);
            }
        },
        error: function() { $('#handoverViewContent').html('<p class="error-message">詳細データの読み込み中にエラーが発生しました。</p>'); },
        complete: function() { showLoader(false); }
    });
}

// TODO: Implementasikan fungsi renderProgressBar, setupApprovalSection, renderApprovalHistory, setupPagination, dll.