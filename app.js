/**
 * نظام POS الاحترافي - التطبيق الرئيسي (محدّث ومُصلح)
 * Professional POS System - Main Application
 * @version 2.2 - Fixed Version
 */


// ==================== التهيئة الأولية ====================
const POSApp = {
    data: {
        products: [],
        customers: [],
        sales: [],
        cart: [],
        settings: {
    storeName: 'مدرسة عكرمة POS',
    currency: 'د.أ',
    taxRate: 16,
    lowStockThreshold: 5
      }
    },
    
    state: {
        currentPage: 'dashboard',
        currentPaymentMethod: 'cash',
        selectedCustomer: null,
        discount: 0,
        productsView: 'grid'
    },
    
    charts: {
        sales: null,
        category: null,
        revenue: null,
        inventory: null,
        categoryPerformance: null,
        paymentMethods: null
    }
};

// ==================== تحميل التطبيق ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل نظام POS الاحترافي...');
    
    initLocalStorage();
    loadData();
    initUI();
    loadPage('dashboard');
    
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 1000);
    
    console.log('✅ تم تحميل النظام بنجاح');
});

// ==================== تهيئة LocalStorage ====================
function initLocalStorage() {
    if (!localStorage.getItem('posData')) {
        const initialData = {
            products: [],
            customers: [],
            sales: [],
            settings: POSApp.data.settings
        };
        
        localStorage.setItem('posData', JSON.stringify(initialData));
    }
}


function generateSampleSales() {
    return [];
}
// ==================== تحميل وحفظ البيانات ====================
function loadData() {
    try {
        const data = JSON.parse(localStorage.getItem('posData'));
        if (data && data.products && data.customers && data.sales && data.settings) {
            POSApp.data = data;
            // التأكد من وجود السلة
            if (!Array.isArray(POSApp.data.cart)) {
                POSApp.data.cart = [];
            }
            console.log('✅ تم تحميل البيانات بنجاح:', {
                products: POSApp.data.products.length,
                customers: POSApp.data.customers.length,
                sales: POSApp.data.sales.length
            });
        } else {
            console.warn('⚠️ البيانات غير كاملة، إعادة التهيئة...');
            initLocalStorage();
            loadData();
            return;
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        initLocalStorage();
        loadData();
        return;
    }

    // ✅ تحديث قوائم الفئات فور تحميل البيانات
    updateCategorySelects();
}

function saveData() {
    try {
        localStorage.setItem('posData', JSON.stringify(POSApp.data));
        console.log('✅ تم حفظ البيانات بنجاح');
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات:', error);
        showToast('error', 'خطأ', 'فشل حفظ البيانات');
    }
}

// ==================== تهيئة واجهة المستخدم ====================
function initUI() {
    // التأكد من تحميل البيانات أولاً
    if (!POSApp.data || !POSApp.data.products) {
        console.error('❌ البيانات غير محملة في initUI');
        setTimeout(initUI, 100);
        return;
    }
    
    
    // التنقل بين الصفحات
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            loadPage(page);
        });
    });
    
    
    
    const notificationsBtn = document.getElementById('notificationsBtn');
if (notificationsBtn) notificationsBtn.addEventListener('click', showNotifications);

const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) settingsBtn.addEventListener('click', () => openModal('settingsModal'));

const markAllReadBtn = document.getElementById('markAllReadBtn');
if (markAllReadBtn) markAllReadBtn.addEventListener('click', markAllNotificationsRead);

    
    const mobileMenuBtn = document.getElementById('mobileMenuToggle');
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    
    // إغلاق النوافذ المنبثقة
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(this.getAttribute('data-modal'));
        });
    });
    
    // إغلاق النوافذ عند النقر على الخلفية
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                const modal = this.closest('.modal');
                if (modal) closeModal(modal.id);
            }
        });
    });
    
    // أزرار إضافة
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.addEventListener('click', () => openProductModal());
    
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    if (addCustomerBtn) addCustomerBtn.addEventListener('click', () => openCustomerModal());
    
    // حفظ النماذج
    const productForm = document.getElementById('productForm');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);
    
    const customerForm = document.getElementById('customerForm');
    if (customerForm) customerForm.addEventListener('submit', handleCustomerSubmit);
    
    // POS - البحث والفلاتر
    const posSearch = document.getElementById('posSearch');
    if (posSearch) posSearch.addEventListener('input', handlePOSSearch);
    
    // POS - أزرار الفئات
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');
            displayPOSProducts(category);
        });
    });
    
    // السلة
    const clearCartBtn = document.getElementById('clearCart');
    if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);
    
    const discountInput = document.getElementById('discountInput');
    if (discountInput) discountInput.addEventListener('input', updateCartSummary);
    
    // طرق الدفع
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            POSApp.state.currentPaymentMethod = this.getAttribute('data-method');
        });
    });
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
    
    // المنتجات
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            POSApp.state.productsView = this.getAttribute('data-view');
            displayProducts();
        });
    });
    
    const productsSearch = document.getElementById('productsSearch');
    if (productsSearch) productsSearch.addEventListener('input', filterProducts);
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
    
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter) stockFilter.addEventListener('change', filterProducts);
    
    // العملاء
    const customersSearch = document.getElementById('customersSearch');
    if (customersSearch) customersSearch.addEventListener('input', filterCustomers);
    
    // المبيعات
    const salesSearch = document.getElementById('salesSearch');
    if (salesSearch) salesSearch.addEventListener('input', filterSales);
    
    const paymentMethodFilter = document.getElementById('paymentMethodFilter');
    if (paymentMethodFilter) paymentMethodFilter.addEventListener('change', filterSales);
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) dateFilter.addEventListener('change', filterSales);
    
    const exportSalesBtn = document.getElementById('exportSales');
    if (exportSalesBtn) exportSalesBtn.addEventListener('click', exportSales);
    
    // التقارير
    const reportPeriod = document.getElementById('reportPeriod');
    if (reportPeriod) reportPeriod.addEventListener('change', updateReports);
    

    // لوحة التحكم
    const refreshDashboardBtn = document.getElementById('refreshDashboard');
    if (refreshDashboardBtn) refreshDashboardBtn.addEventListener('click', () => loadPage('dashboard'));
    
    // الإعدادات
    const generateBarcodeBtn = document.getElementById('generateBarcode');
    if (generateBarcodeBtn) {
        generateBarcodeBtn.addEventListener('click', () => {
            const barcodeInput = document.getElementById('productBarcode');
            if (barcodeInput) barcodeInput.value = generateBarcode();
        });
    }
    
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
    
    const exportDataBtn = document.getElementById('exportData');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAllData);
    
    const importDataBtn = document.getElementById('importData');
    if (importDataBtn) importDataBtn.addEventListener('click', importAllData);
    
    const clearAllDataBtn = document.getElementById('clearAllData');
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', clearAllData);
    
    const printInvoiceBtn = document.getElementById('printInvoice');
    if (printInvoiceBtn) printInvoiceBtn.addEventListener('click', () => window.print());
    
    // تحميل قائمة العملاء
    loadCustomerSelect();
    
    // View All Links
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) loadPage(page);
        });
    });

    console.log('✅ تم تهيئة واجهة المستخدم بنجاح');
}

// ==================== التنقل بين الصفحات ====================
function loadPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    const page = document.getElementById(pageName + 'Page');
    if (page) {
        page.classList.add('active');
        POSApp.state.currentPage = pageName;
    }
    
    const navItem = document.querySelector(`[data-page="${pageName}"]`);
    if (navItem) navItem.classList.add('active');
    
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'pos':
            loadPOS();
            break;
        case 'products':
            displayProducts();
            break;
        case 'customers':
            displayCustomers();
            break;
        case 'sales':
            displaySales();
            break;
        case 'reports':
            loadReports();
            break;
    }
    
    if (window.innerWidth <= 968) {
        const menu = document.querySelector('.navbar-menu');
        if (menu) menu.classList.remove('active');
    }
}

// ==================== لوحة التحكم ====================
function loadDashboard() {
    updateDashboardStats();
    loadDashboardCharts();
    loadRecentTransactions();
    loadTopProducts();
}

function updateDashboardStats() {
    // تصفية الفواتير لاستثناء المرتجعة
    const validSales = POSApp.data.sales.filter(s => !s.refunded);
    
    const totalSales = validSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalOrders = validSales.length;
    const totalProducts = POSApp.data.products.length;
    const totalCustomers = POSApp.data.customers.length;
    
    const totalSalesEl = document.getElementById('totalSalesValue');
    const totalOrdersEl = document.getElementById('totalOrdersValue');
    const totalProductsEl = document.getElementById('totalProductsValue');
    const totalCustomersEl = document.getElementById('totalCustomersValue');
    
    if (totalSalesEl) totalSalesEl.textContent = formatCurrency(totalSales);
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
}

function loadDashboardCharts() {
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        const salesData = getSalesChartData();
        
        if (POSApp.charts.sales) POSApp.charts.sales.destroy();
        
        POSApp.charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: salesData.labels,
                datasets: [{
                    label: 'المبيعات',
                    data: salesData.values,
                    borderColor: '#493628',
                    backgroundColor: 'rgba(73, 54, 40, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(73, 54, 40, 0.9)',
                        padding: 12,
                        callbacks: {
                            label: (context) => 'المبيعات: ' + formatCurrency(context.parsed.y)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }
    
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        const categoryData = getCategoryChartData();
        
        if (POSApp.charts.category) POSApp.charts.category.destroy();
        
        POSApp.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: ['#493628', '#AB886D', '#D6C0B3', '#E4E0E1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 15, usePointStyle: true }
                    }
                }
            }
        });
    }
}

