$(document).ready(function() {
    // Asumsi: handoverId didapatkan dari parameter URL atau cara lain saat edit
    // Untuk data baru, handoverId bisa null atau undefined.
    const urlParams = new URLSearchParams(window.location.search);
    let handoverId = urlParams.get('id'); // Contoh pengambilan ID dari URL: ?id=xxx

    // Asumsi: Informasi pengguna yang login tersedia (misalnya dari global_constants.js atau sesi)
    // Gantilah dengan cara Anda mendapatkan informasi ini
    const loggedInUserId = typeof LOGGED_IN_USER_ID !== 'undefined' ? LOGGED_IN_USER_ID : 'user01'; // Contoh ID
    const loggedInUserName = typeof LOGGED_IN_USER_NAME !== 'undefined' ? LOGGED_IN_USER_NAME : 'ログインユーザー名';
    // const loggedInUserDepartment = typeof LOGGED_IN_USER_DEPARTMENT !== 'undefined' ? LOGGED_IN_USER_DEPARTMENT : '監査部';

    // --- INISIALISASI HALAMAN ---
    loadWorkerList();
    loadCustomerList(); // Fungsi ini perlu Anda buat untuk memuat daftar pelanggan
    setFixedApproverNames(); // Set nama approver yang tetap

    if (handoverId) {
        // Mode Edit: Muat data yang ada
        loadHandoverData(handoverId);
    } else {
        // Mode Baru: Set beberapa default jika perlu
        $('#s_predecessor_name').text(loggedInUserName); // Nama predecessor adalah pengguna saat ini
        $('#dt_submitted').text(''); // Akan diisi saat submit
        updateProgressBarBasedOnStatus('新規作成中', 0); // Progress bar awal untuk mode baru
    }

    // --- EVENT HANDLERS ---

        $('#btnBackTop').on('click', function() {
        // Logika konfirmasi yang sama bisa diterapkan di sini
        window.location.href = 'handover.html'; // Arahkan ke handover.html
    });

    // Pemilihan Pelanggan
    $('#s_customer').on('input', function() { // 'input' event lebih baik untuk datalist
        const customerId = $(this).val();
        const selectedOption = $('#customerList option[value="' + customerId + '"]');
        
        if (selectedOption.length > 0) { // Pastikan nilai ada di datalist
            // Ambil detail pelanggan ( 関与先CD, 商号, 住所 )
            // Anda perlu fungsi backend untuk ini, atau jika data sudah ada di frontend, ambil dari sana
            // Contoh: memanggil fungsi getCustomerDetails(customerId)
            getCustomerDetails(customerId); // Implementasikan fungsi ini
        } else {
            // Kosongkan field jika input tidak cocok dengan opsi datalist
            $('#id_tkc_cd').val('');
            $('#s_name').val('');
            $('#s_address').val('');
        }
    });

    //button 
     /**
     * Mengisi form dengan data yang diterima
     * @param {object} data - Objek data serah terima
     */
    function populateForm(data) {
        // ... (kode populateForm Anda yang sudah ada untuk semua field lain) ...

        // Simpan status nilai saat ini secara global atau sebagai atribut data
        currentHandoverStatusValue = data.status_value; // Asumsi 'status_value' adalah field dari backend
                                                       // yang merepresentasikan status numerik (misal, 1 untuk '所属長確認待ち')

        // ... (sisa kode populateForm Anda untuk mengisi tanggal dan komentar yang sudah ada dari 'data')
        $('#s_predecessor_name').text(data.s_predecessor_name || loggedInUserName);
        $('#dt_submitted').text(formatDateTime(data.dt_submitted) || '');
        
        $('#s_superior').val(data.s_superior || ''); 
        $('#dt_approved_superior').text(formatDateTime(data.dt_approved) || '');
        $('#s_approved_comment').text(data.s_approved || '');

        $('#dt_approved_1').text(formatDateTime(data.dt_approved_1) || '');
        $('#s_approved_1_comment').text(data.s_approved_1 || '');
        $('#dt_approved_2').text(formatDateTime(data.dt_approved_2) || '');
        $('#s_approved_2_comment').text(data.s_approved_2 || '');
        $('#dt_approved_3').text(formatDateTime(data.dt_approved_3) || '');
        $('#s_approved_3_comment').text(data.s_approved_3 || '');
        $('#dt_approved_4').text(formatDateTime(data.dt_approved_4) || '');
        $('#s_approved_4_comment').text(data.s_approved_4 || '');
        $('#dt_approved_5').text(formatDateTime(data.dt_approved_5) || '');
        $('#s_approved_5_comment').text(data.s_approved_5 || '');
        
        $('#dt_checked').text(formatDateTime(data.dt_checked) || '');
        $('#s_checked_comment').text(data.s_checked || '');

        $('#s_in_charge').val(data.s_in_charge || '');
        
        // Update progress bar juga di sini berdasarkan status yang dimuat
        updateProgressBarBasedOnStatus(currentHandoverStatusValue);
    }


    /**
     * Mengirim data form ke server
     * @param {string} actionType - Tipe aksi (submit, approve, deny, save_draft)
     */
    function submitHandover(actionType) {
        if (!confirm(getConfirmationMessage(actionType))) {
            return;
        }

        const formData = $('#handoverForm').serializeArray();
        let params = {
            action: 'updateHandoverData',
            action_type: actionType,
            id: handoverId
        };

        formData.forEach(function(item) {
            params[item.name] = item.value;
        });
        params.approval_comment_text = $('#approvalComment').val();
        params.actor_user_id = loggedInUserId;

        if (!handoverId && actionType === 'submit') {
            params.s_predecessor = loggedInUserId;
        }

        // --- Optimistic UI Update untuk Timestamp jika 'approve' ---
        if (actionType === 'approve') {
            const now = new Date();
            // Membuat format YYYY-MM-DD HH:MM:SS untuk konsistensi dengan formatDateTime
            const year = now.getFullYear();
            const month = ('0' + (now.getMonth() + 1)).slice(-2);
            const day = ('0' + now.getDate()).slice(-2);
            const hours = ('0' + now.getHours()).slice(-2);
            const minutes = ('0' + now.getMinutes()).slice(-2);
            const seconds = ('0' + now.getSeconds()).slice(-2);
            const dbFormatTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            
            const formattedTimestamp = formatDateTime(dbFormatTimestamp); // Menggunakan fungsi format yang sudah ada

            // Tentukan span mana yang akan diupdate berdasarkan status SEBELUM approval ini.
            // `currentHandoverStatusValue` harus mencerminkan status saat tombol "Approve" diklik.
            // Logika ini mengasumsikan bahwa pengguna yang menekan "Approve" adalah approver yang sesuai
            // untuk `currentHandoverStatusValue`.
            let targetTimestampSpanId = null;
            let targetCommentSpanId = null; // Juga update komentar secara optimis

            // Mapping status (SEBELUM approval) ke field yang akan diisi SEKARANG
            // Nilai status ini adalah status dokumen SEBELUM aksi approve ini.
            // Misalnya, jika currentHandoverStatusValue adalah 1 ('所属長確認待ち'),
            // berarti '所属長' yang sedang melakukan approval, dan timestamp untuk '所属長' akan diisi.
            switch (parseInt(currentHandoverStatusValue)) {
                case 1: // Jika status "所属長確認待ち", maka dt_approved (milik所属長) yang diisi
                    targetTimestampSpanId = '#dt_approved_superior';
                    targetCommentSpanId = '#s_approved_comment';
                    break;
                case 2: // Jika status "部長確認待ち", maka dt_approved_1 (milik 部長) yang diisi
                    targetTimestampSpanId = '#dt_approved_1';
                    targetCommentSpanId = '#s_approved_1_comment';
                    break;
                case 3: // "取締役確認待ち" -> dt_approved_2
                    targetTimestampSpanId = '#dt_approved_2';
                    targetCommentSpanId = '#s_approved_2_comment';
                    break;
                case 4: // "常務確認待ち" -> dt_approved_3
                    targetTimestampSpanId = '#dt_approved_3';
                    targetCommentSpanId = '#s_approved_3_comment';
                    break;
                case 5: // "専務確認待ち" -> dt_approved_4
                    targetTimestampSpanId = '#dt_approved_4';
                    targetCommentSpanId = '#s_approved_4_comment';
                    break;
                case 6: // "社長確認待ち" -> dt_approved_5
                    targetTimestampSpanId = '#dt_approved_5';
                    targetCommentSpanId = '#s_approved_5_comment';
                    break;
                case 7: // "総務確認待ち" -> dt_checked
                    targetTimestampSpanId = '#dt_checked';
                    targetCommentSpanId = '#s_checked_comment';
                    break;
                // Tidak ada case untuk predecessor (dt_submitted) karena itu dihandle oleh 'submit'
                // Tidak ada case untuk 후임자 karena tidak ada timestamp approval
            }

            if (targetTimestampSpanId) {
                $(targetTimestampSpanId).text(formattedTimestamp);
            }
            if (targetCommentSpanId && $('#approvalComment').val().trim() !== '') {
                 // Hanya update jika ada komentar yang diinput
                $(targetCommentSpanId).text($('#approvalComment').val());
            }
        }
        // --- Akhir Optimistic UI Update ---

        callAjax(params, function(response) {
            alert(response.message || '処理が完了しました。');
            if (response.success) {
                if (response.new_id) {
                    handoverId = response.new_id;
                    window.history.replaceState({}, '', `?id=${handoverId}`);
                }
                // Muat ulang data dari server untuk mendapatkan data yang paling akurat dan status baru
                // Ini akan mengkonfirmasi/mengganti timestamp yang diupdate secara optimis.
                loadHandoverData(handoverId); 

                if (actionType === 'submit' || actionType === 'approve') {
                    const mailParams = {
                        mail_fr: typeof FROM_EMAIL !== 'undefined' ? FROM_EMAIL : 'sistem@example.com',
                        name_to: 'Penerima Notifikasi Berikutnya', // Perlu logika untuk menentukan ini
                        mail_to: 'penerima.berikutnya@example.com', // Perlu logika untuk menentukan ini
                        mail_cc: typeof CC_EMAIL !== 'undefined' ? CC_EMAIL : '',
                        customer_name: $('#s_name').val() || 'N/A',
                        status: response.new_status_text || actionType // Backend sebaiknya mengirim teks status baru
                    };
                    sendEmailNotification(mailParams);
                }
                $('#approvalComment').val(''); // Kosongkan komentar setelah berhasil
            } else {
                // Jika update gagal, mungkin idealnya muat ulang data asli untuk membatalkan optimistic update
                if (handoverId) {
                    console.warn("Update gagal, memuat ulang data asli.");
                    loadHandoverData(handoverId); // Muat ulang data sebelum optimistic update
                }
            }
        });
    }

    // ... (sisa fungsi Anda: getConfirmationMessage, sendEmailNotification, callAjax, formatDateTime, setFixedApproverNames, updateProgressBar, updateProgressBarBasedOnStatus)

    // Tombol Aksi Utama
    $('#btnSubmit').on('click', function() {
        submitHandover('submit');
    });

    $('#btnApprove').on('click', function() {
        submitHandover('approve');
    });

    $('#btnDeny').on('click', function() {
        submitHandover('deny');
    });

    $('#btnSaveDraft').on('click', function() {
        submitHandover('save_draft');
    });

    $('#btnReset').on('click', function() {
        if (confirm('フォームの内容をリセットしますか？')) {
            $('#handoverForm')[0].reset();
            if (handoverId) {
                loadHandoverData(handoverId); // Muat ulang data asli jika sedang edit
            } else {
                // Reset ke default mode baru
                $('#s_predecessor_name').text(loggedInUserName);
                updateProgressBar('新規作成中', 0);
                 // Kosongkan field yang diisi otomatis oleh pemilihan customer
                $('#id_tkc_cd').val('');
                $('#s_name').val('');
                $('#s_address').val('');
            }
        }
    });


    // --- FUNGSI-FUNGSI ---

    /**
     * Memuat data serah terima yang ada ke form
     * @param {string} id - ID serah terima
     */
    function loadHandoverData(id) {
        // Panggil fungsi getHandoverData dari spesifikasi [cite: 21]
        callAjax({ action: 'getHandoverData', id: id }, function(response) {
            if (response && response.success && response.data) {
                populateForm(response.data);
                updateProgressBarBasedOnStatus(response.data.status_value); // Anda perlu field status_value dari backend
                // Set nama predecessor (jika berbeda dari loggedInUser saat ini, misal saat viewing/approving)
                if(response.data.s_predecessor_name) { // Asumsi backend mengirim nama predecessor
                    $('#s_predecessor_name').text(response.data.s_predecessor_name);
                } else {
                     $('#s_predecessor_name').text(loggedInUserName); // Default jika tidak ada
                }
            } else {
                alert('データの読み込みに失敗しました。' + (response ? response.message : ''));
            }
        });
    }

    /**
     * Mengisi form dengan data yang diterima
     * @param {object} data - Objek data serah terima
     */
    function populateForm(data) {
        $('#s_customer').val(data.s_customer || '');
        $('#id_tkc_cd').val(data.id_tkc_cd || '');
        $('#s_name').val(data.s_name || '');
        $('#s_address').val(data.s_address || ''); // Ini akan diisi dari s_address_1 + s_building_1
        $('#s_type').val(data.s_type || '');
        $('#dt_from').val(data.dt_from || '');
        $('#dt_to').val(data.dt_to || '');
        $('#n_advisory_fee').val(data.n_advisory_fee || 0);
        $('#n_account_closing_fee').val(data.n_account_closing_fee || 0);
        $('#n_others_fee').val(data.n_others_fee || '');

        $('#s_rep_name').val(data.s_rep_name || '');
        $('#s_rep_personal').val(data.s_rep_personal || '');
        $('#s_rep_partner_name').val(data.s_rep_partner_name || '');
        $('#s_rep_partner_personal').val(data.s_rep_partner_personal || '');
        $('#s_rep_others_name').val(data.s_rep_others_name || '');
        $('#s_rep_others_personal').val(data.s_rep_others_personal || '');

        $('#s_corp_tel').val(data.s_corp_tel || '');
        $('#s_corp_fax').val(data.s_corp_fax || '');
        $('#s_rep_tel').val(data.s_rep_tel || '');
        $('#s_rep_email').val(data.s_rep_email || '');
        $('#s_rep_contact').val(data.s_rep_contact || '');
        
        $('#n_recovery').val(data.n_recovery || '');
        $('#n_advisory_yet').val(data.n_advisory_yet || '');
        $('#n_account_closing_yet').val(data.n_account_closing_yet || '');
        $('#n_others_yet').val(data.n_others_yet || '');
        $('#dt_recovery').val(data.dt_recovery || '');
        $('#s_recover_reason').val(data.s_recover_reason || '');

        $('#dt_completed').val(data.dt_completed || '');
        $('#n_place').val(data.n_place || '');
        $('#s_place_others').val(data.s_place_others || '');
        $('#s_convenient').val(data.s_convenient || '');
        $('#s_required_time').val(data.s_required_time || '');
        $('#s_affiliated_company').val(data.s_affiliated_company || '');
        $('#s_heeding_audit').val(data.s_heeding_audit || '');

        $('#n_interim_return').val(data.n_interim_return !== null ? data.n_interim_return.toString() : '');
        $('#n_consumption_tax').val(data.n_consumption_tax !== null ? data.n_consumption_tax.toString() : '');
        $('#s_heeding_settlement').val(data.s_heeding_settlement || '');

        $('#dt_last_tax_audit').val(data.dt_last_tax_audit || '');
        $('#s_tax_audit_memo').val(data.s_tax_audit_memo || '');

        // Untuk field Ya/Tidak (TINYINT(1)) yang menggunakan <select>
        setSelectYesNoValue('n_exemption_for_dependents', data.n_exemption_for_dependents);
        $('#s_exemption_for_dependents').val(data.s_exemption_for_dependents || '');
        setSelectYesNoValue('n_last_year_end_adjustment', data.n_last_year_end_adjustment);
        $('#s_last_year_end_adjustment').val(data.s_last_year_end_adjustment || '');
        setSelectYesNoValue('n_payroll_report', data.n_payroll_report);
        $('#s_payroll_report').val(data.s_payroll_report || '');
        setSelectYesNoValue('n_legal_report', data.n_legal_report);
        $('#s_legal_report').val(data.s_legal_report || '');
        setSelectYesNoValue('n_deadline_exceptions', data.n_deadline_exceptions);
        $('#s_deadline_exceptions').val(data.s_deadline_exceptions || '');
        // Field #50 (n_late_payment for withholding tax)
        setSelectYesNoValue('n_late_payment_withholding', data.n_late_payment_withholding); // Sesuaikan nama field dari backend jika berbeda
        $('#s_late_payment_withholding').val(data.s_late_payment_withholding || ''); // Field #51 (s_late_payment for withholding tax remarks)

        setSelectYesNoValue('n_depreciable_assets_tax', data.n_depreciable_assets_tax);
        $('#s_depreciable_assets_tax').val(data.s_depreciable_assets_tax || '');
        setSelectYesNoValue('n_final_tax_return', data.n_final_tax_return);
        $('#s_final_tax_return').val(data.s_final_tax_return || '');
        $('#s_taxpayer_name').val(data.s_taxpayer_name || '');
        
        $('#n_health_insurance').val(data.n_health_insurance !== null ? data.n_health_insurance.toString() : '');
        $('#n_employment_insurance').val(data.n_employment_insurance !== null ? data.n_employment_insurance.toString() : '');
        $('#n_workers_accident_insurance').val(data.n_workers_accident_insurance !== null ? data.n_workers_accident_insurance.toString() : '');
        // Field #60 (n_late_payment for social insurance)
        setSelectYesNoValue('n_late_payment_social', data.n_late_payment_social); // Sesuaikan nama field dari backend jika berbeda
        
        $('#n_greetings_method').val(data.n_greetings_method !== null ? data.n_greetings_method.toString() : '');
        $('#s_special_notes').val(data.s_special_notes || '');
        $('#s_other_notes').val(data.s_other_notes || '');

        // Approval Status Section
        // $('#s_predecessor_name').text(data.s_predecessor_name || loggedInUserName); // s_predecessor_name dari backend atau default
        $('#dt_submitted').text(formatDateTime(data.dt_submitted) || '');
        
        $('#s_superior').val(data.s_superior || ''); // ID atasan
        // Anda mungkin perlu getWorkerData(data.s_superior) untuk menampilkan nama jika datalist hanya berisi ID
        $('#dt_approved_superior').text(formatDateTime(data.dt_approved) || '');
        $('#s_approved_comment').text(data.s_approved || '');

        // Nama approver tetap akan diset oleh setFixedApproverNames()
        $('#dt_approved_1').text(formatDateTime(data.dt_approved_1) || '');
        $('#s_approved_1_comment').text(data.s_approved_1 || '');
        $('#dt_approved_2').text(formatDateTime(data.dt_approved_2) || '');
        $('#s_approved_2_comment').text(data.s_approved_2 || '');
        $('#dt_approved_3').text(formatDateTime(data.dt_approved_3) || '');
        $('#s_approved_3_comment').text(data.s_approved_3 || '');
        $('#dt_approved_4').text(formatDateTime(data.dt_approved_4) || '');
        $('#s_approved_4_comment').text(data.s_approved_4 || '');
        $('#dt_approved_5').text(formatDateTime(data.dt_approved_5) || '');
        $('#s_approved_5_comment').text(data.s_approved_5 || '');
        
        $('#dt_checked').text(formatDateTime(data.dt_checked) || '');
        $('#s_checked_comment').text(data.s_checked || '');

        $('#s_in_charge').val(data.s_in_charge || ''); // ID pengganti
        // Anda mungkin perlu getWorkerData(data.s_in_charge) untuk menampilkan nama
    }

    /**
     * Helper function untuk set value select Ya/Tidak
     */
    function setSelectYesNoValue(selectId, value) {
        if (value !== null && value !== undefined) {
            $('#' + selectId).val(value.toString());
        } else {
            $('#' + selectId).val(''); // Atau default ke '0' (Tidak) jika lebih sesuai
        }
    }


    /**
     * Memuat daftar pekerja ke datalist
     */
    function loadWorkerList() {
        // Panggil fungsi getWorkerList dari spesifikasi [cite: 21]
        callAjax({ action: 'getWorkerList' }, function(response) {
            if (response && response.success && response.data) {
                const superiorDatalist = $('#workerList_superior');
                const inChargeDatalist = $('#workerList_incharge');
                superiorDatalist.empty();
                inChargeDatalist.empty();
                response.data.forEach(function(worker) {
                    // Spesifikasi menyebutkan (id_worker: s_lname s_fname) [cite: 21]
                    // Tapi di tabel v_worker (source 10), ada s_worker dan user_name
                    // Asumsi backend mengirim format: { s_worker: 'id', user_name: 'nama lengkap' }
                    superiorDatalist.append(`<option value="${worker.s_worker}">${worker.user_name}</option>`);
                    inChargeDatalist.append(`<option value="${worker.s_worker}">${worker.user_name}</option>`);
                });
            }
        });
    }

    /**
     * Memuat daftar pelanggan ke datalist
     */
    function loadCustomerList() {
        // Ini memerlukan fungsi backend baru (misal 'getCustomerListForDatalist')
        // yang mengambil data dari v_customer (s_customer, s_corp_name) [cite: 7, 8]
        callAjax({ action: 'getCustomerListForDatalist' }, function(response) {
            if (response && response.success && response.data) {
                const customerDatalist = $('#customerList');
                customerDatalist.empty();
                response.data.forEach(function(customer) {
                    // Asumsi backend mengirim format: { s_customer: 'id', s_corp_name: 'nama perusahaan' }
                    customerDatalist.append(`<option value="${customer.s_customer}">${customer.s_corp_name}</option>`);
                });
            }
        });
    }
    
    /**
     * Mengambil detail pelanggan setelah dipilih
     * @param {string} customerId
     */
    function getCustomerDetails(customerId) {
        // Ini memerlukan fungsi backend baru (misal 'getCustomerDetailsById')
        // yang mengambil data dari v_customer berdasarkan s_customer [cite: 7, 8, 9]
        callAjax({ action: 'getCustomerDetailsById', s_customer: customerId }, function(response) {
            if (response && response.success && response.data) {
                $('#id_tkc_cd').val(response.data.id_tkc_cd || '');
                $('#s_name').val(response.data.s_corp_name || ''); // dari v_customer
                // Alamat: concat(s_address_1, s_building_1)
                const address = (response.data.s_address_1 || '') + (response.data.s_building_1 || '');
                $('#s_address').val(address);
            } else {
                // Mungkin tampilkan error atau biarkan kosong
                console.warn('Gagal mengambil detail pelanggan atau data tidak ditemukan.');
                $('#id_tkc_cd').val('');
                $('#s_name').val('');
                $('#s_address').val('');
            }
        });
    }


    /**
     * Mengirim data form ke server
     * @param {string} actionType - Tipe aksi (submit, approve, deny, save_draft)
     */
    function submitHandover(actionType) {
        if (!confirm(getConfirmationMessage(actionType))) {
            return;
        }

        const formData = $('#handoverForm').serializeArray();
        let params = {
            action: 'updateHandoverData', // Sesuai spesifikasi fungsi jQuery [cite: 21]
            action_type: actionType, // Untuk membedakan aksi di backend
            id: handoverId // Kirim ID jika sedang edit, bisa null untuk baru
        };

        // Ubah serializeArray menjadi objek
        formData.forEach(function(item) {
            params[item.name] = item.value;
        });

        // Tambahkan komentar approval jika ada
        params.approval_comment_text = $('#approvalComment').val(); // Nama parameter ini perlu disesuaikan dengan backend
                                                                 // untuk disimpan ke s_approved, s_approved_1, dll.
                                                                 // tergantung siapa yang melakukan aksi.

        // Tambahkan ID pengguna yang melakukan aksi (penting untuk approval)
        params.actor_user_id = loggedInUserId;


        // Jika ini adalah data baru dan merupakan 'submit' pertama,
        // s_predecessor harus diisi dengan loggedInUserId
        if (!handoverId && actionType === 'submit') {
            params.s_predecessor = loggedInUserId;
        }


        callAjax(params, function(response) {
            alert(response.message || '処理が完了しました。'); // Sesuai spesifikasi: "更新結果をアラート表示" [cite: 21]
            if (response.success) {
                if (response.new_id) { // Jika ini pembuatan baru dan backend mengembalikan ID baru
                    handoverId = response.new_id;
                     // Update URL jika ingin, atau reload data
                    window.history.replaceState({}, '', `?id=${handoverId}`); // Ganti URL tanpa reload
                }
                // Muat ulang data untuk melihat perubahan
                loadHandoverData(handoverId); 

                // Kirim email jika submit atau approve (sesuaikan kondisi)
                if (actionType === 'submit' || actionType === 'approve') {
                    // Siapkan parameter untuk sendMail [cite: 21]
                    // Ini memerlukan logika tambahan untuk menentukan mail_to, name_to, status, dll.
                    // Contoh sederhana:
                    const mailParams = {
                        mail_fr: 'sistem@perusahaan.com', // Ambil dari konfigurasi
                        name_to: 'Penerima Notifikasi', // Perlu ditentukan
                        mail_to: 'penerima@perusahaan.com', // Perlu ditentukan
                        mail_cc: '',
                        customer_name: $('#s_name').val(),
                        status: response.new_status || actionType // Status baru dari backend atau tipe aksi
                    };
                    sendEmailNotification(mailParams);
                }
                 // Kosongkan field komentar setelah berhasil
                $('#approvalComment').val('');
            }
        });
    }
    
    function getConfirmationMessage(actionType) {
        switch(actionType) {
            case 'submit': return 'この内容で提出しますか？';
            case 'approve': return 'この内容を承認しますか？';
            case 'deny': return 'この内容を否認しますか？コメントを記入してください。';
            case 'save_draft': return 'この内容を一時保存しますか？';
            default: return '実行しますか？';
        }
    }


    /**
     * Mengirim notifikasi email
     * @param {object} mailParams - Parameter untuk fungsi sendMail [cite: 21]
     */
    function sendEmailNotification(mailParams) {
        const params = { action: 'sendMail', ...mailParams };
        callAjax(params, function(response) {
            if (response && response.success) {
                console.log('Email notifikasi berhasil dikirim.');
            } else {
                console.error('Gagal mengirim email notifikasi: ' + (response ? response.message : ''));
            }
        });
    }
    
    /**
     * Fungsi pembungkus untuk panggilan AJAX
     * @param {object} dataToSend - Data yang dikirim ke server (termasuk 'action')
     * @param {function} callback - Fungsi yang dijalankan setelah AJAX selesai
     */
    function callAjax(dataToSend, callback) {
        $.ajax({
            type: 'POST',
            url: '../bin/handover.php', // Sesuai struktur direktori [cite: 23]
            data: dataToSend,
            dataType: 'json',
            success: function(response) {
                if (typeof callback === 'function') {
                    callback(response);
                }
            },
            error: function(xhr, status, error) {
                console.error("AJAX Error:", status, error, xhr.responseText);
                alert('サーバーとの通信に失敗しました。');
                if (typeof callback === 'function') {
                    // Kirim respons error standar ke callback jika ada
                    callback({ success: false, message: 'サーバーエラー: ' + error });
                }
            }
        });
    }

    /**
     * Memformat tanggal dan waktu
     * @param {string} dateTimeStr - String tanggal waktu dari DB (YYYY-MM-DD HH:MM:SS)
     * @returns {string} - String yang diformat (YYYY.MM.DD HH:MM:SS) atau string kosong
     */
    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr || dateTimeStr === '0000-00-00 00:00:00') {
            return '';
        }
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return ''; // Invalid date

            const year = date.getFullYear();
            const month = ('0' + (date.getMonth() + 1)).slice(-2);
            const day = ('0' + date.getDate()).slice(-2);
            const hours = ('0' + date.getHours()).slice(-2);
            const minutes = ('0' + date.getMinutes()).slice(-2);
            const seconds = ('0' + date.getSeconds()).slice(-2);
            return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            return ''; // Jika terjadi error saat parsing
        }
    }

    /**
     * Mengatur nama approver yang tetap
     */
    function setFixedApproverNames() {
        // Sesuai feedback: "部長以降は固定のため、氏名をテキスト表示"
        // Anda perlu mengisi nama-nama ini dari konfigurasi atau hardcode jika benar-benar tetap
        $('#bucho_name').text('山田 部長'); // Contoh
        $('#torishimariyaku_name').text('佐藤 取締役'); // Contoh
        $('#jomu_name').text('鈴木 常務'); // Contoh
        $('#senmu_name').text('高橋 専務'); // Contoh
        $('#shacho_name').text('田中 社長'); // Contoh
        // Untuk "総務担当", bisa diisi sesuai kebutuhan
    }

