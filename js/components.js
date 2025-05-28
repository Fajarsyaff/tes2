// Komponen Daftar Pengalihan
const HandoverList = {
    template: `
        <div class="handover-list-view">
            <div class="action-bar">
                <div class="search-filters">
                    <div class="filter-group">
                        <label for="status-filter">Status:</label>
                        <select id="status-filter" v-model="searchParams.status">
                            <option value="all">Semua</option>
                            <option value="superior">Menunggu Atasan Langsung</option>
                            <option value="manager">Menunggu Manajer</option>
                            <option value="director">Menunggu Direktur</option>
                            <option value="managing">Menunggu Direktur Utama</option>
                            <option value="senior">Menunggu Direktur Senior</option>
                            <option value="president">Menunggu Presiden</option>
                            <option value="general">Menunggu GA</option>
                            <option value="completed">Selesai</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="keyword-search">Kata Kunci:</label>
                        <input type="text" id="keyword-search" 
                               v-model="searchParams.keyword" 
                               placeholder="Nama perusahaan, nama direktur...">
                    </div>
                    
                    <div class="filter-group">
                        <label>
                            <input type="checkbox" v-model="searchParams.completed">
                            Termasuk yang sudah selesai
                        </label>
                    </div>
                    
                    <button class="btn-search" @click="$emit('search')">
                        <i class="fas fa-search"></i> Cari
                    </button>
                </div>
                
                <button class="btn-new" @click="$emit('change-view', 'edit')">
                    <i class="fas fa-plus"></i> Buat Baru
                </button>
            </div>
            
            <div class="list-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th @click="sortBy('dt_submitted')">
                                Tanggal 
                                <i class="fas" :class="sortIcon('dt_submitted')"></i>
                            </th>
                            <th @click="sortBy('id_tkc_cd')">
                                Kode 
                                <i class="fas" :class="sortIcon('id_tkc_cd')"></i>
                            </th>
                            <th @click="sortBy('s_name')">
                                Nama Perusahaan 
                                <i class="fas" :class="sortIcon('s_name')"></i>
                            </th>
                            <th>Direktur</th>
                            <th>Total Pembayaran</th>
                            <th>Pendahulu</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in handoverList" :key="item.s_customer">
                            <td>{{ formatDate(item.dt_submitted) }}</td>
                            <td>{{ item.id_tkc_cd || '-' }}</td>
                            <td>{{ item.s_name }}</td>
                            <td>{{ item.s_rep_name }}</td>
                            <td>{{ formatCurrency(item.n_advisory_fee + item.n_account_closing_fee + (item.n_others_fee || 0)) }}</td>
                            <td>{{ item.predecessor_name || '-' }}</td>
                            <td>
                                <span class="status-badge" :class="getStatusClass(item.status)">
                                    {{ getStatusText(item.status) }}
                                </span>
                            </td>
                            <td class="actions">
                                <button class="btn-view" @click="$emit('change-view', 'view', item)">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button v-if="item.editable" class="btn-edit" 
                                        @click="$emit('change-view', 'edit', item)">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                
                <div v-if="handoverList.length === 0" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Tidak ada data pengalihan yang ditemukan</p>
                </div>
                
                <div class="pagination" v-if="totalPages > 1">
                    <button @click="prevPage" :disabled="currentPage === 1">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
                    <button @click="nextPage" :disabled="currentPage === totalPages">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `,
    props: ['searchParams', 'handoverList'],
    data() {
        return {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0,
            sortField: 'dt_submitted',
            sortOrder: 'desc'
        };
    },
    computed: {
        totalPages() {
            return Math.ceil(this.totalItems / this.itemsPerPage);
        }
    },
    methods: {
        formatDate,
        formatCurrency,
        getStatusText(status) {
            const statusMap = {
                'superior': 'Atasan Langsung',
                'manager': 'Manajer',
                'director': 'Direktur',
                'managing': 'Dir. Utama',
                'senior': 'Dir. Senior',
                'president': 'Presiden',
                'general': 'GA',
                'completed': 'Selesai',
                'denied': 'Ditolak'
            };
            return statusMap[status] || status;
        },
        getStatusClass(status) {
            return {
                'pending': status !== 'completed' && status !== 'denied',
                'completed': status === 'completed',
                'denied': status === 'denied'
            };
        },
        sortBy(field) {
            if (this.sortField === field) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortField = field;
                this.sortOrder = 'asc';
            }
            this.$emit('search');
        },
        sortIcon(field) {
            if (this.sortField !== field) return 'fa-sort';
            return this.sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
        },
        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.$emit('search');
            }
        },
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.$emit('search');
            }
        }
    }
};