function getSalesChartData() {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthlySales = new Array(12).fill(0);
    
    // استخدام الفواتير السليمة فقط
    const validSales = POSApp.data.sales.filter(s => !s.refunded);
    validSales.forEach(sale => {
        const month = new Date(sale.date).getMonth();
        monthlySales[month] += sale.total;
    });
    
    return { labels: months, values: monthlySales };
}

function getCategoryChartData() {
    const categories = getCategories(); // ← جلب الفئات الحقيقية (بما فيها المضافة)
    const totals = {};

    // تهيئة المجاميع لكل فئة موجودة
    Object.keys(categories).forEach(key => {
        totals[key] = 0;
    });

// جمع المبيعات حسب فئة كل منتج
    const validSales = POSApp.data.sales.filter(s => !s.refunded);
    validSales.forEach(sale => {
        sale.items.forEach(item => {
            const product = POSApp.data.products.find(p => p.name === item.name);
            if (product && totals.hasOwnProperty(product.category)) {
                totals[product.category] += item.total || 0;
            }
        });
    });

    // تحويل النتائج إلى مصفوفتين: تسميات وقيم
    const labels = Object.keys(totals).map(key => categories[key]?.name || key);
    const values = Object.keys(totals).map(key => totals[key]);

    return { labels, values };
}
function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    if (!container) return;
    
    const recentSales = POSApp.data.sales.slice(-5).reverse();
    
    if (recentSales.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">لا توجد معاملات</p>';
        return;
    }
    
    container.innerHTML = recentSales.map(sale => {
        const date = new Date(sale.date);
        const paymentIcons = {
            cash: 'money-bill-wave',
            card: 'credit-card',
            wallet: 'wallet'
        };
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                        <i class="fas fa-${paymentIcons[sale.paymentMethod]}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-id">${sale.invoiceNumber}</div>
                        <div class="transaction-date">${formatDate(date)}</div>
                    </div>
                </div>
                <div class="transaction-amount">${formatCurrency(sale.total)}</div>
            </div>
        `;
    }).join('');
}

function loadTopProducts() {
    const container = document.getElementById('topProducts');
    if (!container) return;
    
    const topProducts = [...POSApp.data.products]
        .sort((a, b) => (b.sold || 0) - (a.sold || 0))
        .slice(0, 5);
    
    if (topProducts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">لا توجد منتجات</p>';
        return;
    }
    
    container.innerHTML = topProducts.map((product, index) => {
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#AB886D', '#D6C0B3'];
        
        return `
            <div class="product-item">
                <div class="product-info">
                    <div class="product-rank" style="background: ${rankColors[index]}; color: white;">
                        ${index + 1}
                    </div>
                    <div class="product-details">
                        <div class="product-name">${product.name}</div>
                        <div class="product-sales">${product.sold || 0} مبيعة</div>
                    </div>
                </div>
                <div class="product-revenue">${formatCurrency(product.price * (product.sold || 0))}</div>
            </div>
        `;
    }).join('');
}

// ==================== نقطة البيع POS ====================
function loadPOS() {
    displayPOSProducts();
    updateCartDisplay();
}

function displayPOSProducts(category = 'all') {
    const grid = document.getElementById('posProductsGrid');
    if (!grid) return;
    
    // التحقق من صحة البيانات
    if (!POSApp.data || !POSApp.data.products || !Array.isArray(POSApp.data.products)) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">جاري تحميل المنتجات...</p>';
        console.error('❌ المنتجات غير محملة');
        return;
    }
    
    let products = POSApp.data.products;
    
    if (category !== 'all') {
        products = products.filter(p => p.category === category);
    }
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">لا توجد منتجات</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const isOutOfStock = product.stock === 0;
        const isLowStock = product.stock > 0 && product.stock <= POSApp.data.settings.lowStockThreshold;
        const icon = getCategoryIcon(product.category);
        
        return `
            <div class="pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}" 
                 data-product-id="${product.id}">
                <div class="product-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <div class="product-stock ${isLowStock ? 'low' : ''}">
                    ${product.stock} متوفر
                </div>
            </div>
        `;
    }).join('');
    
    // ربط الأحداث بالمنتجات بعد إنشائها
    grid.querySelectorAll('.pos-product-card:not(.out-of-stock)').forEach(card => {
        card.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            addToCart(productId);
        });
    });
}

function handlePOSSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!POSApp.data || !POSApp.data.products) {
        console.error('❌ البيانات غير محملة');
        return;
    }
    
    const products = POSApp.data.products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.barcode.includes(searchTerm)
    );
    
    const grid = document.getElementById('posProductsGrid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">لا توجد نتائج</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const isOutOfStock = product.stock === 0;
        const isLowStock = product.stock > 0 && product.stock <= POSApp.data.settings.lowStockThreshold;
        const icon = getCategoryIcon(product.category);
        
        return `
            <div class="pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}" 
                 data-product-id="${product.id}">
                <div class="product-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <div class="product-stock ${isLowStock ? 'low' : ''}">
                    ${product.stock} متوفر
                </div>
            </div>
        `;
    }).join('');
    
    // ربط الأحداث بالمنتجات بعد إنشائها
    grid.querySelectorAll('.pos-product-card:not(.out-of-stock)').forEach(card => {
        card.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            addToCart(productId);
        });
    });
}

function addToCart(productId) {
    // التأكد من أن البيانات محملة
    if (!POSApp.data || !POSApp.data.products || !Array.isArray(POSApp.data.products)) {
        console.error('❌ البيانات غير محملة بشكل صحيح');
        showToast('error', 'خطأ', 'فشل تحميل البيانات، يرجى إعادة تحميل الصفحة');
        return;
    }
    
    const product = POSApp.data.products.find(p => p.id === productId);
    
    if (!product) {
        console.error('❌ المنتج غير موجود:', productId);
        showToast('error', 'خطأ', 'المنتج غير موجود');
        return;
    }
    
    if (product.stock === 0) {
        showToast('error', 'تنبيه', 'المنتج غير متوفر في المخزون');
        return;
    }
    
    // تهيئة السلة إذا لم تكن موجودة
    if (!Array.isArray(POSApp.data.cart)) {
        POSApp.data.cart = [];
    }
    
    const existingItem = POSApp.data.cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            showToast('error', 'تنبيه', 'الكمية المتوفرة غير كافية');
            return;
        }
    } else {
        POSApp.data.cart.push({
            productId: productId,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    showToast('success', 'تم الإضافة', `تم إضافة ${product.name} إلى السلة`);
}

function updateCartDisplay() {
    const container = document.getElementById('cartItems');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!container) return;
    
    // التأكد من وجود السلة
    if (!Array.isArray(POSApp.data.cart)) {
        POSApp.data.cart = [];
    }
    
    if (POSApp.data.cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>السلة فارغة</p>
                <span>ابدأ بإضافة منتجات</span>
            </div>
        `;
        if (checkoutBtn) checkoutBtn.disabled = true;
        updateCartSummary();
        return;
    }
    
container.innerHTML = POSApp.data.cart.map(item => {
    const total = item.price * item.quantity;
    return `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)}</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" data-action="decrease" data-product-id="${item.productId}">
                    <i class="fas fa-minus"></i>
                </button>
                <input type="number" 
                       class="qty-input" 
                       data-product-id="${item.productId}" 
                       value="${item.quantity}" 
                       min="1"
                       max="${getMaxStock(item.productId)}"
                       style="width: 50px; text-align: center; font-weight: 700; border: none; background: transparent; color: var(--primary); font-size: 1rem;">
                <button class="qty-btn" data-action="increase" data-product-id="${item.productId}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-total">${formatCurrency(total)}</div>
            <button class="btn-remove-item" data-product-id="${item.productId}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}).join('');    
    // ربط الأحداث بأزرار السلة
    container.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            const action = this.getAttribute('data-action');
            const change = action === 'increase' ? 1 : -1;
            updateCartItemQty(productId, change);
        });
    });
    
    container.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            removeFromCart(productId);
        });
    });
    
    if (checkoutBtn) checkoutBtn.disabled = false;
    updateCartSummary();
    // ربط حدث التغيير على حقول الإدخال (للكمية المكتوبة يدويًّا)
container.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', function() {
        const productId = this.getAttribute('data-product-id');
        let newQty = parseInt(this.value) || 1;
        const maxStock = getMaxStock(productId);
        
        // تقييد القيمة بين 1 والحد الأقصى للمخزون
        if (newQty < 1) newQty = 1;
        if (newQty > maxStock) {
            newQty = maxStock;
            this.value = newQty;
            showToast('warning', 'تنبيه', 'الكمية المطلوبة تفوق المخزون المتوفر');
        }

        // تحديث السلة
        const item = POSApp.data.cart.find(i => i.productId === productId);
        if (item && item.quantity !== newQty) {
            item.quantity = newQty;
            updateCartDisplay(); // إعادة عرض السلة لتحديث المجموع
        }
    });

    // تحسين تجربة المستخدم: السماح بالضغط على Enter
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            this.blur(); // تشغيل حدث change
        }
    });
});
}


function getMaxStock(productId) {
    const product = POSApp.data.products.find(p => p.id === productId);
    return product ? product.stock : 1000000; // حد آمن إذا لم يُوجد المنتج
}


function updateCartItemQty(productId, change) {
    if (!Array.isArray(POSApp.data.cart)) {
        POSApp.data.cart = [];
        return;
    }
    
    const item = POSApp.data.cart.find(i => i.productId === productId);
    const product = POSApp.data.products.find(p => p.id === productId);
    
    if (!item || !product) return;
    
    const newQty = item.quantity + change;
    
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQty > product.stock) {
        showToast('error', 'تنبيه', 'الكمية المتوفرة غير كافية');
        return;
    }
    
    item.quantity = newQty;
    updateCartDisplay();
}

function removeFromCart(productId) {
    if (!Array.isArray(POSApp.data.cart)) {
        POSApp.data.cart = [];
        return;
    }
    
    POSApp.data.cart = POSApp.data.cart.filter(item => item.productId !== productId);
    updateCartDisplay();
}

function clearCart() {
    if (!Array.isArray(POSApp.data.cart) || POSApp.data.cart.length === 0) return;
    
    if (confirm('هل أنت متأكد من إفراغ السلة؟')) {
        POSApp.data.cart = [];
        const discountInput = document.getElementById('discountInput');
        if (discountInput) discountInput.value = 0;
        POSApp.state.discount = 0;
        updateCartDisplay();
        showToast('success', 'تم الإفراغ', 'تم إفراغ السلة بنجاح');
    }
}

function updateCartSummary() {
    if (!Array.isArray(POSApp.data.cart)) {
        POSApp.data.cart = [];
    }
    
    const subtotal = POSApp.data.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountInput = document.getElementById('discountInput');
    const discount = parseFloat(discountInput?.value || 0);
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const tax = afterDiscount * (POSApp.data.settings.taxRate / 100);
    const total = afterDiscount + tax;
    
    POSApp.state.discount = discount;
    
    const subtotalEl = document.getElementById('cartSubtotal');
    const taxEl = document.getElementById('cartTax');
    const totalEl = document.getElementById('cartTotal');
    
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = formatCurrency(tax);
    if (totalEl) totalEl.textContent = formatCurrency(total);
}

function handleCheckout() {
    if (!Array.isArray(POSApp.data.cart) || POSApp.data.cart.length === 0) {
        showToast('error', 'خطأ', 'السلة فارغة');
        return;
    }
    const subtotal = POSApp.data.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = POSApp.state.discount;
    const discountAmount = subtotal * (discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const tax = afterDiscount * (POSApp.data.settings.taxRate / 100);
    const total = afterDiscount + tax;
    const customerSelect = document.getElementById('customerSelect');
    const sale = {
        id: generateId(),
        invoiceNumber: `INV-${String(POSApp.data.sales.length + 1001).padStart(6, '0')}`,
        date: new Date().toISOString(),
        customerId: customerSelect?.value || null,
        items: POSApp.data.cart.map(item => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    total: item.price * item.quantity
})),
        subtotal: subtotal,
        discount: discount,
        discountAmount: discountAmount,
        tax: tax,
        total: total,
        paymentMethod: POSApp.state.currentPaymentMethod
    };
    // تحديث المخزون
    POSApp.data.cart.forEach(item => {
        const product = POSApp.data.products.find(p => p.id === item.productId);
        if (product) {
            product.stock -= item.quantity;
            product.sold = (product.sold || 0) + item.quantity;
        }
    });
    // تحديث بيانات العميل
    if (sale.customerId) {
        const customer = POSApp.data.customers.find(c => c.id === sale.customerId);
        if (customer) {
            customer.totalPurchases += total;
            customer.ordersCount++;
        }
    }
    POSApp.data.sales.push(sale);
    
    // ✅ تفريغ السلة أولاً
    POSApp.data.cart = [];
    
    // ✅ حفظ البيانات فورًا بعد تفريغ السلة
    saveData();
    
    // عرض الفاتورة
    showInvoice(sale);
    
    // إعادة تعيين واجهة المستخدم
    const discountInput = document.getElementById('discountInput');
    if (discountInput) discountInput.value = 0;
    POSApp.state.discount = 0;
    updateCartDisplay();
    displayPOSProducts();
    showToast('success', 'تم الدفع', 'تم إتمام عملية البيع بنجاح');
}
function showInvoice(sale) {
    const customer = POSApp.data.customers.find(c => c.id === sale.customerId);
    const date = new Date(sale.date);
    
    const paymentMethodNames = {
        cash: 'نقدي',
        card: 'بطاقة',
        wallet: 'محفظة'
    };
    
    const invoiceHTML = `
        <div class="invoice-print-container" style="
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            font-family: 'Cairo', sans-serif;
            background: white;
            color: #000;
        ">
            <!-- رأس الفاتورة -->
            <div style="
                text-align: center; 
                padding: 20px 0; 
                border-bottom: 3px solid #493628;
                margin-bottom: 20px;
            ">
                <h1 style="
                    color: #493628; 
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    font-weight: 800;
                ">فاتورة ضريبية</h1>
                <h2 style="
                    color: #AB886D; 
                    font-size: 20px;
                    margin: 0;
                    font-weight: 600;
                ">${POSApp.data.settings.storeName}</h2>
            </div>
            
            <!-- معلومات الفاتورة -->
            <div style="
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
            ">
                <div style="flex: 1;">
                    <p style="margin: 8px 0; font-size: 14px;">
                        <strong style="color: #493628;">رقم الفاتورة:</strong> 
                        <span style="color: #000;">${sale.invoiceNumber}</span>
                    </p>
                    <p style="margin: 8px 0; font-size: 14px;">
                        <strong style="color: #493628;">التاريخ:</strong> 
                        <span style="color: #000;">${formatDateTime(date)}</span>
                    </p>
                </div>
                <div style="flex: 1; text-align: left;">
                    <p style="margin: 8px 0; font-size: 14px;">
                        <strong style="color: #493628;">العميل:</strong> 
                        <span style="color: #000;">${customer ? customer.name : 'عميل عادي'}</span>
                    </p>
                    <p style="margin: 8px 0; font-size: 14px;">
                        <strong style="color: #493628;">طريقة الدفع:</strong> 
                        <span style="color: #000;">${paymentMethodNames[sale.paymentMethod]}</span>
                    </p>
                </div>
            </div>
            
            <!-- جدول المنتجات -->
            <table style="
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
                font-size: 14px;
            ">
                <thead>
                    <tr style="background: #493628; color: white;">
                        <th style="padding: 12px; text-align: right; border: 1px solid #493628;">المنتج</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #493628; width: 100px;">السعر</th>
                        <th style="padding: 12px; text-align: center; border: 1px solid #493628; width: 80px;">الكمية</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #493628; width: 120px;">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${sale.items.map((item, index) => `
                        <tr style="border-bottom: 1px solid #ddd; ${index % 2 === 0 ? 'background: #f9f9f9;' : ''}">
                            <td style="padding: 10px; border: 1px solid #ddd; color: #000;">${item.name}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd; color: #000;">${formatCurrency(item.price)}</td>
                            <td style="padding: 10px; text-align: center; border: 1px solid #ddd; color: #000; font-weight: bold;">${item.quantity}</td>
                            <td style="padding: 10px; text-align: left; border: 1px solid #ddd; color: #000; font-weight: bold;">${formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <!-- الملخص المالي -->
            <div style="
                padding: 20px; 
                background: #f5f3f4; 
                border-radius: 8px; 
                margin-top: 20px;
                border: 2px solid #493628;
            ">
                <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 15px;">
                    <span style="color: #000;">المجموع الفرعي:</span>
                    <span style="font-weight: bold; color: #000;">${formatCurrency(sale.subtotal)}</span>
                </div>
                ${sale.discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin: 10px 0; color: #10b981; font-size: 15px;">
                        <span>الخصم (${sale.discount}%):</span>
                        <span style="font-weight: bold;">- ${formatCurrency(sale.discountAmount)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 15px;">
                    <span style="color: #000;">الضريبة (${POSApp.data.settings.taxRate}%):</span>
                    <span style="font-weight: bold; color: #000;">${formatCurrency(sale.tax)}</span>
                </div>
                <div style="
                    display: flex; 
                    justify-content: space-between; 
                    margin-top: 15px; 
                    padding-top: 15px; 
                    border-top: 3px solid #493628; 
                    font-size: 20px; 
                    font-weight: bold;
                    color: #493628;
                ">
                    <span>الإجمالي النهائي:</span>
                    <span>${formatCurrency(sale.total)}</span>
                </div>
            </div>
            
            <!-- تذييل الفاتورة -->
            <div style="
                text-align: center; 
                padding: 30px 0 10px 0; 
                margin-top: 30px;
                border-top: 2px solid #ddd;
                color: #666;
            ">
                <p style="margin: 8px 0; font-size: 16px; font-weight: 600; color: #493628;">شكراً لتعاملكم معنا</p>
                <p style="margin: 8px 0; font-size: 13px;">تم الإصدار بواسطة نظام POS الاحترافي</p>
            </div>
        </div>
    `;
    
    const invoiceContent = document.getElementById('invoiceContent');
    if (invoiceContent) {
        invoiceContent.innerHTML = invoiceHTML;
        openModal('invoiceModal');
    }
}


// ==================== إدارة المنتجات ====================
function displayProducts() {
    filterProducts();
}

function filterProducts() {
    if (!POSApp.data || !POSApp.data.products) {
        console.error('❌ البيانات غير محملة');
        return;
    }
    const searchInput = document.getElementById('productsSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockFilter = document.getElementById('stockFilter');
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const categoryValue = categoryFilter?.value || 'all';
    const stockValue = stockFilter?.value || 'all';

    let products = POSApp.data.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) || 
                            p.barcode.includes(searchTerm);
        const matchesCategory = categoryValue === 'all' || p.category === categoryValue;
        let matchesStock = true;
        if (stockValue === 'instock') {
            matchesStock = p.stock > POSApp.data.settings.lowStockThreshold;
        } else if (stockValue === 'lowstock') {
            matchesStock = p.stock > 0 && p.stock <= POSApp.data.settings.lowStockThreshold;
        } else if (stockValue === 'outofstock') {
            matchesStock = p.stock === 0;
        }
        return matchesSearch && matchesCategory && matchesStock;
    });

    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">لا توجد منتجات</p>';
        return;
    }

    // ✅ تحديد طريقة العرض بناءً على الحالة الحالية
    const isListView = POSApp.state.productsView === 'list';

    if (isListView) {
        // العرض كقائمة (جدول عمودي)
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';
        grid.style.gap = '1rem';
        grid.innerHTML = products.map(product => {
            const icon = getCategoryIcon(product.category);
            const categoryName = getCategoryName(product.category);
            let stockBadge = 'in-stock';
            let stockText = 'متوفر';
            if (product.stock === 0) {
                stockBadge = 'out-of-stock';
                stockText = 'غير متوفر';
            } else if (product.stock <= POSApp.data.settings.lowStockThreshold) {
                stockBadge = 'low-stock';
                stockText = 'مخزون منخفض';
            }
            return `
                <div class="product-card" style="display: flex; flex-direction: row; align-items: flex-start; gap: 1.5rem; padding: 1.5rem;">
                    <div style="flex-shrink: 0; width: 100px; height: 100px; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%); border-radius: var(--border-radius-lg); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 3rem;">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0;">${product.name}</h3>
                            <span class="product-badge ${stockBadge}" style="margin-right: auto; margin-left: 1rem;">${stockText}</span>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">${product.description || 'لا يوجد وصف'}</p>
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                            <div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">السعر</div>
                                <div style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">${formatCurrency(product.price)}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">المخزون</div>
                                <div style="font-weight: 700; color: var(--primary); font-size: 1.1rem;">${product.stock}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">الفئة</div>
                                <div style="font-weight: 600; color: var(--secondary);">${categoryName}</div>
                            </div>
                        </div>
                    </div>
                    <div class="product-actions" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: auto;">
                        <button class="btn btn-secondary btn-sm" data-action="edit" data-product-id="${product.id}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger btn-sm" data-action="delete" data-product-id="${product.id}">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // العرض كشبكة (الوضع الافتراضي)
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        grid.style.gap = '1.5rem';
        grid.innerHTML = products.map(product => {
            const icon = getCategoryIcon(product.category);
            const categoryName = getCategoryName(product.category);
            let stockBadge = 'in-stock';
            let stockText = 'متوفر';
            if (product.stock === 0) {
                stockBadge = 'out-of-stock';
                stockText = 'غير متوفر';
            } else if (product.stock <= POSApp.data.settings.lowStockThreshold) {
                stockBadge = 'low-stock';
                stockText = 'مخزون منخفض';
            }
            return `
                <div class="product-card">
                    <span class="product-badge ${stockBadge}">${stockText}</span>
                    <div class="product-image">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="product-category">${categoryName}</div>
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description || 'لا يوجد وصف'}</p>
                    <div class="product-details">
                        <div class="product-detail-item">
                            <span class="detail-label">السعر</span>
                            <span class="detail-value">${formatCurrency(product.price)}</span>
                        </div>
                        <div class="product-detail-item">
                            <span class="detail-label">المخزون</span>
                            <span class="detail-value">${product.stock}</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-secondary btn-sm" data-action="edit" data-product-id="${product.id}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger btn-sm" data-action="delete" data-product-id="${product.id}">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ربط الأحداث للأزرار في كلا الطريقتين
    grid.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            editProduct(productId);
        });
    });
    grid.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            deleteProduct(productId);
        });
    });
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (productId) {
        const product = POSApp.data.products.find(p => p.id === productId);
        if (product) {
            if (title) title.innerHTML = '<i class="fas fa-edit"></i> تعديل منتج';
            
            const idInput = document.getElementById('productId');
            const nameInput = document.getElementById('productName');
            const categoryInput = document.getElementById('productCategory');
            const priceInput = document.getElementById('productPrice');
            const stockInput = document.getElementById('productStock');
            const barcodeInput = document.getElementById('productBarcode');
            const descInput = document.getElementById('productDescription');
            const expiryInput = document.getElementById('productExpiryDate');
            
            if (idInput) idInput.value = product.id;
            if (nameInput) nameInput.value = product.name;
            if (categoryInput) categoryInput.value = product.category;
            if (priceInput) priceInput.value = product.price;
            if (stockInput) stockInput.value = product.stock;
            if (barcodeInput) barcodeInput.value = product.barcode;
            if (descInput) descInput.value = product.description || '';
            if (expiryInput) expiryInput.value = product.expiryDate || '';

        }
    } else {
        if (title) title.innerHTML = '<i class="fas fa-plus"></i> إضافة منتج';
        if (form) form.reset();
        const idInput = document.getElementById('productId');
        if (idInput) idInput.value = '';
    }
    
    openModal('productModal');
}

function handleProductSubmit(e) {
    e.preventDefault();
    
    const idInput = document.getElementById('productId');
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const barcodeInput = document.getElementById('productBarcode');
    const descInput = document.getElementById('productDescription');
    const expiryInput = document.getElementById('productExpiryDate');
    
    // التحقق من إدخال تاريخ انتهاء الصلاحية
    if (!expiryInput?.value) {
        showToast('error', 'خطأ', 'يرجى إدخال تاريخ انتهاء الصلاحية للمنتج');
        return;
    }
    
    const productId = idInput?.value;
    const productData = {
        name: nameInput?.value,
        category: categoryInput?.value,
        price: parseFloat(priceInput?.value || 0),
        stock: parseInt(stockInput?.value || 0),
        barcode: barcodeInput?.value || generateBarcode(),
        description: descInput?.value,
        expiryDate: expiryInput?.value,
        sold: 0
    };

    
    if (productId) {
        const product = POSApp.data.products.find(p => p.id === productId);
        if (product) {
            Object.assign(product, productData);
            showToast('success', 'تم التعديل', 'تم تعديل المنتج بنجاح');
        }
    } else {
        POSApp.data.products.push({
            id: generateId(),
            ...productData
        });
        showToast('success', 'تم الإضافة', 'تم إضافة المنتج بنجاح');
    }
    
    saveData();
    closeModal('productModal');
    displayProducts();
    displayPOSProducts();
}

function editProduct(productId) {
    openProductModal(productId);
}

function deleteProduct(productId) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        POSApp.data.products = POSApp.data.products.filter(p => p.id !== productId);
        saveData();
        displayProducts();
        displayPOSProducts();
        showToast('success', 'تم الحذف', 'تم حذف المنتج بنجاح');
    }
}

// ==================== إدارة العملاء ====================
function displayCustomers() {
    filterCustomers();
}

function filterCustomers() {
    if (!POSApp.data || !POSApp.data.customers) {
        console.error('❌ البيانات غير محملة');
        return;
    }
    
    const searchInput = document.getElementById('customersSearch');
    const searchTerm = searchInput?.value.toLowerCase() || '';
    
    let customers = POSApp.data.customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm))
    );
    
    const grid = document.getElementById('customersGrid');
    if (!grid) return;
    
    if (customers.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">لا يوجد عملاء</p>';
        return;
    }
    
    grid.innerHTML = customers.map(customer => {
        const initials = customer.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const joinDate = new Date(customer.joinDate);
        
        return `
            <div class="customer-card">
                <div class="customer-header">
                    <div class="customer-avatar">${initials}</div>
                    <div class="customer-info">
                        <h3 class="customer-name">${customer.name}</h3>
                        <p class="customer-meta">عضو منذ ${formatDate(joinDate)}</p>
                    </div>
                </div>
                
                <div class="customer-stats">
                    <div class="customer-stat">
                        <div class="stat-value-sm">${customer.ordersCount}</div>
                        <div class="stat-label-sm">طلب</div>
                    </div>
                    <div class="customer-stat">
                        <div class="stat-value-sm">${formatCurrency(customer.totalPurchases)}</div>
                        <div class="stat-label-sm">إجمالي المشتريات</div>
                    </div>
                </div>
                
                <div class="customer-contact">
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <span>${customer.phone}</span>
                    </div>
                    ${customer.email ? `
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <span>${customer.email}</span>
                        </div>
                    ` : ''}
                    ${customer.address ? `
                        <div class="contact-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${customer.address}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="customer-actions">
                    <button class="btn btn-secondary btn-sm" data-action="edit-customer" data-customer-id="${customer.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="delete-customer" data-customer-id="${customer.id}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // ربط الأحداث
    grid.querySelectorAll('[data-action="edit-customer"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const customerId = this.getAttribute('data-customer-id');
            editCustomer(customerId);
        });
    });
    
    grid.querySelectorAll('[data-action="delete-customer"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const customerId = this.getAttribute('data-customer-id');
            deleteCustomer(customerId);
        });
    });
}

function loadCustomerSelect() {
    const select = document.getElementById('customerSelect');
    if (!select) return;
    
    if (!POSApp.data || !POSApp.data.customers) {
        select.innerHTML = '<option value="">عميل عادي</option>';
        return;
    }
    
    select.innerHTML = '<option value="">عميل عادي</option>' +
        POSApp.data.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function openCustomerModal(customerId = null) {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');
    
    if (customerId) {
        const customer = POSApp.data.customers.find(c => c.id === customerId);
        if (customer) {
            if (title) title.innerHTML = '<i class="fas fa-user-edit"></i> تعديل عميل';
            
            const idInput = document.getElementById('customerId');
            const nameInput = document.getElementById('customerName');
            const phoneInput = document.getElementById('customerPhone');
            const emailInput = document.getElementById('customerEmail');
            const addressInput = document.getElementById('customerAddress');
            
            if (idInput) idInput.value = customer.id;
            if (nameInput) nameInput.value = customer.name;
            if (phoneInput) phoneInput.value = customer.phone;
            if (emailInput) emailInput.value = customer.email || '';
            if (addressInput) addressInput.value = customer.address || '';
        }
    } else {
        if (title) title.innerHTML = '<i class="fas fa-user-plus"></i> إضافة عميل';
        if (form) form.reset();
        const idInput = document.getElementById('customerId');
        if (idInput) idInput.value = '';
    }
    
    openModal('customerModal');
}

function handleCustomerSubmit(e) {
    e.preventDefault();
    
    const idInput = document.getElementById('customerId');
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const emailInput = document.getElementById('customerEmail');
    const addressInput = document.getElementById('customerAddress');
    
    const customerId = idInput?.value;
    const customerData = {
        name: nameInput?.value,
        phone: phoneInput?.value,
        email: emailInput?.value,
        address: addressInput?.value
    };
    
    if (customerId) {
        const customer = POSApp.data.customers.find(c => c.id === customerId);
        if (customer) {
            Object.assign(customer, customerData);
            showToast('success', 'تم التعديل', 'تم تعديل بيانات العميل بنجاح');
        }
    } else {
        POSApp.data.customers.push({
            id: generateId(),
            ...customerData,
            totalPurchases: 0,
            ordersCount: 0,
            joinDate: new Date().toISOString()
        });
        showToast('success', 'تم الإضافة', 'تم إضافة العميل بنجاح');
    }
    
    saveData();
    closeModal('customerModal');
    displayCustomers();
    loadCustomerSelect();
}

function editCustomer(customerId) {
    openCustomerModal(customerId);
}

function deleteCustomer(customerId) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
        POSApp.data.customers = POSApp.data.customers.filter(c => c.id !== customerId);
        saveData();
        displayCustomers();
        loadCustomerSelect();
        showToast('success', 'تم الحذف', 'تم حذف العميل بنجاح');
    }
}

// ==================== سجل المبيعات ====================
function displaySales() {
    filterSales();
}

function filterSales() {
    if (!POSApp.data || !POSApp.data.sales) {
        console.error('❌ البيانات غير محملة');
        return;
    }
    
    const searchInput = document.getElementById('salesSearch');
    const paymentFilter = document.getElementById('paymentMethodFilter');
    const dateFilterInput = document.getElementById('dateFilter');
    
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const paymentValue = paymentFilter?.value || 'all';
    const dateValue = dateFilterInput?.value || '';
    
    let sales = POSApp.data.sales.filter(s => {
        const matchesSearch = s.invoiceNumber.toLowerCase().includes(searchTerm);
        const matchesPayment = paymentValue === 'all' || s.paymentMethod === paymentValue;
        
        let matchesDate = true;
        if (dateValue) {
            const saleDate = new Date(s.date).toISOString().split('T')[0];
            matchesDate = saleDate === dateValue;
        }
        
        return matchesSearch && matchesPayment && matchesDate;
    });
    
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    if (sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    لا توجد مبيعات
                </td>
            </tr>
        `;
        return;
    }
    
    const reversedSales = [...sales].reverse();
    
    tbody.innerHTML = reversedSales.map(sale => {
        const customer = POSApp.data.customers.find(c => c.id === sale.customerId);
        const date = new Date(sale.date);
        
        const paymentMethodNames = {
            cash: 'نقدي',
            card: 'بطاقة',
            wallet: 'محفظة'
        };
        
        const paymentIcons = {
            cash: 'money-bill-wave',
            card: 'credit-card',
            wallet: 'wallet'
        };
        
        return `
            <tr>
                <td><span class="invoice-number">${sale.invoiceNumber}</span></td>
                <td>${formatDateTime(date)}</td>
                <td>${customer ? customer.name : 'عميل عادي'}</td>
                <td>${sale.items.length} منتج</td>
                <td>
                    <span class="payment-method-badge ${sale.paymentMethod}">
                        <i class="fas fa-${paymentIcons[sale.paymentMethod]}"></i>
                        ${paymentMethodNames[sale.paymentMethod]}
                    </span>
                </td>
                <td><strong>${formatCurrency(sale.total)}</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" data-action="view-sale" data-sale-id="${sale.id}" title="عرض">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!sale.refunded ? `
                        <button class="btn btn-warning btn-sm" data-action="refund-sale" data-sale-id="${sale.id}" title="إرجاع الفاتورة">
                            <i class="fas fa-undo"></i>
                        </button>
                        ` : `
                        <span class="badge badge-danger" style="padding:0.4rem 0.7rem;background:#fee2e2;color:#ef4444;border-radius:6px;font-size:0.8rem;font-weight:700;">
                            <i class="fas fa-undo"></i> مُرتجعة
                        </span>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // ربط الأحداث
    tbody.querySelectorAll('[data-action="view-sale"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const saleId = this.getAttribute('data-sale-id');
            viewSaleDetails(saleId);
        });
    });
    
    // ✅ ربط زر الإرجاع
    tbody.querySelectorAll('[data-action="refund-sale"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const saleId = this.getAttribute('data-sale-id');
            refundSale(saleId);
        });
    });
}


function viewSaleDetails(saleId) {
    const sale = POSApp.data.sales.find(s => s.id === saleId);
    if (sale) {
        showInvoice(sale);
    }
}

// ==================== إرجاع الفاتورة ====================
function refundSale(saleId) {
    const sale = POSApp.data.sales.find(s => s.id === saleId);
    if (!sale) {
        showToast('error', 'خطأ', 'الفاتورة غير موجودة');
        return;
    }
    
    if (sale.refunded) {
        showToast('warning', 'تنبيه', 'هذه الفاتورة مرتجعة بالفعل');
        return;
    }
    
    const itemsList = sale.items.map(it => 
        `• ${it.name} (الكمية: ${it.quantity})`
    ).join('\n');
    
    const confirmMsg = `هل أنت متأكد من إرجاع الفاتورة رقم ${sale.invoiceNumber}؟\n\n` +
                      `سيتم إرجاع المنتجات التالية إلى المخزون:\n${itemsList}\n\n` +
                      `المبلغ الإجمالي: ${formatCurrency(sale.total)}`;
    
    if (!confirm(confirmMsg)) return;
    
    // ✅ إرجاع المنتجات للمخزون
    sale.items.forEach(item => {
        // البحث بالاسم (لأن الفاتورة لا تحتوي بالضرورة على productId)
        const product = POSApp.data.products.find(p => 
            p.id === item.productId || p.name === item.name
        );
        if (product) {
            product.stock = (product.stock || 0) + item.quantity;
            product.sold = Math.max(0, (product.sold || 0) - item.quantity);
        }
    });
    
    // ✅ تحديث بيانات العميل
    if (sale.customerId) {
        const customer = POSApp.data.customers.find(c => c.id === sale.customerId);
        if (customer) {
            customer.totalPurchases = Math.max(0, (customer.totalPurchases || 0) - sale.total);
            customer.ordersCount = Math.max(0, (customer.ordersCount || 0) - 1);
        }
    }
    
    // ✅ تعليم الفاتورة كمرتجعة
    sale.refunded = true;
    sale.refundDate = new Date().toISOString();
    
    saveData();
    displaySales();
    if (typeof displayProducts === 'function') displayProducts();
    if (typeof displayPOSProducts === 'function') displayPOSProducts();
    if (typeof updateDashboard === 'function') updateDashboard();
    
    showToast('success', 'تم الإرجاع', `تم إرجاع الفاتورة ${sale.invoiceNumber} وإعادة المنتجات للمخزون`);
}


function exportSales() {
    if (!POSApp.data || !POSApp.data.sales || POSApp.data.sales.length === 0) {
        showToast('error', 'خطأ', 'لا توجد مبيعات لتصديرها');
        return;
    }
    
    const csv = convertSalesToCSV();
    downloadCSV(csv, `sales_${Date.now()}.csv`);
    showToast('success', 'تم التصدير', 'تم تصدير المبيعات بنجاح');
}

function convertSalesToCSV() {
    const headers = ['رقم الفاتورة', 'التاريخ', 'العميل', 'المنتجات', 'طريقة الدفع', 'المبلغ'];
    const rows = POSApp.data.sales.map(sale => {
        const customer = POSApp.data.customers.find(c => c.id === sale.customerId);
        const date = new Date(sale.date);
        const paymentMethodNames = {
            cash: 'نقدي',
            card: 'بطاقة',
            wallet: 'محفظة'
        };
        
        return [
            sale.invoiceNumber,
            formatDateTime(date),
            customer ? customer.name : 'عميل عادي',
            sale.items.length,
            paymentMethodNames[sale.paymentMethod],
            sale.total
        ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// ==================== التقارير ====================
function loadReports() {
    updateReports();
}

function updateReports() {
    createRevenueChart();
    createInventoryChart();
    createCategoryPerformanceChart();
    createPaymentMethodsChart();
}

function createRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const revenueData = getSalesChartData();
    
    if (POSApp.charts.revenue) POSApp.charts.revenue.destroy();
    
    POSApp.charts.revenue = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: revenueData.labels,
            datasets: [{
                label: 'الإيرادات',
                data: revenueData.values,
                backgroundColor: 'rgba(73, 54, 40, 0.8)',
                borderColor: '#493628',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function createInventoryChart() {
    const ctx = document.getElementById('inventoryChart');
    if (!ctx) return;
    
    const stockData = getStockData();
    
    if (POSApp.charts.inventory) POSApp.charts.inventory.destroy();
    
    POSApp.charts.inventory = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: stockData.labels,
            datasets: [{
                data: stockData.values,
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            }
        }
    });
}

function getStockData() {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    
    POSApp.data.products.forEach(p => {
        if (p.stock === 0) {
            outOfStock++;
        } else if (p.stock <= POSApp.data.settings.lowStockThreshold) {
            lowStock++;
        } else {
            inStock++;
        }
    });
    
    return {
        labels: ['متوفر', 'مخزون منخفض', 'غير متوفر'],
        values: [inStock, lowStock, outOfStock]
    };
}

function createCategoryPerformanceChart() {
    const ctx = document.getElementById('categoryPerformanceChart');
    if (!ctx) return;
    
    const categoryData = getCategoryChartData();
    
    if (POSApp.charts.categoryPerformance) POSApp.charts.categoryPerformance.destroy();
    
    POSApp.charts.categoryPerformance = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: categoryData.labels,
            datasets: [{
                data: categoryData.values,
                backgroundColor: [
                    'rgba(73, 54, 40, 0.7)',
                    'rgba(171, 136, 109, 0.7)',
                    'rgba(214, 192, 179, 0.7)',
                    'rgba(228, 224, 225, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            }
        }
    });
}

function createPaymentMethodsChart() {
    const ctx = document.getElementById('paymentMethodsChart');
    if (!ctx) return;
    
    const paymentData = getPaymentMethodsData();
    
    if (POSApp.charts.paymentMethods) POSApp.charts.paymentMethods.destroy();
    
    POSApp.charts.paymentMethods = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: paymentData.labels,
            datasets: [{
                data: paymentData.values,
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            }
        }
    });
}

function getPaymentMethodsData() {
    const methods = {
        cash: { label: 'نقدي', count: 0 },
        card: { label: 'بطاقة', count: 0 },
        wallet: { label: 'محفظة', count: 0 }
    };
    
    // استخدام الفواتير السليمة فقط
    const validSales = POSApp.data.sales.filter(s => !s.refunded);
    validSales.forEach(sale => {
        if (methods[sale.paymentMethod]) {
            methods[sale.paymentMethod].count++;
        }
    });
    
    return {
        labels: Object.values(methods).map(m => m.label),
        values: Object.values(methods).map(m => m.count)
    };
}

function printReport() {
    window.print();
}

// ==================== الإعدادات ====================
function saveSettings() {
    const storeNameInput = document.getElementById('storeName');
    const currencyInput = document.getElementById('currency');
    const taxRateInput = document.getElementById('taxRate');
    
    if (storeNameInput) POSApp.data.settings.storeName = storeNameInput.value;
    if (currencyInput) POSApp.data.settings.currency = currencyInput.value;
    if (taxRateInput) POSApp.data.settings.taxRate = parseFloat(taxRateInput.value);
    
    saveData();
    closeModal('settingsModal');
    showToast('success', 'تم الحفظ', 'تم حفظ الإعدادات بنجاح');
}

function exportAllData() {
    const data = JSON.stringify(POSApp.data, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pos_backup_${Date.now()}.json`;
    link.click();
    showToast('success', 'تم التصدير', 'تم تصدير البيانات بنجاح');
}

function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                POSApp.data = data;
                saveData();
                location.reload();
            } catch (error) {
                showToast('error', 'خطأ', 'فشل استيراد البيانات');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function clearAllData() {
    if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
        if (confirm('تأكيد نهائي: سيتم حذف جميع المنتجات والعملاء والمبيعات!')) {
            localStorage.removeItem('posData');
            location.reload();
        }
    }
}


// ==================== القائمة على الموبايل ====================
function toggleMobileMenu() {
    const menu = document.querySelector('.navbar-menu');
    if (menu) menu.classList.toggle('active');
}

// ==================== النوافذ المنبثقة ====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ==================== الإشعارات Toast ====================
function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('⚠️ عنصر toastContainer غير موجود');
        console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        return;
    }
    
    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// ==================== دوال مساعدة ====================
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function generateBarcode() {
    return Math.random().toString().substring(2, 15);
}

function formatCurrency(amount) {
    return amount.toFixed(2) + ' ' + POSApp.data.settings.currency;
}

function formatDate(date) {
    return date.toLocaleDateString('ar-JO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    return date.toLocaleDateString('ar-JO', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCategoryName(category) {
    const names = {
        food: 'أطعمة',
        drinks: 'مشروبات',
        electronics: 'إلكترونيات',
        stationery: 'قرطاسية'
    };
    return names[category] || category;
}

function getCategoryIcon(category) {
    const icons = {
        food: 'utensils',
        drinks: 'coffee',
        electronics: 'laptop',
        stationery: 'pen'
    };
    return icons[category] || 'box';
}

// ==================== تصدير النظام ====================
window.POSApp = POSApp;

console.log('✅ تم تحميل app.js بنجاح - الإصدار 2.2');
// ==================== مسح الباركود - Barcode Scanner ====================


// ==================== نظام الإشعارات ====================

// تحميل الإشعارات المقروءة من LocalStorage
function getReadNotifications() {
    const read = localStorage.getItem('readNotifications');
    return read ? JSON.parse(read) : [];
}

// حفظ الإشعارات المقروءة
function saveReadNotifications(readIds) {
    localStorage.setItem('readNotifications', JSON.stringify(readIds));
}

// إضافة إشعار للمقروءة
function markNotificationAsRead(notificationId) {
    const readIds = getReadNotifications();
    if (!readIds.includes(notificationId)) {
        readIds.push(notificationId);
        saveReadNotifications(readIds);
    }
}

// الحصول على الإشعارات
function getNotifications() {
    const notifications = [];
    const now = new Date();
    const readIds = getReadNotifications();
    
    // التحقق من المنتجات
    POSApp.data.products.forEach(product => {
        // منتجات نفذت
        if (product.stock === 0) {
            const notifId = `out-${product.id}`;
            notifications.push({
                id: notifId,
                type: 'critical',
                icon: 'exclamation-circle',
                title: 'منتج نفذ من المخزون',
                message: `المنتج "${product.name}" غير متوفر في المخزون`,
                time: now,
                unread: !readIds.includes(notifId),
                product: product
            });
        }
        // منتجات أوشكت على النفاذ
        else if (product.stock > 0 && product.stock <= POSApp.data.settings.lowStockThreshold) {
            const notifId = `low-${product.id}`;
            notifications.push({
                id: notifId,
                type: 'warning',
                icon: 'exclamation-triangle',
                title: 'مخزون منخفض',
                message: `المنتج "${product.name}" متبقي منه ${product.stock} فقط`,
                time: now,
                unread: !readIds.includes(notifId),
                product: product
            });
        }
        
        // ✅ التحقق من تاريخ انتهاء الصلاحية
        if (product.expiryDate) {
            const expiry = new Date(product.expiryDate);
            const diffMs = expiry - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                // المنتج منتهي الصلاحية
                const notifId = `expired-${product.id}`;
                notifications.push({
                    id: notifId,
                    type: 'critical',
                    icon: 'calendar-times',
                    title: 'منتج منتهي الصلاحية',
                    message: `المنتج "${product.name}" انتهت صلاحيته منذ ${Math.abs(diffDays)} يوم`,
                    time: now,
                    unread: !readIds.includes(notifId),
                    product: product
                });
            } else if (diffDays <= 30) {
                // المنتج سينتهي خلال شهر
                const notifId = `expiring-${product.id}`;
                notifications.push({
                    id: notifId,
                    type: 'warning',
                    icon: 'calendar-day',
                    title: 'اقتراب انتهاء الصلاحية',
                    message: `المنتج "${product.name}" ستنتهي صلاحيته خلال ${diffDays} يوم (${product.expiryDate})`,
                    time: now,
                    unread: !readIds.includes(notifId),
                    product: product
                });
            }
        }
    });

    
    // فرز الإشعارات (غير المقروءة أولاً، ثم الحرجة)
    notifications.sort((a, b) => {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        if (a.type === 'critical' && b.type !== 'critical') return -1;
        if (a.type !== 'critical' && b.type === 'critical') return 1;
        return 0;
    });
    
    return notifications;
}

// عرض الإشعارات
function showNotifications() {
    const notifications = getNotifications();
    const container = document.getElementById('notificationsList');
    
    if (!container) return;
    
    // تحديث شارة الإشعارات
    const unreadCount = notifications.filter(n => n.unread).length;
    updateNotificationBadge(unreadCount);
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <p>لا توجد إشعارات</p>
                <span>جميع المنتجات متوفرة بكميات جيدة</span>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="notifications-list">
                ${notifications.map(notif => `
                    <div class="notification-item ${notif.unread ? 'unread' : ''}" 
                         data-notification-id="${notif.id}"
                         onclick="markNotificationRead('${notif.id}')">
                        <div class="notification-icon ${notif.type}">
                            <i class="fas fa-${notif.icon}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">
                                ${notif.title}
                                ${notif.unread ? '<span style="color: var(--danger); margin-right: 0.5rem;"><i class="fas fa-circle" style="font-size: 0.5rem;"></i></span>' : ''}
                            </div>
                            <div class="notification-message">
                                ${notif.message}
                            </div>
                            <div class="notification-time">
                                <i class="fas fa-clock"></i>
                                ${getTimeAgo(notif.time)}
                            </div>
                            <div class="notification-actions" onclick="event.stopPropagation();">
                                <button class="btn btn-secondary btn-sm" onclick="viewProductFromNotification('${notif.product.id}')">
                                    <i class="fas fa-eye"></i> عرض المنتج
                                </button>
                                ${notif.type === 'critical' ? `
                                    <button class="btn btn-primary btn-sm" onclick="editProductFromNotification('${notif.product.id}')">
                                        <i class="fas fa-edit"></i> تعديل المخزون
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // تحديث زر "تعليم الكل كمقروء"
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        if (unreadCount === 0) {
            markAllBtn.disabled = true;
            markAllBtn.style.opacity = '0.5';
        } else {
            markAllBtn.disabled = false;
            markAllBtn.style.opacity = '1';
        }
    }
    
    openModal('notificationsModal');
}

// تعليم إشعار واحد كمقروء
function markNotificationRead(notificationId) {
    const notifElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
    
    if (notifElement && notifElement.classList.contains('unread')) {
        notifElement.classList.remove('unread');
        
        // حفظ في LocalStorage
        markNotificationAsRead(notificationId);
        
        // تحديث العداد
        const notifications = getNotifications();
        const unreadCount = notifications.filter(n => n.unread).length;
        updateNotificationBadge(unreadCount);
        
        // تحديث زر "تعليم الكل كمقروء"
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn && unreadCount === 0) {
            markAllBtn.disabled = true;
            markAllBtn.style.opacity = '0.5';
        }
        
        // تأثير بصري
        notifElement.style.transition = 'all 0.3s ease';
        notifElement.style.transform = 'scale(0.98)';
        setTimeout(() => {
            notifElement.style.transform = 'scale(1)';
        }, 150);
    }
}

// تحديث شارة الإشعارات
function updateNotificationBadge(count) {
    const badge = document.querySelector('#notificationsBtn .notification-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// تعليم جميع الإشعارات كمقروءة
function markAllNotificationsRead() {
    const notifications = getNotifications();
    const readIds = getReadNotifications();
    
    // إضافة جميع الإشعارات للمقروءة
    notifications.forEach(notif => {
        if (!readIds.includes(notif.id)) {
            readIds.push(notif.id);
        }
    });
    
    saveReadNotifications(readIds);
    
    // تحديث واجهة المستخدم
    const items = document.querySelectorAll('.notification-item.unread');
    items.forEach(item => {
        item.classList.remove('unread');
    });
    
    // إخفاء الشارة
    updateNotificationBadge(0);
    
    // تعطيل الزر
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) {
        markAllBtn.disabled = true;
        markAllBtn.style.opacity = '0.5';
    }
    
    showToast('success', 'تم', 'تم تعليم جميع الإشعارات كمقروءة');
}

// عرض المنتج من الإشعار
function viewProductFromNotification(productId) {
    closeModal('notificationsModal');
    loadPage('products');
    
    setTimeout(() => {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            const editBtn = card.querySelector(`[data-product-id="${productId}"]`);
            if (editBtn) {
                const productCard = card;
                productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                productCard.style.animation = 'highlight 2s ease';
            }
        });
    }, 300);
}

// تعديل المنتج من الإشعار
function editProductFromNotification(productId) {
    closeModal('notificationsModal');
    loadPage('products');
    
    setTimeout(() => {
        editProduct(productId);
    }, 300);
}

// حساب الوقت المنقضي
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
}

// تنظيف الإشعارات المقروءة للمنتجات التي تم تعديلها
function cleanupReadNotifications() {
    const notifications = getNotifications();
    const currentNotifIds = notifications.map(n => n.id);
    const readIds = getReadNotifications();
    
    // إزالة الإشعارات المقروءة التي لم تعد موجودة
    const cleanedReadIds = readIds.filter(id => currentNotifIds.includes(id));
    saveReadNotifications(cleanedReadIds);
}

// تحديث شارة الإشعارات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        cleanupReadNotifications();
        const notifications = getNotifications();
        const unreadCount = notifications.filter(n => n.unread).length;
        updateNotificationBadge(unreadCount);
    }, 1000);
});

// تحديث الإشعارات كل دقيقة
setInterval(() => {
    cleanupReadNotifications();
    const notifications = getNotifications();
    const unreadCount = notifications.filter(n => n.unread).length;
    updateNotificationBadge(unreadCount);
}, 60000);

// تحديث الإشعارات عند حفظ منتج
const originalSaveData = saveData;
saveData = function() {
    originalSaveData();
    
    // تحديث الإشعارات بعد الحفظ
    setTimeout(() => {
        cleanupReadNotifications();
        const notifications = getNotifications();
        const unreadCount = notifications.filter(n => n.unread).length;
        updateNotificationBadge(unreadCount);
    }, 100);
};
// ==================== إدارة الفئات ====================

// الفئات الافتراضية
const DEFAULT_CATEGORIES = {
    food: { name: 'أطعمة', icon: 'utensils', default: true },
    drinks: { name: 'مشروبات', icon: 'coffee', default: true },
    electronics: { name: 'إلكترونيات', icon: 'laptop', default: true },
    stationery: { name: 'قرطاسية', icon: 'pen', default: true }
};

// تحميل الفئات من LocalStorage
function getCategories() {
    const stored = localStorage.getItem('posCategories');
    if (stored) {
        return JSON.parse(stored);
    }
    return { ...DEFAULT_CATEGORIES };
}

// حفظ الفئات
function saveCategories(categories) {
    localStorage.setItem('posCategories', JSON.stringify(categories));
}

// فتح نافذة إدارة الفئات
function openCategoriesModal() {
    displayCategoriesList();
    openModal('categoriesModal');
}

// عرض قائمة الفئات
function displayCategoriesList() {
    const container = document.getElementById('categoriesListContainer');
    if (!container) return;
    
    const categories = getCategories();
    
    if (Object.keys(categories).length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">لا توجد فئات</p>';
        return;
    }
    
    container.innerHTML = Object.entries(categories).map(([key, cat]) => `
        <div class="categories-list-item">
            <div class="category-item-info">
                <div class="category-item-icon">
                    <i class="fas fa-${cat.icon}"></i>
                </div>
                <div class="category-item-details">
                    <div class="category-item-name">
                        ${cat.name}
                        ${cat.default ? '<span class="category-default-badge">افتراضي</span>' : ''}
                    </div>
                    <div class="category-item-value">الرمز: ${key}</div>
                </div>
            </div>
            <div class="category-item-actions">
                ${!cat.default ? `
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory('${key}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// إضافة فئة جديدة
function addCategory() {
    const nameInput = document.getElementById('newCategoryName');
    const iconInput = document.getElementById('newCategoryIcon');
    
    const name = nameInput?.value.trim();
    const icon = iconInput?.value.trim();
    
    if (!name || !icon) {
        showToast('error', 'خطأ', 'يرجى إدخال اسم الفئة والأيقونة');
        return;
    }
    
    const categories = getCategories();
    const key = name.toLowerCase().replace(/\s+/g, '_');
    
    if (categories[key]) {
        showToast('error', 'خطأ', 'الفئة موجودة بالفعل');
        return;
    }
    
    categories[key] = {
        name: name,
        icon: icon,
        default: false
    };
    
    saveCategories(categories);
    updateCategorySelects();
    displayCategoriesList();
    
    if (nameInput) nameInput.value = '';
    if (iconInput) iconInput.value = '';
    
    showToast('success', 'تم الإضافة', `تم إضافة الفئة "${name}" بنجاح`);
}

// حذف فئة
function deleteCategory(key) {
    const categories = getCategories();
    const category = categories[key];
    
    if (!category) return;
    
    if (category.default) {
        showToast('error', 'خطأ', 'لا يمكن حذف الفئات الافتراضية');
        return;
    }
    
    // التحقق من وجود منتجات في هذه الفئة
    const productsInCategory = POSApp.data.products.filter(p => p.category === key);
    
    if (productsInCategory.length > 0) {
        if (!confirm(`يوجد ${productsInCategory.length} منتج في هذه الفئة. هل تريد حذفها؟\nسيتم نقل المنتجات إلى فئة "أطعمة".`)) {
            return;
        }
        
        // نقل المنتجات لفئة افتراضية
        productsInCategory.forEach(p => p.category = 'food');
        saveData();
    }
    
    delete categories[key];
    saveCategories(categories);
    updateCategorySelects();
    displayCategoriesList();
    displayProducts();
    displayPOSProducts();
    
    showToast('success', 'تم الحذف', `تم حذف الفئة "${category.name}" بنجاح`);
}

// تحديث قوائم الفئات في النماذج
function updateCategorySelects() {
    const categories = getCategories();
    
    const selects = [
        document.getElementById('productCategory'),
        document.getElementById('categoryFilter')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        const currentValue = select.value;
        const isFilter = select.id === 'categoryFilter';
        
        select.innerHTML = (isFilter ? '<option value="all">جميع الفئات</option>' : '<option value="">اختر الفئة</option>') +
            Object.entries(categories).map(([key, cat]) => 
                `<option value="${key}">${cat.name}</option>`
            ).join('');
        
        if (currentValue) select.value = currentValue;
    });
    
    // تحديث أزرار الفئات في POS
    const categoryButtons = document.querySelector('.categories-filter');
    if (categoryButtons) {
        categoryButtons.innerHTML = `
            <button class="category-btn active" data-category="all">
                <i class="fas fa-th"></i> الكل
            </button>
        ` + Object.entries(categories).map(([key, cat]) => `
            <button class="category-btn" data-category="${key}">
                <i class="fas fa-${cat.icon}"></i> ${cat.name}
            </button>
        `).join('');
        
        // إعادة ربط الأحداث
        categoryButtons.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                categoryButtons.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const category = this.getAttribute('data-category');
                displayPOSProducts(category);
            });
        });
    }
}

// تحديث دوال getCategoryName و getCategoryIcon
window.getCategoryName = function(category) {
    const categories = getCategories();
    return categories[category]?.name || category;
};

window.getCategoryIcon = function(category) {
    const categories = getCategories();
    return categories[category]?.icon || 'box';
};

// ربط الأحداث
document.addEventListener('DOMContentLoaded', function() {
    const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    if (manageCategoriesBtn) {
        manageCategoriesBtn.addEventListener('click', openCategoriesModal);
    }
    
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', addCategory);
    }
    
    // السماح بالإضافة عند الضغط على Enter
    const newCategoryName = document.getElementById('newCategoryName');
    const newCategoryIcon = document.getElementById('newCategoryIcon');
    
    if (newCategoryName) {
        newCategoryName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addCategory();
        });
    }
    
    if (newCategoryIcon) {
        newCategoryIcon.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addCategory();
        });
    }
});

// ==================== نقطة التعادل - Break-Even Analysis ====================

let breakevenChart = null;

// ربط الأحداث
document.addEventListener('DOMContentLoaded', function() {
    const breakevenForm = document.getElementById('breakevenForm');
    if (breakevenForm) {
        breakevenForm.addEventListener('submit', handleBreakevenCalculation);
    }
    
    const exportBreakevenBtn = document.getElementById('exportBreakeven');
    if (exportBreakevenBtn) {
        exportBreakevenBtn.addEventListener('click', exportBreakevenReport);
    }
});

// تحديث دالة loadPage لدعم صفحة نقطة التعادل
const originalLoadPage = loadPage;
loadPage = function(pageName) {
    originalLoadPage(pageName);
    
    if (pageName === 'breakeven') {
        // إعادة تعيين النموذج عند فتح الصفحة
        const form = document.getElementById('breakevenForm');
        if (form) form.reset();
        
        const results = document.getElementById('breakevenResults');
        if (results) results.style.display = 'none';
    }
};

// حساب نقطة التعادل
function handleBreakevenCalculation(e) {
    e.preventDefault();
    
    // الحصول على القيم
    const fixedCosts = parseFloat(document.getElementById('fixedCosts').value);
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
    const variableCost = parseFloat(document.getElementById('variableCost').value);
    const targetProfit = parseFloat(document.getElementById('targetProfit').value) || 0;
    
    // التحقق من صحة المدخلات
    if (sellingPrice <= variableCost) {
        showToast('error', 'خطأ', 'سعر البيع يجب أن يكون أكبر من التكلفة المتغيرة');
        return;
    }
    
    // حساب هامش المساهمة
    const contributionMargin = sellingPrice - variableCost;
    const contributionMarginRatio = (contributionMargin / sellingPrice) * 100;
    
    // حساب نقطة التعادل
    const breakevenUnits = Math.ceil(fixedCosts / contributionMargin);
    const breakevenRevenue = breakevenUnits * sellingPrice;
    
    // حساب الوحدات لتحقيق الهدف
    const targetUnits = targetProfit > 0 ? Math.ceil((fixedCosts + targetProfit) / contributionMargin) : 0;
    
    // عرض النتائج
    displayBreakevenResults({
        breakevenUnits,
        breakevenRevenue,
        contributionMarginRatio,
        targetUnits,
        fixedCosts,
        sellingPrice,
        variableCost,
        contributionMargin
    });
    
    showToast('success', 'تم الحساب', 'تم حساب نقطة التعادل بنجاح');
}

// عرض النتائج
function displayBreakevenResults(data) {
    const resultsDiv = document.getElementById('breakevenResults');
    resultsDiv.style.display = 'block';
    
    // تحديث البطاقات
    document.getElementById('breakevenUnits').textContent = data.breakevenUnits.toLocaleString();
    document.getElementById('breakevenRevenue').textContent = formatCurrency(data.breakevenRevenue);
    document.getElementById('contributionMargin').textContent = data.contributionMarginRatio.toFixed(2) + '%';
    
    // عرض بطاقة الهدف إذا كان موجودًا
    const targetCard = document.getElementById('targetProfitCard');
    if (data.targetUnits > 0) {
        targetCard.style.display = 'block';
        document.getElementById('targetUnits').textContent = data.targetUnits.toLocaleString();
    } else {
        targetCard.style.display = 'none';
    }
    
    // إنشاء الرسم البياني
    createBreakevenChart(data);
    
    // ملء الجدول
    fillBreakevenTable(data);
    
    // التمرير إلى النتائج
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// إنشاء الرسم البياني
function createBreakevenChart(data) {
    const ctx = document.getElementById('breakevenChart');
    if (!ctx) return;
    
    // تدمير الرسم السابق
    if (breakevenChart) breakevenChart.destroy();
    
    // إنشاء نقاط البيانات
    const maxUnits = Math.ceil(data.breakevenUnits * 2);
    const units = [];
    const revenues = [];
    const totalCosts = [];
    const profits = [];
    
    for (let i = 0; i <= maxUnits; i += Math.ceil(maxUnits / 20)) {
        units.push(i);
        const revenue = i * data.sellingPrice;
        const totalCost = data.fixedCosts + (i * data.variableCost);
        
        revenues.push(revenue);
        totalCosts.push(totalCost);
        profits.push(revenue - totalCost);
    }
    
    breakevenChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: units,
            datasets: [
                {
                    label: 'الإيرادات',
                    data: revenues,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0
                },
                {
                    label: 'إجمالي التكاليف',
                    data: totalCosts,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { padding: 15, usePointStyle: true, font: { size: 14, family: 'Cairo' } }
                },
                tooltip: {
                    backgroundColor: 'rgba(73, 54, 40, 0.95)',
                    padding: 12,
                    titleFont: { size: 14, family: 'Cairo' },
                    bodyFont: { size: 13, family: 'Cairo' },
                    callbacks: {
                        label: (context) => context.dataset.label + ': ' + formatCurrency(context.parsed.y)
                    }
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            xMin: data.breakevenUnits,
                            xMax: data.breakevenUnits,
                            borderColor: '#493628',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: 'نقطة التعادل',
                                enabled: true,
                                position: 'top',
                                backgroundColor: '#493628',
                                color: 'white',
                                font: { size: 12, family: 'Cairo' }
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'عدد الوحدات',
                        font: { size: 14, family: 'Cairo' }
                    },
                    ticks: { font: { family: 'Cairo' } }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'المبلغ (د.أ)',
                        font: { size: 14, family: 'Cairo' }
                    },
                    ticks: {
                        callback: (value) => formatCurrency(value),
                        font: { family: 'Cairo' }
                    }
                }
            }
        }
    });
}

// ملء الجدول
function fillBreakevenTable(data) {
    const tbody = document.getElementById('breakevenTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const steps = [0, Math.floor(data.breakevenUnits * 0.5), data.breakevenUnits, 
                   Math.ceil(data.breakevenUnits * 1.5), Math.ceil(data.breakevenUnits * 2)];
    
    steps.forEach(units => {
        const revenue = units * data.sellingPrice;
        const varCosts = units * data.variableCost;
        const totalCosts = data.fixedCosts + varCosts;
        const profit = revenue - totalCosts;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${units.toLocaleString()}</strong></td>
            <td>${formatCurrency(revenue)}</td>
            <td>${formatCurrency(data.fixedCosts)}</td>
            <td>${formatCurrency(varCosts)}</td>
            <td>${formatCurrency(totalCosts)}</td>
            <td style="color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">
                ${formatCurrency(Math.abs(profit))} ${profit >= 0 ? '' : '(خسارة)'}
            </td>
        `;
        
        // تمييز صف نقطة التعادل
        if (units === data.breakevenUnits) {
            row.style.background = 'rgba(73, 54, 40, 0.08)';
            row.style.fontWeight = '700';
        }
        
        tbody.appendChild(row);
    });
}

// تصدير التقرير
function exportBreakevenReport() {
    const results = document.getElementById('breakevenResults');
    if (!results || results.style.display === 'none') {
        showToast('warning', 'تنبيه', 'قم بحساب نقطة التعادل أولاً');
        return;
    }
    
    // جمع البيانات
    const units = document.getElementById('breakevenUnits').textContent;
    const revenue = document.getElementById('breakevenRevenue').textContent;
    const margin = document.getElementById('contributionMargin').textContent;
    
    const report = `
تقرير تحليل نقطة التعادل
======================

نقطة التعادل (وحدات): ${units}
نقطة التعادل (إيرادات): ${revenue}
هامش المساهمة: ${margin}

تاريخ التقرير: ${new Date().toLocaleDateString('ar-JO')}
النظام: مدرسة عكرمة POS
    `.trim();
    
    // تحميل كملف نصي
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `breakeven_report_${Date.now()}.txt`;
    link.click();
    
    showToast('success', 'تم التصدير', 'تم تصدير تقرير نقطة التعادل بنجاح');
}