/**
 * Memperbarui progress bar gaya CHEVRON berdasarkan status dari backend
 * @param {string|number} statusValue - Nilai status dari backend
 */
function updateProgressBarBasedOnStatus(statusValue) {
    // Karena status "Ditolak" (9) kembali ke "Draft" (0), kita samakan nilainya untuk UI
    const currentStep = (parseInt(statusValue) === 9) ? 0 : parseInt(statusValue);

    // Loop melalui setiap langkah pada stepper
    $('.chevron-stepper .step-item').each(function() {
        const stepValue = parseInt($(this).data('step'));
        
        // Hapus semua class status terlebih dahulu
        $(this).removeClass('active completed');

        if (stepValue < currentStep) {
            // Jika langkah ini sudah dilewati, tandai sebagai 'completed'
            $(this).addClass('completed');
        } else if (stepValue === currentStep) {
            // Jika ini adalah langkah saat ini, tandai sebagai 'active'
            $(this).addClass('active');
        }
    });

    // Kasus khusus jika statusnya "Selesai" (8)
    if (currentStep === 8) {
        $('.chevron-stepper .step-item').removeClass('active').addClass('completed');
    }
}

    // Set nama pengguna yang login di header
    $('#loggedInUserName').text(`${loggedInUserName} (${typeof LOGGED_IN_USER_DEPARTMENT !== 'undefined' ? LOGGED_IN_USER_DEPARTMENT : '部署'})`);

});