// Komponen Form Edit
const HandoverEdit = {
    template: `
        <div class="handover-edit-view">
            <div class="edit-header">
                <h2>
                    <i class="fas" :class="isNew ? 'fa-file-alt' : 'fa-edit'"></i>
                    {{ isNew ? 'Buat Pengalihan Baru' : 'Edit Pengalihan' }}
                </h2>
                <div class="header-actions">
                    <button class="btn-back" @click="$emit('change-view', 'list')">
                        <i class="fas fa-arrow-left"></i> Kembali
                    </button>
                </div>
            </div>
            
            <div class="approval-progress">
                <div v-for="(step, index) in approvalSteps" 
                     :key="index"
                     class="progress-step"
                     :class="{
                         'active': isStepActive(step),
                         'completed': isStepCompleted(step),
                         'denied': isStepDenied(step)
                     }">
                    <div class="step-icon">
                        <i v-if="isStepCompleted(step)" class="fas fa-check"></i>
                        <i v-else-if="isStepDenied(step)" class="fas fa-times"></i>
                        <span v-else>{{ index + 1 }}</span>
                    </div>
                    <div class="step-label">{{ step.label }}</div>
                    <div class="step-date" v-if="step.dateField && handoverData[step.dateField]">
                        {{ formatDate(handoverData[step.dateField]) }}
                    </div>
                </div>
            </div>
            
            <form @submit.prevent="saveHandover" class="handover-form">
                <!-- Bagian Informasi Perusahaan -->
                <div class="form-section">
                    <div class="section-header" @click="toggleSection('company')">
                        <h3>
                            <i class="fas" :class="sections.company.collapsed ? 'fa-plus' : 'fa-minus'"></i>
                            Informasi Perusahaan
                        </h3>
                    </div>
                    <div class="section-content" v-show="!sections.company.collapsed">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="s_customer">ID Pelanggan:</label>
                                <input type="text" id="s_customer" v-model="handoverData.s_customer" 
                                       required :readonly="!isNew">
                            </div>
                            <div class="form-group">
                                <label for="id_tkc_cd">Kode Perusahaan:</label>
                                <input type="text" id="id_tkc_cd" v-model="handoverData.id_tkc_cd">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="s_name">Nama Perusahaan:</label>
                            <input type="text" id="s_name" v-model="handoverData.s_name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="s_address">Alamat:</label>
                            <textarea id="s_address" v-model="handoverData.s_address" required></textarea>
                        </div>
                        
                        <!-- Tambahkan field lainnya sesuai kebutuhan -->
                    </div>
                </div>
                
                <!-- Bagian Informasi Direktur -->
                <div class="form-section">
                    <div class="section-header" @click="toggleSection('director')">
                        <h3>
                            <i class="fas" :class="sections.director.collapsed ? 'fa-plus' : 'fa-minus'"></i>
                            Informasi Direktur
                        </h3>
                    </div>
                    <div class="section-content" v-show="!sections.director.collapsed">
                        <!-- Field informasi direktur -->
                    </div>
                </div>
                
                <!-- Bagian-bagian form lainnya -->
                
                <div class="form-actions">
                    <button type="button" class="btn-cancel" @click="$emit('change-view', 'list')">
                        Batal
                    </button>
                    <button type="submit" class="btn-save">
                        <i class="fas fa-save"></i> Simpan
                    </button>
                    <button v-if="canSubmit" type="button" class="btn-submit" @click="submitHandover">
                        <i class="fas fa-paper-plane"></i> Ajukan
                    </button>
                </div>
            </form>
        </div>
    `,
    props: ['handoverData'],
    data() {
        return {
            sections: {
                company: { collapsed: false },
                director: { collapsed: true },
                // Tambahkan bagian lainnya
            },
            approvalSteps: [
                { key: 'superior', label: 'Atasan Langsung', dateField: 'dt_approved' },
                { key: 'manager', label: 'Manajer', dateField: 'dt_approved_1' },
                // Langkah-langkah lainnya
            ],
            localData: {}
        };
    },
    computed: {
        isNew() {
            return !this.handoverData || !this.handoverData.s_customer;
        },
        canSubmit() {
            // Logika untuk menentukan apakah bisa diajukan
            return this.isNew || this.handoverData.status === 'draft';
        }
    },
    created() {
        this.localData = this.handoverData ? { ...this.handoverData } : this.getDefaultData();
    },
    methods: {
        toggleSection(section) {
            this.sections[section].collapsed = !this.sections[section].collapsed;
        },
        isStepActive(step) {
            return this.handoverData.status === step.key;
        },
        isStepCompleted(step) {
            return !!this.handoverData[step.dateField];
        },
        isStepDenied(step) {
            return this.handoverData.status === 'denied' && 
                   this.handoverData.dt_denied && 
                   (!this.handoverData[step.dateField] || 
                    new Date(this.handoverData.dt_denied) > new Date(this.handoverData[step.dateField]));
        },
        getDefaultData() {
            return {
                status: 'draft',
                dt_submitted: new Date().toISOString(),
                // Field lainnya dengan nilai default
            };
        },
        saveHandover() {
            // Logika penyimpanan
            this.$emit('change-view', 'list');
        },
        submitHandover() {
            // Logika pengajuan
            this.$emit('change-view', 'list');
        }
    }
};

