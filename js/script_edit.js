$(document).ready(function() {
    // Assumption: handoverId is obtained from URL parameters or other means during edit
    // For new data, handoverId could be null or undefined.
    const urlParams = new URLSearchParams(window.location.search);
    let handoverId = urlParams.get('id'); // Example of getting ID from URL: ?id=xxx

    // Assumption: Logged-in user information is available (e.g., from global_constants.js or session)
    // Replace with your method of getting this information
    const loggedInUserId = typeof LOGGED_IN_USER_ID !== 'undefined' ? LOGGED_IN_USER_ID : 'user01'; // Example ID
    const loggedInUserName = typeof LOGGED_IN_USER_NAME !== 'undefined' ? LOGGED_IN_USER_NAME : 'Logged-in User Name';
    // const loggedInUserDepartment = typeof LOGGED_IN_USER_DEPARTMENT !== 'undefined' ? LOGGED_IN_USER_DEPARTMENT : 'Audit Department';

    // --- PAGE INITIALIZATION ---
    loadWorkerList();
    loadCustomerList(); // You need to create this function to load customer list
    setFixedApproverNames(); // Set fixed approver names

    if (handoverId) {
        // Edit Mode: Load existing data
        loadHandoverData(handoverId);
    } else {
        // New Mode: Set some defaults if needed
        $('#s_predecessor_name').text(loggedInUserName); // Predecessor name is current user
        $('#dt_submitted').text(''); // Will be filled when submitted
        updateProgressBarBasedOnStatus('New Creation', 0); // Initial progress bar for new mode
    }

    // --- EVENT HANDLERS ---

        $('#btnBackTop').on('click', function() {
        // Same confirmation logic can be applied here
        window.location.href = 'handover.html'; // Redirect to handover.html
    });

    // Customer Selection
    $('#s_customer').on('input', function() { // 'input' event is better for datalist
        const customerId = $(this).val();
        const selectedOption = $('#customerList option[value="' + customerId + '"]');
        
        if (selectedOption.length > 0) { // Make sure value exists in datalist
            // Get customer details ( 関与先CD, 商号, 住所 )
            // You need backend function for this, or if data is already in frontend, get it from there
            // Example: calling getCustomerDetails(customerId) function
            getCustomerDetails(customerId); // Implement this function
        } else {
            // Clear fields if input doesn't match datalist options
            $('#id_tkc_cd').val('');
            $('#s_name').val('');
            $('#s_address').val('');
        }
    });

    //button 
     /**
     * Populates form with received data
     * @param {object} data - Handover data object
     */
    function populateForm(data) {
        // ... (your existing populateForm code for all other fields) ...

        // Save current status value globally or as data attribute
        currentHandoverStatusValue = data.status_value; // Assumption 'status_value' is a field from backend
                                                       // representing numeric status (e.g., 1 for 'Waiting for Manager Approval')

        // ... (rest of your populateForm code for filling dates and comments from 'data')
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
        
        // Update progress bar here too based on loaded status
        updateProgressBarBasedOnStatus(currentHandoverStatusValue);
    }


    /**
     * Sends form data to server
     * @param {string} actionType - Action type (submit, approve, deny, save_draft)
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

        // --- Optimistic UI Update for Timestamp if 'approve' ---
        if (actionType === 'approve') {
            const now = new Date();
            // Create YYYY-MM-DD HH:MM:SS format for consistency with formatDateTime
            const year = now.getFullYear();
            const month = ('0' + (now.getMonth() + 1)).slice(-2);
            const day = ('0' + now.getDate()).slice(-2);
            const hours = ('0' + now.getHours()).slice(-2);
            const minutes = ('0' + now.getMinutes()).slice(-2);
            const seconds = ('0' + now.getSeconds()).slice(-2);
            const dbFormatTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            
            const formattedTimestamp = formatDateTime(dbFormatTimestamp); // Using existing format function

            // Determine which span to update based on status BEFORE this approval.
            // `currentHandoverStatusValue` should reflect status when "Approve" button is clicked.
            // This logic assumes that the user clicking "Approve" is the appropriate approver
            // for `currentHandoverStatusValue`.
            let targetTimestampSpanId = null;
            let targetCommentSpanId = null; // Also update comment optimistically

            // Mapping status (BEFORE approval) to fields to be filled NOW
            // These status values are document status BEFORE this approve action.
            // For example, if currentHandoverStatusValue is 1 ('Waiting for Manager Approval'),
            // then 'Manager' is currently approving, and timestamp for 'Manager' will be filled.
            switch (parseInt(currentHandoverStatusValue)) {
                case 1: // If status "Waiting for Manager Approval", then dt_approved (Manager's) is filled
                    targetTimestampSpanId = '#dt_approved_superior';
                    targetCommentSpanId = '#s_approved_comment';
                    break;
                case 2: // If status "Waiting for Department Head Approval", then dt_approved_1 (Department Head's) is filled
                    targetTimestampSpanId = '#dt_approved_1';
                    targetCommentSpanId = '#s_approved_1_comment';
                    break;
                case 3: // "Waiting for Director Approval" -> dt_approved_2
                    targetTimestampSpanId = '#dt_approved_2';
                    targetCommentSpanId = '#s_approved_2_comment';
                    break;
                case 4: // "Waiting for Managing Director Approval" -> dt_approved_3
                    targetTimestampSpanId = '#dt_approved_3';
                    targetCommentSpanId = '#s_approved_3_comment';
                    break;
                case 5: // "Waiting for Senior Managing Director Approval" -> dt_approved_4
                    targetTimestampSpanId = '#dt_approved_4';
                    targetCommentSpanId = '#s_approved_4_comment';
                    break;
                case 6: // "Waiting for President Approval" -> dt_approved_5
                    targetTimestampSpanId = '#dt_approved_5';
                    targetCommentSpanId = '#s_approved_5_comment';
                    break;
                case 7: // "Waiting for General Affairs Approval" -> dt_checked
                    targetTimestampSpanId = '#dt_checked';
                    targetCommentSpanId = '#s_checked_comment';
                    break;
                // No case for predecessor (dt_submitted) because handled by 'submit'
                // No case for successor because there's no approval timestamp
            }

            if (targetTimestampSpanId) {
                $(targetTimestampSpanId).text(formattedTimestamp);
            }
            if (targetCommentSpanId && $('#approvalComment').val().trim() !== '') {
                 // Only update if there's input comment
                $(targetCommentSpanId).text($('#approvalComment').val());
            }
        }
        // --- End of Optimistic UI Update ---

        callAjax(params, function(response) {
            alert(response.message || 'Processing completed.');
            if (response.success) {
                if (response.new_id) {
                    handoverId = response.new_id;
                    window.history.replaceState({}, '', `?id=${handoverId}`);
                }
                // Reload data from server to get most accurate data and new status
                // This will confirm/replace optimistically updated timestamps.
                loadHandoverData(handoverId); 

                if (actionType === 'submit' || actionType === 'approve') {
                    const mailParams = {
                        mail_fr: typeof FROM_EMAIL !== 'undefined' ? FROM_EMAIL : 'sistem@example.com',
                        name_to: 'Next Notification Recipient', // Need logic to determine this
                        mail_to: 'next.recipient@example.com', // Need logic to determine this
                        mail_cc: typeof CC_EMAIL !== 'undefined' ? CC_EMAIL : '',
                        customer_name: $('#s_name').val() || 'N/A',
                        status: response.new_status_text || actionType // Backend should send new status text
                    };
                    sendEmailNotification(mailParams);
                }
                $('#approvalComment').val(''); // Clear comment after success
            } else {
                // If update fails, maybe reload original data to undo optimistic update
                if (handoverId) {
                    console.warn("Update failed, reloading original data.");
                    loadHandoverData(handoverId); // Reload data before optimistic update
                }
            }
        });
    }

    // ... (rest of your functions: getConfirmationMessage, sendEmailNotification, callAjax, formatDateTime, setFixedApproverNames, updateProgressBar, updateProgressBarBasedOnStatus)

    // Main Action Buttons
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
        if (confirm('Reset form contents?')) {
            $('#handoverForm')[0].reset();
            if (handoverId) {
                loadHandoverData(handoverId); // Reload original data if editing
            } else {
                // Reset to new mode defaults
                $('#s_predecessor_name').text(loggedInUserName);
                updateProgressBar('New Creation', 0);
                 // Clear fields auto-filled by customer selection
                $('#id_tkc_cd').val('');
                $('#s_name').val('');
                $('#s_address').val('');
            }
        }
    });


    // --- FUNCTIONS ---

    /**
     * Loads existing handover data into form
     * @param {string} id - Handover ID
     */
    function loadHandoverData(id) {
        // Call getHandoverData function from specification [cite: 21]
        callAjax({ action: 'getHandoverData', id: id }, function(response) {
            if (response && response.success && response.data) {
                populateForm(response.data);
                updateProgressBarBasedOnStatus(response.data.status_value); // You need status_value field from backend
                // Set predecessor name (if different from current loggedInUser, e.g., when viewing/approving)
                if(response.data.s_predecessor_name) { // Assumption backend sends predecessor name
                    $('#s_predecessor_name').text(response.data.s_predecessor_name);
                } else {
                     $('#s_predecessor_name').text(loggedInUserName); // Default if none
                }
            } else {
                alert('Failed to load data.' + (response ? response.message : ''));
            }
        });
    }

    /**
     * Populates form with received data
     * @param {object} data - Handover data object
     */
    function populateForm(data) {
        $('#s_customer').val(data.s_customer || '');
        $('#id_tkc_cd').val(data.id_tkc_cd || '');
        $('#s_name').val(data.s_name || '');
        $('#s_address').val(data.s_address || ''); // This will be filled from s_address_1 + s_building_1
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

        // For Yes/No fields (TINYINT(1)) using <select>
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
        setSelectYesNoValue('n_late_payment_withholding', data.n_late_payment_withholding); // Adjust field name from backend if different
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
        setSelectYesNoValue('n_late_payment_social', data.n_late_payment_social); // Adjust field name from backend if different
        
        $('#n_greetings_method').val(data.n_greetings_method !== null ? data.n_greetings_method.toString() : '');
        $('#s_special_notes').val(data.s_special_notes || '');
        $('#s_other_notes').val(data.s_other_notes || '');

        // Approval Status Section
        // $('#s_predecessor_name').text(data.s_predecessor_name || loggedInUserName); // s_predecessor_name from backend or default
        $('#dt_submitted').text(formatDateTime(data.dt_submitted) || '');
        
        $('#s_superior').val(data.s_superior || ''); // Superior ID
        // You might need getWorkerData(data.s_superior) to display name if datalist only contains IDs
        $('#dt_approved_superior').text(formatDateTime(data.dt_approved) || '');
        $('#s_approved_comment').text(data.s_approved || '');

        // Fixed approver names will be set by setFixedApproverNames()
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

        $('#s_in_charge').val(data.s_in_charge || ''); // Successor ID
        // You might need getWorkerData(data.s_in_charge) to display name
    }

    /**
     * Helper function to set Yes/No select value
     */
    function setSelectYesNoValue(selectId, value) {
        if (value !== null && value !== undefined) {
            $('#' + selectId).val(value.toString());
        } else {
            $('#' + selectId).val(''); // Or default to '0' (No) if more appropriate
        }
    }


    /**
     * Loads worker list into datalist
     */
    function loadWorkerList() {
        // Call getWorkerList function from specification [cite: 21]
        callAjax({ action: 'getWorkerList' }, function(response) {
            if (response && response.success && response.data) {
                const superiorDatalist = $('#workerList_superior');
                const inChargeDatalist = $('#workerList_incharge');
                superiorDatalist.empty();
                inChargeDatalist.empty();
                response.data.forEach(function(worker) {
                    // Specification mentions (id_worker: s_lname s_fname) [cite: 21]
                    // But in v_worker table (source 10), there's s_worker and user_name
                    // Assumption backend sends format: { s_worker: 'id', user_name: 'full name' }
                    superiorDatalist.append(`<option value="${worker.s_worker}">${worker.user_name}</option>`);
                    inChargeDatalist.append(`<option value="${worker.s_worker}">${worker.user_name}</option>`);
                });
            }
        });
    }

    /**
     * Loads customer list into datalist
     */
    function loadCustomerList() {
        // This requires new backend function (e.g., 'getCustomerListForDatalist')
        // that gets data from v_customer (s_customer, s_corp_name) [cite: 7, 8]
        callAjax({ action: 'getCustomerListForDatalist' }, function(response) {
            if (response && response.success && response.data) {
                const customerDatalist = $('#customerList');
                customerDatalist.empty();
                response.data.forEach(function(customer) {
                    // Assumption backend sends format: { s_customer: 'id', s_corp_name: 'company name' }
                    customerDatalist.append(`<option value="${customer.s_customer}">${customer.s_corp_name}</option>`);
                });
            }
        });
    }
    
    /**
     * Gets customer details after selection
     * @param {string} customerId
     */
    function getCustomerDetails(customerId) {
        // This requires new backend function (e.g., 'getCustomerDetailsById')
        // that gets data from v_customer based on s_customer [cite: 7, 8, 9]
        callAjax({ action: 'getCustomerDetailsById', s_customer: customerId }, function(response) {
            if (response && response.success && response.data) {
                $('#id_tkc_cd').val(response.data.id_tkc_cd || '');
                $('#s_name').val(response.data.s_corp_name || ''); // from v_customer
                // Address: concat(s_address_1, s_building_1)
                const address = (response.data.s_address_1 || '') + (response.data.s_building_1 || '');
                $('#s_address').val(address);
            } else {
                // Maybe show error or leave empty
                console.warn('Failed to get customer details or data not found.');
                $('#id_tkc_cd').val('');
                $('#s_name').val('');
                $('#s_address').val('');
            }
        });
    }


    /**
     * Sends form data to server
     * @param {string} actionType - Action type (submit, approve, deny, save_draft)
     */
    function submitHandover(actionType) {
        if (!confirm(getConfirmationMessage(actionType))) {
            return;
        }

        const formData = $('#handoverForm').serializeArray();
        let params = {
            action: 'updateHandoverData', // According to jQuery function specification [cite: 21]
            action_type: actionType, // To differentiate action in backend
            id: handoverId // Send ID if editing, could be null for new
        };

        // Convert serializeArray to object
        formData.forEach(function(item) {
            params[item.name] = item.value;
        });

        // Add approval comment if exists
        params.approval_comment_text = $('#approvalComment').val(); // This parameter name needs to match backend
                                                                 // to be saved to s_approved, s_approved_1, etc.
                                                                 // depending on who performs the action.

        // Add ID of user performing action (important for approval)
        params.actor_user_id = loggedInUserId;


        // If this is new data and first 'submit',
        // s_predecessor should be filled with loggedInUserId
        if (!handoverId && actionType === 'submit') {
            params.s_predecessor = loggedInUserId;
        }


        callAjax(params, function(response) {
            alert(response.message || 'Processing completed.'); // According to specification: "Show update result in alert" [cite: 21]
            if (response.success) {
                if (response.new_id) { // If this is new creation and backend returns new ID
                    handoverId = response.new_id;
                     // Update URL if desired, or reload data
                    window.history.replaceState({}, '', `?id=${handoverId}`); // Change URL without reload
                }
                // Reload data to see changes
                loadHandoverData(handoverId); 

                // Send email if submit or approve (adjust conditions)
                if (actionType === 'submit' || actionType === 'approve') {
                    // Prepare parameters for sendMail [cite: 21]
                    // This requires additional logic to determine mail_to, name_to, status, etc.
                    // Simple example:
                    const mailParams = {
                        mail_fr: 'system@company.com', // Get from configuration
                        name_to: 'Notification Recipient', // Needs to be determined
                        mail_to: 'recipient@company.com', // Needs to be determined
                        mail_cc: '',
                        customer_name: $('#s_name').val(),
                        status: response.new_status || actionType // New status from backend or action type
                    };
                    sendEmailNotification(mailParams);
                }
                 // Clear comment field after success
                $('#approvalComment').val('');
            }
        });
    }
    
    function getConfirmationMessage(actionType) {
        switch(actionType) {
            case 'submit': return 'Submit with this content?';
            case 'approve': return 'Approve this content?';
            case 'deny': return 'Deny this content? Please enter a comment.';
            case 'save_draft': return 'Save this content temporarily?';
            default: return 'Execute?';
        }
    }


    /**
     * Sends email notification
     * @param {object} mailParams - Parameters for sendMail function [cite: 21]
     */
    function sendEmailNotification(mailParams) {
        const params = { action: 'sendMail', ...mailParams };
        callAjax(params, function(response) {
            if (response && response.success) {
                console.log('Email notification sent successfully.');
            } else {
                console.error('Failed to send email notification: ' + (response ? response.message : ''));
            }
        });
    }
    
    /**
     * Wrapper function for AJAX calls
     * @param {object} dataToSend - Data to send to server (including 'action')
     * @param {function} callback - Function to execute after AJAX completes
     */
    function callAjax(dataToSend, callback) {
        $.ajax({
            type: 'POST',
            url: '../bin/handover.php', // According to directory structure [cite: 23]
            data: dataToSend,
            dataType: 'json',
            success: function(response) {
                if (typeof callback === 'function') {
                    callback(response);
                }
            },
            error: function(xhr, status, error) {
                console.error("AJAX Error:", status, error, xhr.responseText);
                alert('Failed to communicate with server.');
                if (typeof callback === 'function') {
                    // Send standard error response to callback if exists
                    callback({ success: false, message: 'Server error: ' + error });
                }
            }
        });
    }

    /**
     * Formats date and time
     * @param {string} dateTimeStr - Date time string from DB (YYYY-MM-DD HH:MM:SS)
     * @returns {string} - Formatted string (YYYY.MM.DD HH:MM:SS) or empty string
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
            return ''; // If error occurs during parsing
        }
    }

    /**
     * Sets fixed approver names
     */
    function setFixedApproverNames() {
        // According to feedback: "Department head and above are fixed, so display names as text"
        // You need to fill these names from configuration or hardcode if truly fixed
        $('#bucho_name').text('Yamada Department Head'); // Example
        $('#torishimariyaku_name').text('Sato Director'); // Example
        $('#jomu_name').text('Suzuki Managing Director'); // Example
        $('#senmu_name').text('Takahashi Senior Managing Director'); // Example
        $('#shacho_name').text('Tanaka President'); // Example
        // For "General Affairs", fill as needed
    }

/**
 * Updates CHEVRON style progress bar based on status from backend
 * @param {string|number} statusValue - Status value from backend
 */
function updateProgressBarBasedOnStatus(statusValue) {
    // Since "Rejected" status (9) returns to "Draft" (0), we make their values equal for UI
    const currentStep = (parseInt(statusValue) === 9) ? 0 : parseInt(statusValue);

    // Loop through each step in stepper
    $('.chevron-stepper .step-item').each(function() {
        const stepValue = parseInt($(this).data('step'));
        
        // Remove all status classes first
        $(this).removeClass('active completed');

        if (stepValue < currentStep) {
            // If this step is already passed, mark as 'completed'
            $(this).addClass('completed');
        } else if (stepValue === currentStep) {
            // If this is current step, mark as 'active'
            $(this).addClass('active');
        }
    });

    // Special case if status is "Completed" (8)
    if (currentStep === 8) {
        $('.chevron-stepper .step-item').removeClass('active').addClass('completed');
    }
}

    // Set logged-in user name in header
    $('#loggedInUserName').text(`${loggedInUserName} (${typeof LOGGED_IN_USER_DEPARTMENT !== 'undefined' ? LOGGED_IN_USER_DEPARTMENT : 'Department'})`);

});