// Komponen Tampilan Detail
const HandoverView = {
    template: `
        <div class="handover-view-view">
            <!-- Implementasi tampilan detail -->
        </div>
    `,
    props: ['handoverData']
};

// Aplikasi Vue Utama
const app = Vue.createApp({
    components: {
        'list-view': HandoverList,
        'edit-view': HandoverEdit,
        'view-view': HandoverView
    },
    data() {
        return {
            currentView: 'list-view',
            user: {
                name: 'John Doe',
                initials: 'JD',
                role: 'auditor'
            },
            loading: false,
            notification: {
                show: false,
                type: 'info',
                message: ''
            },
            searchParams: {
                status: 'all',
                keyword: '',
                completed: false,
                sortBy: 'dt_submitted',
                sortOrder: 'desc'
            },
            handoverData: null,
            handoverList: []
        };
    },
    methods: {
        changeView(view, data = null) {
            this.currentView = view + '-view';
            this.handoverData = data;
        },
        fetchHandoverList() {
            this.loading = true;
            // Simulasi pengambilan data
            setTimeout(() => {
                this.handoverList = this.mockHandoverData();
                this.loading = false;
            }, 1000);
        },
        showNotification(type, message) {
            this.notification = { show: true, type, message };
            setTimeout(this.hideNotification, 5000);
        },
        hideNotification() {
            this.notification.show = false;
        },
        mockHandoverData() {
            // Data dummy untuk simulasi
            return [
                {
                    s_customer: 'CUST001',
                    id_tkc_cd: 'TKC001',
                    s_name: 'PT Contoh Indonesia',
                    s_rep_name: 'Budi Santoso',
                    n_advisory_fee: 5000000,
                    n_account_closing_fee: 3000000,
                    n_others_fee: 1000000,
                    predecessor_name: 'Andi Wijaya',
                    dt_submitted: '2023-05-15',
                    status: 'superior',
                    editable: true
                },
                // Tambahkan data dummy lainnya
            ];
        }
    },
    created() {
        this.fetchHandoverList();
    }
});

// Direktif Kustom
app.directive('focus', {
    mounted(el) {
        el.focus();
    }
});

// Filter Global
app.config.globalProperties.$filters = {
    formatDate,
    formatCurrency
};

// Mount aplikasi
app.mount('#app');

// Fungsi utilitas
function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

function formatCurrency(amount) {
    if (isNaN(amount)) return 'Rp0';
    return 'Rp' + amount.toLocaleString('id-ID');
}