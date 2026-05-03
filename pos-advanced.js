/**
 * ==================================================
 * نظام POS الاحترافي - الميزات المتقدمة
 * Professional POS - Advanced Features Module
 * @version 3.0
 * ==================================================
 * يحتوي على:
 * - نظام المناوبات (Shifts) + تقارير X/Z
 * - إدارة درج النقدية (Cash Drawer)
 * - تعليق الفواتير (Hold Orders)
 * - نقاط الولاء (Loyalty Points)
 * - اختصارات لوحة المفاتيح
 * - حاسبة الباقي + دفع متعدد
 * - سعر التكلفة + تقرير الأرباح
 * - إدارة المستخدمين والصلاحيات
 * - حركة المخزون + استلام بضاعة
 * - الوضع الليلي
 * - نسخة احتياطية تلقائية
 * ==================================================
 */

(function() {
    'use strict';

    // ==================== الحالة العامة للوحدة ====================
    window.POSAdvanced = {
        currentShift: null,
        currentUser: null,
        heldOrders: [],
        stockMovements: [],
        users: [],
        loyaltySettings: {
            enabled: true,
            pointsPerCurrency: 1,    // نقطة لكل 1 د.أ
            currencyPerPoint: 0.05,  // 0.05 د.أ لكل نقطة عند الاستبدال
            minRedeemPoints: 100
        }
    };

    // ==================== التحميل من LocalStorage ====================
    function loadAdvancedData() {
        try {
            const stored = localStorage.getItem('posAdvancedData');
            if (stored) {
                const data = JSON.parse(stored);
                POSAdvanced.currentShift = data.currentShift || null;
                POSAdvanced.heldOrders = data.heldOrders || [];
                POSAdvanced.stockMovements = data.stockMovements || [];
                POSAdvanced.users = data.users || [];
                POSAdvanced.loyaltySettings = { ...POSAdvanced.loyaltySettings, ...(data.loyaltySettings || {}) };
            }

            // المستخدم الحالي من session
            const sessionUser = sessionStorage.getItem('currentUser');
            if (sessionUser) {
                POSAdvanced.currentUser = JSON.parse(sessionUser);
            }

            // إنشاء مستخدم افتراضي (Admin) إذا لم يوجد
            if (POSAdvanced.users.length === 0) {
                POSAdvanced.users.push({
                    id: 'admin_default',
                    username: 'admin',
                    name: 'المدير',
                    pin: '0000',
                    role: 'admin',
                    active: true,
                    createdAt: new Date().toISOString()
                });
                saveAdvancedData();
            }
        } catch (e) {
            console.error('خطأ في تحميل البيانات المتقدمة:', e);
        }
    }

    function saveAdvancedData() {
        try {
            localStorage.setItem('posAdvancedData', JSON.stringify({
                currentShift: POSAdvanced.currentShift,
                heldOrders: POSAdvanced.heldOrders,
                stockMovements: POSAdvanced.stockMovements,
                users: POSAdvanced.users,
                loyaltySettings: POSAdvanced.loyaltySettings
            }));
        } catch (e) {
            console.error('خطأ في حفظ البيانات المتقدمة:', e);
        }
    }

    // ==================== أدوات مساعدة ====================
    function formatCurrencySafe(amount) {
        if (typeof formatCurrency === 'function') return formatCurrency(amount);
        return Number(amount).toFixed(2) + ' د.أ';
    }

    function showToastSafe(type, title, message) {
        if (typeof showToast === 'function') showToast(type, title, message);
        else alert(`${title}: ${message}`);
    }

    function openModalSafe(id) {
        if (typeof openModal === 'function') openModal(id);
        else document.getElementById(id)?.classList.add('active');
    }

    function closeModalSafe(id) {
        if (typeof closeModal === 'function') closeModal(id);
        else document.getElementById(id)?.classList.remove('active');
    }

    function genId() {
        return 'adv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    // ==================== 1️⃣ نظام تسجيل الدخول والمستخدمين ====================
    function showLoginScreen() {
        // إذا كان هناك مستخدم بالفعل في الجلسة
        if (POSAdvanced.currentUser) {
            updateUserDisplay();
            return;
        }

const loginHTML = `
            <div class="login-modal-overlay" id="loginScreen">
                <div class="login-box">
                    <div class="login-logo">
                        <i class="fas fa-cash-register"></i>
                    </div>
                    <h2>مدرسة عكرمة POS</h2>
                    <p>الرجاء إدخال رقم PIN للمتابعة</p>
                    <div class="login-pin-input">
                        <input type="password" id="pinInput" maxlength="6" placeholder="••••" autocomplete="off" inputmode="numeric">
                    </div>
                    <div class="login-keypad">
                        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="keypad-btn" data-num="${n}">${n}</button>`).join('')}
                        <button class="keypad-btn keypad-clear" data-action="clear"><i class="fas fa-times"></i></button>
                        <button class="keypad-btn" data-num="0">0</button>
                        <button class="keypad-btn keypad-enter" data-action="enter"><i class="fas fa-check"></i></button>
                    </div>
                    <div id="loginError" class="login-error"></div>
                </div>
            </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = loginHTML;
        document.body.appendChild(div.firstElementChild);

        const pinInput = document.getElementById('pinInput');
        pinInput.focus();

        // ربط أزرار لوحة المفاتيح
        document.querySelectorAll('.keypad-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const num = this.getAttribute('data-num');
                const action = this.getAttribute('data-action');

                if (num !== null) {
                    if (pinInput.value.length < 6) pinInput.value += num;
                } else if (action === 'clear') {
                    pinInput.value = '';
                } else if (action === 'enter') {
                    attemptLogin();
                }
            });
        });

        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }

function attemptLogin() {
        const pin = document.getElementById('pinInput').value;
        const errorEl = document.getElementById('loginError');

        const user = POSAdvanced.users.find(u => u.pin === pin && u.active);
        if (!user) {
            errorEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> رقم PIN غير صحيح';
            document.getElementById('pinInput').value = '';
            document.querySelector('.login-box').classList.add('shake');
            setTimeout(() => document.querySelector('.login-box').classList.remove('shake'), 500);
            return;
        }

        POSAdvanced.currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        document.getElementById('loginScreen').remove();
        updateUserDisplay();
        showToastSafe('success', 'مرحباً', `مرحباً ${user.name}`);
        
        // إجبار المتصفح على إعادة حساب مساحة الشريط العلوي لإظهار أزرار التمرير
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 150);
    }

    function logout() {
        if (POSAdvanced.currentShift && !POSAdvanced.currentShift.closedAt) {
            if (!confirm('لديك مناوبة مفتوحة. هل تريد إغلاقها أولاً قبل تسجيل الخروج؟')) {
                return;
            }
        }
        sessionStorage.removeItem('currentUser');
        POSAdvanced.currentUser = null;
        location.reload();
    }

    function updateUserDisplay() {
        let badge = document.getElementById('currentUserBadge');
        if (!badge) {
            const navActions = document.querySelector('.navbar-actions');
            if (!navActions) return;
            badge = document.createElement('div');
            badge.id = 'currentUserBadge';
            badge.className = 'user-badge';
            navActions.insertBefore(badge, navActions.firstChild);
        }

        if (POSAdvanced.currentUser) {
            const u = POSAdvanced.currentUser;
            const roleNames = { admin: 'مدير', cashier: 'كاشير', manager: 'مشرف' };
            badge.innerHTML = `
                <div class="user-badge-info">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <span class="user-badge-name">${u.name}</span>
                        <span class="user-badge-role">${roleNames[u.role] || u.role}</span>
                    </div>
                </div>
                <button class="user-badge-logout" id="logoutBtn" title="تسجيل الخروج">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            document.getElementById('logoutBtn')?.addEventListener('click', logout);
        }
    }

    function hasPermission(permission) {
        if (!POSAdvanced.currentUser) return false;
        const role = POSAdvanced.currentUser.role;
        // المدير لديه كل الصلاحيات
        if (role === 'admin') return true;

        const permissions = {
            cashier: ['pos', 'view_products', 'view_customers', 'hold_order', 'open_shift', 'close_shift'],
            manager: ['pos', 'view_products', 'view_customers', 'hold_order', 'open_shift', 'close_shift',
                      'view_reports', 'manage_products', 'manage_customers', 'refund', 'discount']
        };
        return (permissions[role] || []).includes(permission);
    }
    window.hasPermission = hasPermission;

    // ==================== 2️⃣ نظام المناوبات (Shifts) + تقارير X/Z ====================
    function openShift() {
        if (POSAdvanced.currentShift && !POSAdvanced.currentShift.closedAt) {
            showToastSafe('warning', 'تنبيه', 'لديك مناوبة مفتوحة بالفعل');
            return;
        }

        const startCash = parseFloat(prompt('أدخل المبلغ النقدي الافتتاحي في الدرج (د.أ):', '0'));
        if (isNaN(startCash) || startCash < 0) {
            showToastSafe('error', 'خطأ', 'مبلغ غير صحيح');
            return;
        }

        POSAdvanced.currentShift = {
            id: genId(),
            userId: POSAdvanced.currentUser?.id,
            userName: POSAdvanced.currentUser?.name || 'غير معروف',
            openedAt: new Date().toISOString(),
            closedAt: null,
            startCash: startCash,
            endCash: null,
            cashIn: [],   // إيداعات
            cashOut: [],  // مسحوبات
            salesIds: [], // فواتير المناوبة
            notes: ''
        };

        saveAdvancedData();
        showToastSafe('success', 'تم فتح المناوبة', `بدأت المناوبة بمبلغ ${formatCurrencySafe(startCash)}`);
        updateShiftDisplay();
    }

    function closeShift() {
        if (!POSAdvanced.currentShift || POSAdvanced.currentShift.closedAt) {
            showToastSafe('warning', 'تنبيه', 'لا توجد مناوبة مفتوحة');
            return;
        }

        const summary = calculateShiftSummary(POSAdvanced.currentShift);
        const expectedCash = summary.expectedCash;

        const actualCashStr = prompt(
            `إغلاق المناوبة\n\n` +
            `المبيعات النقدية: ${formatCurrencySafe(summary.cashSales)}\n` +
            `الإيداعات: ${formatCurrencySafe(summary.totalCashIn)}\n` +
            `المسحوبات: ${formatCurrencySafe(summary.totalCashOut)}\n` +
            `المبلغ المتوقع في الدرج: ${formatCurrencySafe(expectedCash)}\n\n` +
            `أدخل المبلغ الفعلي في الدرج:`,
            expectedCash.toFixed(2)
        );

        if (actualCashStr === null) return;
        const actualCash = parseFloat(actualCashStr);
        if (isNaN(actualCash)) {
            showToastSafe('error', 'خطأ', 'مبلغ غير صحيح');
            return;
        }

        POSAdvanced.currentShift.endCash = actualCash;
        POSAdvanced.currentShift.closedAt = new Date().toISOString();
        POSAdvanced.currentShift.difference = actualCash - expectedCash;

        // أرشفة المناوبة
        const archives = JSON.parse(localStorage.getItem('shiftArchives') || '[]');
        archives.push(POSAdvanced.currentShift);
        localStorage.setItem('shiftArchives', JSON.stringify(archives));

        showZReport(POSAdvanced.currentShift);

        POSAdvanced.currentShift = null;
        saveAdvancedData();
        updateShiftDisplay();
    }

    function calculateShiftSummary(shift) {
        const sales = (window.POSApp?.data?.sales || []).filter(s =>
            shift.salesIds.includes(s.id) && !s.refunded
        );

        const cashSales = sales.filter(s => s.paymentMethod === 'cash')
            .reduce((sum, s) => sum + s.total, 0);
        const cardSales = sales.filter(s => s.paymentMethod === 'card')
            .reduce((sum, s) => sum + s.total, 0);
        const walletSales = sales.filter(s => s.paymentMethod === 'wallet')
            .reduce((sum, s) => sum + s.total, 0);

        const totalCashIn = (shift.cashIn || []).reduce((s, c) => s + c.amount, 0);
        const totalCashOut = (shift.cashOut || []).reduce((s, c) => s + c.amount, 0);

        const expectedCash = shift.startCash + cashSales + totalCashIn - totalCashOut;

        return {
            totalSales: sales.length,
            totalRevenue: cashSales + cardSales + walletSales,
            cashSales, cardSales, walletSales,
            totalCashIn, totalCashOut,
            expectedCash,
            itemsSold: sales.reduce((s, sale) => s + sale.items.reduce((c, i) => c + i.quantity, 0), 0)
        };
    }

    function showXReport() {
        // تقرير X = تقرير حالة المناوبة دون إغلاقها
        if (!POSAdvanced.currentShift || POSAdvanced.currentShift.closedAt) {
            showToastSafe('warning', 'تنبيه', 'لا توجد مناوبة مفتوحة');
            return;
        }
        renderShiftReport(POSAdvanced.currentShift, 'X');
    }

    function showZReport(shift) {
        // تقرير Z = تقرير إغلاق نهائي
        renderShiftReport(shift, 'Z');
    }

    function renderShiftReport(shift, type) {
        const summary = calculateShiftSummary(shift);
        const isZ = type === 'Z';

        const html = `
            <div class="shift-report" id="shiftReportPrintArea">
                <div class="shift-report-header">
                    <h2>${isZ ? '🟥 تقرير Z (إغلاق المناوبة)' : '🟦 تقرير X (تقرير لحظي)'}</h2>
                    <p>${window.POSApp?.data?.settings?.storeName || 'مدرسة عكرمة POS'}</p>
                </div>
                <div class="shift-report-meta">
                    <div><strong>الكاشير:</strong> ${shift.userName}</div>
                    <div><strong>الفتح:</strong> ${new Date(shift.openedAt).toLocaleString('ar-JO')}</div>
                    ${shift.closedAt ? `<div><strong>الإغلاق:</strong> ${new Date(shift.closedAt).toLocaleString('ar-JO')}</div>` : ''}
                    <div><strong>رقم المناوبة:</strong> ${shift.id.substring(0, 12)}</div>
                </div>

                <h3>📊 ملخص المبيعات</h3>
                <table class="shift-report-table">
                    <tr><td>عدد الفواتير</td><td><strong>${summary.totalSales}</strong></td></tr>
                    <tr><td>عدد القطع المباعة</td><td><strong>${summary.itemsSold}</strong></td></tr>
                    <tr><td>إجمالي المبيعات</td><td><strong>${formatCurrencySafe(summary.totalRevenue)}</strong></td></tr>
                </table>

                <h3>💳 توزيع طرق الدفع</h3>
                <table class="shift-report-table">
                    <tr><td>💵 نقدي</td><td>${formatCurrencySafe(summary.cashSales)}</td></tr>
                    <tr><td>💳 بطاقة</td><td>${formatCurrencySafe(summary.cardSales)}</td></tr>
                    <tr><td>📱 محفظة</td><td>${formatCurrencySafe(summary.walletSales)}</td></tr>
                </table>

                <h3>💰 درج النقدية</h3>
                <table class="shift-report-table">
                    <tr><td>الرصيد الافتتاحي</td><td>${formatCurrencySafe(shift.startCash)}</td></tr>
                    <tr><td>+ مبيعات نقدية</td><td style="color:var(--success)">${formatCurrencySafe(summary.cashSales)}</td></tr>
                    <tr><td>+ إيداعات (${(shift.cashIn||[]).length})</td><td style="color:var(--success)">${formatCurrencySafe(summary.totalCashIn)}</td></tr>
                    <tr><td>- مسحوبات (${(shift.cashOut||[]).length})</td><td style="color:var(--danger)">${formatCurrencySafe(summary.totalCashOut)}</td></tr>
                    <tr style="border-top:2px solid var(--primary);font-weight:700;">
                        <td>المتوقع في الدرج</td><td>${formatCurrencySafe(summary.expectedCash)}</td>
                    </tr>
                    ${isZ && shift.endCash !== null ? `
                        <tr><td>الفعلي في الدرج</td><td>${formatCurrencySafe(shift.endCash)}</td></tr>
                        <tr style="font-weight:700;color:${shift.difference === 0 ? 'var(--success)' : 'var(--danger)'}">
                            <td>الفرق</td>
                            <td>${shift.difference > 0 ? '+' : ''}${formatCurrencySafe(shift.difference)}
                                ${shift.difference === 0 ? ' ✓' : (shift.difference > 0 ? ' (زيادة)' : ' (عجز)')}
                            </td>
                        </tr>
                    ` : ''}
                </table>

                <div class="shift-report-footer">
                    <p>تم إصدار التقرير: ${new Date().toLocaleString('ar-JO')}</p>
                </div>
            </div>
        `;

        showInfoModal(isZ ? 'تقرير Z - إغلاق المناوبة' : 'تقرير X - تقرير لحظي', html, true);
    }

    function updateShiftDisplay() {
        let indicator = document.getElementById('shiftIndicator');
        if (!indicator) {
            const navActions = document.querySelector('.navbar-actions');
            if (!navActions) return;
            indicator = document.createElement('button');
            indicator.id = 'shiftIndicator';
            indicator.className = 'navbar-btn shift-indicator';
            indicator.title = 'إدارة المناوبة';
            navActions.insertBefore(indicator, navActions.firstChild);
            indicator.addEventListener('click', openShiftManager);
        }

        if (POSAdvanced.currentShift && !POSAdvanced.currentShift.closedAt) {
            const elapsed = Math.floor((Date.now() - new Date(POSAdvanced.currentShift.openedAt)) / 60000);
            indicator.innerHTML = `<i class="fas fa-clock" style="color:var(--success)"></i> <span class="shift-time">${elapsed}د</span>`;
            indicator.classList.add('active');
        } else {
            indicator.innerHTML = `<i class="fas fa-power-off" style="color:var(--text-secondary)"></i>`;
            indicator.classList.remove('active');
        }
    }

    // تحديث عداد المناوبة كل دقيقة
    setInterval(updateShiftDisplay, 60000);

    function openShiftManager() {
        const shift = POSAdvanced.currentShift;
        const isOpen = shift && !shift.closedAt;

        let summaryHTML = '';
        if (isOpen) {
            const summary = calculateShiftSummary(shift);
            summaryHTML = `
                <div class="shift-current-summary">
                    <h4>📊 المناوبة الحالية</h4>
                    <div class="summary-grid-2">
                        <div><span>الكاشير:</span><strong>${shift.userName}</strong></div>
                        <div><span>منذ:</span><strong>${new Date(shift.openedAt).toLocaleTimeString('ar-JO')}</strong></div>
                        <div><span>عدد الفواتير:</span><strong>${summary.totalSales}</strong></div>
                        <div><span>إجمالي:</span><strong>${formatCurrencySafe(summary.totalRevenue)}</strong></div>
                        <div><span>متوقع في الدرج:</span><strong>${formatCurrencySafe(summary.expectedCash)}</strong></div>
                    </div>
                </div>
            `;
        }

        const html = `
            ${summaryHTML}
            <div class="shift-actions-grid">
                ${!isOpen ? `
                    <button class="btn btn-success btn-large" id="btnOpenShift">
                        <i class="fas fa-play-circle"></i> فتح مناوبة جديدة
                    </button>
                ` : `
                    <button class="btn btn-info btn-large" id="btnXReport">
                        <i class="fas fa-file-alt"></i> تقرير X (لحظي)
                    </button>
                    <button class="btn btn-secondary btn-large" id="btnCashIn">
                        <i class="fas fa-arrow-down"></i> إيداع نقدي
                    </button>
                    <button class="btn btn-secondary btn-large" id="btnCashOut">
                        <i class="fas fa-arrow-up"></i> سحب نقدي
                    </button>
                    <button class="btn btn-danger btn-large" id="btnCloseShift">
                        <i class="fas fa-stop-circle"></i> إغلاق المناوبة (Z)
                    </button>
                `}
                <button class="btn btn-secondary btn-large" id="btnShiftHistory">
                    <i class="fas fa-history"></i> سجل المناوبات
                </button>
            </div>
        `;

        showInfoModal('🕐 إدارة المناوبة', html);

        document.getElementById('btnOpenShift')?.addEventListener('click', () => {
            closeInfoModal();
            openShift();
        });
        document.getElementById('btnCloseShift')?.addEventListener('click', () => {
            closeInfoModal();
            closeShift();
        });
        document.getElementById('btnXReport')?.addEventListener('click', () => {
            closeInfoModal();
            showXReport();
        });
        document.getElementById('btnCashIn')?.addEventListener('click', () => {
            closeInfoModal();
            cashTransaction('in');
        });
        document.getElementById('btnCashOut')?.addEventListener('click', () => {
            closeInfoModal();
            cashTransaction('out');
        });
        document.getElementById('btnShiftHistory')?.addEventListener('click', () => {
            closeInfoModal();
            showShiftHistory();
        });
    }

    function cashTransaction(type) {
        if (!POSAdvanced.currentShift || POSAdvanced.currentShift.closedAt) {
            showToastSafe('warning', 'تنبيه', 'افتح مناوبة أولاً');
            return;
        }

        const label = type === 'in' ? 'إيداع نقدي في الدرج' : 'سحب نقدي من الدرج';
        const amount = parseFloat(prompt(`${label}\nأدخل المبلغ:`, '0'));
        if (isNaN(amount) || amount <= 0) {
            showToastSafe('error', 'خطأ', 'مبلغ غير صحيح');
            return;
        }

        const reason = prompt('السبب (اختياري):', '') || '';

        const transaction = {
            id: genId(),
            amount,
            reason,
            time: new Date().toISOString(),
            user: POSAdvanced.currentUser?.name || 'غير معروف'
        };

        if (type === 'in') {
            POSAdvanced.currentShift.cashIn.push(transaction);
        } else {
            POSAdvanced.currentShift.cashOut.push(transaction);
        }

        saveAdvancedData();
        showToastSafe('success', 'تم', `${label}: ${formatCurrencySafe(amount)}`);
    }

    function showShiftHistory() {
        const archives = JSON.parse(localStorage.getItem('shiftArchives') || '[]');

        if (archives.length === 0) {
            showInfoModal('📚 سجل المناوبات', '<p style="text-align:center;padding:2rem;color:var(--text-secondary)">لا يوجد سجل مناوبات سابقة</p>');
            return;
        }

        const rows = archives.slice().reverse().map(s => {
            const summary = calculateShiftSummary(s);
            const diffColor = s.difference === 0 ? 'var(--success)' : 'var(--danger)';
            return `
                <tr>
                    <td>${s.userName}</td>
                    <td>${new Date(s.openedAt).toLocaleString('ar-JO')}</td>
                    <td>${summary.totalSales}</td>
                    <td>${formatCurrencySafe(summary.totalRevenue)}</td>
                    <td style="color:${diffColor};font-weight:700">
                        ${s.difference > 0 ? '+' : ''}${formatCurrencySafe(s.difference || 0)}
                    </td>
                    <td><button class="btn btn-secondary btn-sm" data-shift="${s.id}">
                        <i class="fas fa-eye"></i>
                    </button></td>
                </tr>
            `;
        }).join('');

        const html = `
            <div class="table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>الكاشير</th><th>التاريخ</th><th>عدد الفواتير</th>
                        <th>المبيعات</th><th>الفرق</th><th>عرض</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        showInfoModal('📚 سجل المناوبات', html);

        document.querySelectorAll('[data-shift]').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-shift');
                const s = archives.find(x => x.id === id);
                if (s) showZReport(s);
            });
        });
    }

    // ==================== 3️⃣ تعليق الفواتير (Hold Orders) ====================
    function holdCurrentOrder() {
        if (!window.POSApp?.data?.cart || POSApp.data.cart.length === 0) {
            showToastSafe('warning', 'تنبيه', 'السلة فارغة');
            return;
        }

        const note = prompt('أضف ملاحظة للفاتورة المعلقة (مثل: اسم العميل):', '');
        if (note === null) return;

        const customerSelect = document.getElementById('customerSelect');
        const discountInput = document.getElementById('discountInput');

        const heldOrder = {
            id: genId(),
            note: note || `طلب #${POSAdvanced.heldOrders.length + 1}`,
            cart: JSON.parse(JSON.stringify(POSApp.data.cart)),
            customerId: customerSelect?.value || null,
            discount: parseFloat(discountInput?.value || 0),
            paymentMethod: POSApp.state?.currentPaymentMethod || 'cash',
            heldAt: new Date().toISOString(),
            heldBy: POSAdvanced.currentUser?.name || 'غير معروف'
        };

        POSAdvanced.heldOrders.push(heldOrder);
        saveAdvancedData();

        // إفراغ السلة الحالية
        POSApp.data.cart = [];
        if (typeof updateCartDisplay === 'function') updateCartDisplay();
        if (discountInput) discountInput.value = 0;

        showToastSafe('success', 'تم التعليق', `تم تعليق الفاتورة (${POSAdvanced.heldOrders.length} معلقة الآن)`);
        updateHoldButtonBadge();
    }

    function showHeldOrders() {
        if (POSAdvanced.heldOrders.length === 0) {
            showInfoModal('🅿️ الفواتير المعلقة', '<p style="text-align:center;padding:2rem;color:var(--text-secondary)">لا توجد فواتير معلقة</p>');
            return;
        }

        const rows = POSAdvanced.heldOrders.map(o => {
            const total = o.cart.reduce((s, i) => s + i.price * i.quantity, 0);
            const itemsCount = o.cart.reduce((s, i) => s + i.quantity, 0);
            return `
                <div class="held-order-card">
                    <div class="held-order-info">
                        <h4>${o.note}</h4>
                        <p><i class="fas fa-clock"></i> ${new Date(o.heldAt).toLocaleString('ar-JO')}</p>
                        <p><i class="fas fa-user"></i> ${o.heldBy}</p>
                        <p><i class="fas fa-shopping-basket"></i> ${itemsCount} قطعة - ${formatCurrencySafe(total)}</p>
                    </div>
                    <div class="held-order-actions">
                        <button class="btn btn-success btn-sm" data-resume="${o.id}">
                            <i class="fas fa-play"></i> استرجاع
                        </button>
                        <button class="btn btn-danger btn-sm" data-delete-held="${o.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        showInfoModal('🅿️ الفواتير المعلقة', `<div class="held-orders-list">${rows}</div>`);

        document.querySelectorAll('[data-resume]').forEach(btn => {
            btn.addEventListener('click', function() {
                resumeHeldOrder(this.getAttribute('data-resume'));
            });
        });
        document.querySelectorAll('[data-delete-held]').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteHeldOrder(this.getAttribute('data-delete-held'));
            });
        });
    }

    function resumeHeldOrder(id) {
        const order = POSAdvanced.heldOrders.find(o => o.id === id);
        if (!order) return;

        if (window.POSApp?.data?.cart && POSApp.data.cart.length > 0) {
            if (!confirm('السلة الحالية تحتوي على منتجات. هل تريد استبدالها بالفاتورة المعلقة؟')) {
                return;
            }
        }

        POSApp.data.cart = JSON.parse(JSON.stringify(order.cart));
        const customerSelect = document.getElementById('customerSelect');
        const discountInput = document.getElementById('discountInput');
        if (customerSelect && order.customerId) customerSelect.value = order.customerId;
        if (discountInput) discountInput.value = order.discount;

        // حذف من المعلقة
        POSAdvanced.heldOrders = POSAdvanced.heldOrders.filter(o => o.id !== id);
        saveAdvancedData();

        if (typeof updateCartDisplay === 'function') updateCartDisplay();
        closeInfoModal();
        if (typeof loadPage === 'function') loadPage('pos');
        showToastSafe('success', 'تم الاسترجاع', `تم استرجاع: ${order.note}`);
        updateHoldButtonBadge();
    }

    function deleteHeldOrder(id) {
        if (!confirm('حذف هذه الفاتورة المعلقة؟')) return;
        POSAdvanced.heldOrders = POSAdvanced.heldOrders.filter(o => o.id !== id);
        saveAdvancedData();
        showHeldOrders();
        updateHoldButtonBadge();
    }

    function updateHoldButtonBadge() {
        const badge = document.getElementById('heldOrdersBadge');
        if (badge) {
            badge.textContent = POSAdvanced.heldOrders.length;
            badge.style.display = POSAdvanced.heldOrders.length > 0 ? 'flex' : 'none';
        }
    }

    // ==================== 4️⃣ نظام الدفع المتقدم (Split Payment + Change Calculator) ====================
    function openAdvancedCheckout() {
        if (!window.POSApp?.data?.cart || POSApp.data.cart.length === 0) {
            showToastSafe('error', 'خطأ', 'السلة فارغة');
            return;
        }

        const subtotal = POSApp.data.cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const discount = POSApp.state?.discount || 0;
        const discountAmount = subtotal * (discount / 100);
        const afterDisc = subtotal - discountAmount;
        const tax = afterDisc * (POSApp.data.settings.taxRate / 100);
        const total = afterDisc + tax;

        const html = `
            <div class="advanced-checkout">
                <div class="checkout-total-display">
                    <div>المبلغ المطلوب</div>
                    <div class="checkout-total-amount">${formatCurrencySafe(total)}</div>
                </div>

                <h4><i class="fas fa-coins"></i> الدفع المتعدد</h4>
                <div class="payment-split-grid">
                    <div class="payment-split-item">
                        <label>💵 نقدي</label>
                        <input type="number" id="payCash" min="0" step="0.01" value="0">
                    </div>
                    <div class="payment-split-item">
                        <label>💳 بطاقة</label>
                        <input type="number" id="payCard" min="0" step="0.01" value="0">
                    </div>
                    <div class="payment-split-item">
                        <label>📱 محفظة</label>
                        <input type="number" id="payWallet" min="0" step="0.01" value="0">
                    </div>
                </div>

                <div class="quick-amount-buttons">
                    <button class="btn btn-secondary btn-sm" data-quick="exact">المبلغ بالضبط</button>
                    <button class="btn btn-secondary btn-sm" data-quick="5">+5</button>
                    <button class="btn btn-secondary btn-sm" data-quick="10">+10</button>
                    <button class="btn btn-secondary btn-sm" data-quick="20">+20</button>
                    <button class="btn btn-secondary btn-sm" data-quick="50">+50</button>
                    <button class="btn btn-secondary btn-sm" data-quick="100">+100</button>
                </div>

                <div class="checkout-summary">
                    <div class="summary-line"><span>المدفوع:</span><strong id="totalPaid">0.00 د.أ</strong></div>
                    <div class="summary-line"><span>المتبقي:</span><strong id="remainingAmount" style="color:var(--danger)">${formatCurrencySafe(total)}</strong></div>
                    <div class="summary-line change-line"><span>الباقي/الفكة:</span><strong id="changeAmount" style="color:var(--success)">0.00 د.أ</strong></div>
                </div>

                <button class="btn btn-primary btn-large btn-confirm-checkout" id="confirmCheckoutBtn" disabled>
                    <i class="fas fa-check-circle"></i> تأكيد الدفع
                </button>
            </div>
        `;

        showInfoModal('💰 إتمام الدفع', html);

        const cashInput = document.getElementById('payCash');
        const cardInput = document.getElementById('payCard');
        const walletInput = document.getElementById('payWallet');
        const totalPaidEl = document.getElementById('totalPaid');
        const remainingEl = document.getElementById('remainingAmount');
        const changeEl = document.getElementById('changeAmount');
        const confirmBtn = document.getElementById('confirmCheckoutBtn');

        function recalc() {
            const cash = parseFloat(cashInput.value) || 0;
            const card = parseFloat(cardInput.value) || 0;
            const wallet = parseFloat(walletInput.value) || 0;
            const paid = cash + card + wallet;
            const remaining = total - paid;
            const change = paid > total ? paid - total : 0;

            totalPaidEl.textContent = formatCurrencySafe(paid);
            remainingEl.textContent = formatCurrencySafe(Math.max(0, remaining));
            remainingEl.style.color = remaining > 0 ? 'var(--danger)' : 'var(--success)';
            changeEl.textContent = formatCurrencySafe(change);
            confirmBtn.disabled = paid < total;
        }

        [cashInput, cardInput, walletInput].forEach(i => i.addEventListener('input', recalc));

        document.querySelectorAll('[data-quick]').forEach(btn => {
            btn.addEventListener('click', function() {
                const q = this.getAttribute('data-quick');
                if (q === 'exact') {
                    cashInput.value = total.toFixed(2);
                } else {
                    cashInput.value = (parseFloat(cashInput.value) || 0) + parseFloat(q);
                }
                recalc();
            });
        });

        confirmBtn.addEventListener('click', () => {
            const cash = parseFloat(cashInput.value) || 0;
            const card = parseFloat(cardInput.value) || 0;
            const wallet = parseFloat(walletInput.value) || 0;
            const change = (cash + card + wallet) - total;

            // تحديد طريقة الدفع الأساسية (الأكبر)
            let primaryMethod = 'cash';
            const max = Math.max(cash, card, wallet);
            if (max === card) primaryMethod = 'card';
            else if (max === wallet) primaryMethod = 'wallet';

            // حفظ التفاصيل في state ليستخدمها handleCheckout
            POSApp.state.currentPaymentMethod = primaryMethod;
            POSApp.state.paymentDetails = {
                cash, card, wallet,
                totalPaid: cash + card + wallet,
                change
            };

            closeInfoModal();

            if (typeof handleCheckout === 'function') {
                handleCheckout();
                if (change > 0) {
                    setTimeout(() => {
                        showToastSafe('info', 'الباقي', `قدّم للعميل: ${formatCurrencySafe(change)}`);
                    }, 500);
                }
            }
        });
    }

    // ==================== 5️⃣ نقاط الولاء ====================
    function calculateLoyaltyPoints(amount) {
        if (!POSAdvanced.loyaltySettings.enabled) return 0;
        return Math.floor(amount * POSAdvanced.loyaltySettings.pointsPerCurrency);
    }
    window.calculateLoyaltyPoints = calculateLoyaltyPoints;

    function awardLoyaltyPoints(customerId, amount) {
        if (!customerId || !POSAdvanced.loyaltySettings.enabled) return 0;
        const customer = window.POSApp?.data?.customers?.find(c => c.id === customerId);
        if (!customer) return 0;

        const points = calculateLoyaltyPoints(amount);
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + points;

        if (typeof saveData === 'function') saveData();
        return points;
    }
    window.awardLoyaltyPoints = awardLoyaltyPoints;

    // ==================== 6️⃣ حركة المخزون + استلام بضاعة ====================
    function recordStockMovement(productId, type, quantity, reason, reference) {
        const product = window.POSApp?.data?.products?.find(p => p.id === productId);
        if (!product) return;

        POSAdvanced.stockMovements.push({
            id: genId(),
            productId,
            productName: product.name,
            type, // 'in' / 'out' / 'adjust'
            quantity,
            reason: reason || '',
            reference: reference || '',
            beforeStock: product.stock - (type === 'in' ? quantity : -quantity),
            afterStock: product.stock,
            user: POSAdvanced.currentUser?.name || 'غير معروف',
            time: new Date().toISOString()
        });

        // الاحتفاظ بآخر 1000 حركة فقط لتوفير المساحة
        if (POSAdvanced.stockMovements.length > 1000) {
            POSAdvanced.stockMovements = POSAdvanced.stockMovements.slice(-1000);
        }
        saveAdvancedData();
    }
    window.recordStockMovement = recordStockMovement;

    function openStockReceiveModal() {
        if (!window.POSApp?.data?.products || POSApp.data.products.length === 0) {
            showToastSafe('warning', 'تنبيه', 'لا توجد منتجات. أضف منتجات أولاً');
            return;
        }

        const productsOptions = POSApp.data.products.map(p =>
            `<option value="${p.id}">${p.name} (المخزون الحالي: ${p.stock})</option>`
        ).join('');

        const html = `
            <div class="stock-receive-form">
                <div class="form-group">
                    <label>المنتج *</label>
                    <select id="receiveProduct">${productsOptions}</select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>الكمية المستلمة *</label>
                        <input type="number" id="receiveQuantity" min="1" value="1">
                    </div>
                    <div class="form-group">
                        <label>سعر التكلفة (د.أ)</label>
                        <input type="number" id="receiveCost" min="0" step="0.01" placeholder="اختياري">
                    </div>
                </div>
                <div class="form-group">
                    <label>رقم فاتورة المورد</label>
                    <input type="text" id="receiveRef" placeholder="مثال: SUP-001">
                </div>
                <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea id="receiveNotes" rows="2" placeholder="اسم المورد، ملاحظات..."></textarea>
                </div>
                <button class="btn btn-success btn-large" id="confirmReceiveBtn">
                    <i class="fas fa-check"></i> استلام البضاعة
                </button>
            </div>
        `;

        showInfoModal('📦 استلام بضاعة جديدة', html);

        document.getElementById('confirmReceiveBtn').addEventListener('click', () => {
            const productId = document.getElementById('receiveProduct').value;
            const qty = parseInt(document.getElementById('receiveQuantity').value);
            const cost = parseFloat(document.getElementById('receiveCost').value) || null;
            const ref = document.getElementById('receiveRef').value;
            const notes = document.getElementById('receiveNotes').value;

            if (!productId || isNaN(qty) || qty <= 0) {
                showToastSafe('error', 'خطأ', 'بيانات غير صحيحة');
                return;
            }

            const product = POSApp.data.products.find(p => p.id === productId);
            product.stock += qty;
            if (cost !== null) product.cost = cost;

            recordStockMovement(productId, 'in', qty, notes, ref);

            if (typeof saveData === 'function') saveData();
            if (typeof displayProducts === 'function') displayProducts();
            if (typeof displayPOSProducts === 'function') displayPOSProducts();

            closeInfoModal();
            showToastSafe('success', 'تم الاستلام', `تم إضافة ${qty} وحدة إلى ${product.name}`);
        });
    }

    function showStockMovementsLog() {
        if (POSAdvanced.stockMovements.length === 0) {
            showInfoModal('📋 حركة المخزون', '<p style="text-align:center;padding:2rem;color:var(--text-secondary)">لا يوجد سجل حركات بعد</p>');
            return;
        }

        const recent = POSAdvanced.stockMovements.slice(-100).reverse();
        const typeIcons = { in: '⬇️', out: '⬆️', adjust: '⚖️' };
        const typeNames = { in: 'استلام', out: 'صرف', adjust: 'تعديل' };

        const rows = recent.map(m => `
            <tr>
                <td>${typeIcons[m.type]} ${typeNames[m.type]}</td>
                <td>${m.productName}</td>
                <td style="color:${m.type === 'in' ? 'var(--success)' : 'var(--danger)'};font-weight:700">
                    ${m.type === 'in' ? '+' : '-'}${m.quantity}
                </td>
                <td>${m.beforeStock} ← ${m.afterStock}</td>
                <td>${m.reason || '-'}</td>
                <td>${m.user}</td>
                <td>${new Date(m.time).toLocaleString('ar-JO')}</td>
            </tr>
        `).join('');

        const html = `
            <div class="table-container" style="max-height:60vh;overflow:auto">
                <table class="data-table">
                    <thead><tr>
                        <th>النوع</th><th>المنتج</th><th>الكمية</th>
                        <th>المخزون</th><th>السبب</th><th>المستخدم</th><th>الوقت</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <p style="text-align:center;color:var(--text-secondary);margin-top:1rem">
                عرض آخر ${recent.length} حركة (المجموع: ${POSAdvanced.stockMovements.length})
            </p>
        `;
        showInfoModal('📋 سجل حركة المخزون', html);
    }

    // ==================== 7️⃣ تقرير الأرباح ====================
    function showProfitReport() {
        const sales = (window.POSApp?.data?.sales || []).filter(s => !s.refunded);
        const products = window.POSApp?.data?.products || [];

        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        const productProfits = {};

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.id === item.productId || p.name === item.name);
                const cost = (product?.cost || 0) * item.quantity;
                const revenue = item.price * item.quantity;
                const profit = revenue - cost;

                totalRevenue += revenue;
                totalCost += cost;
                totalProfit += profit;

                const key = item.name;
                if (!productProfits[key]) {
                    productProfits[key] = { name: key, qty: 0, revenue: 0, cost: 0, profit: 0 };
                }
                productProfits[key].qty += item.quantity;
                productProfits[key].revenue += revenue;
                productProfits[key].cost += cost;
                productProfits[key].profit += profit;
            });
        });

        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(2) : 0;
        const topProfitable = Object.values(productProfits).sort((a, b) => b.profit - a.profit).slice(0, 10);

        const productRows = topProfitable.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.qty}</td>
                <td>${formatCurrencySafe(p.revenue)}</td>
                <td>${formatCurrencySafe(p.cost)}</td>
                <td style="color:${p.profit >= 0 ? 'var(--success)' : 'var(--danger)'};font-weight:700">
                    ${formatCurrencySafe(p.profit)}
                </td>
                <td>${p.revenue > 0 ? (p.profit/p.revenue*100).toFixed(1) : 0}%</td>
            </tr>
        `).join('');

        const html = `
            <div class="profit-summary-grid">
                <div class="profit-card">
                    <div class="profit-label">إجمالي الإيرادات</div>
                    <div class="profit-value" style="color:var(--info)">${formatCurrencySafe(totalRevenue)}</div>
                </div>
                <div class="profit-card">
                    <div class="profit-label">إجمالي التكاليف</div>
                    <div class="profit-value" style="color:var(--danger)">${formatCurrencySafe(totalCost)}</div>
                </div>
                <div class="profit-card">
                    <div class="profit-label">صافي الربح</div>
                    <div class="profit-value" style="color:var(--success)">${formatCurrencySafe(totalProfit)}</div>
                </div>
                <div class="profit-card">
                    <div class="profit-label">هامش الربح</div>
                    <div class="profit-value" style="color:var(--primary)">${profitMargin}%</div>
                </div>
            </div>

            <h4 style="margin-top:1.5rem"><i class="fas fa-trophy"></i> أكثر المنتجات ربحية</h4>
            ${topProfitable.length > 0 ? `
            <div class="table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>المنتج</th><th>الكمية</th><th>الإيراد</th>
                        <th>التكلفة</th><th>الربح</th><th>هامش</th>
                    </tr></thead>
                    <tbody>${productRows}</tbody>
                </table>
            </div>` : '<p style="text-align:center;padding:1rem;color:var(--text-secondary)">لا توجد بيانات بعد</p>'}

            <p style="margin-top:1rem;padding:1rem;background:var(--info-light);border-radius:8px;color:var(--info)">
                <i class="fas fa-info-circle"></i>
                <strong>ملاحظة:</strong> لإظهار أرباح دقيقة، تأكد من إدخال "سعر التكلفة" لكل منتج عند الإضافة أو الاستلام.
            </p>
        `;

        showInfoModal('💎 تقرير الأرباح', html, true);
    }

    // ==================== 8️⃣ النسخة الاحتياطية التلقائية ====================
    function autoBackup() {
        try {
            const backup = {
                version: '3.0',
                timestamp: new Date().toISOString(),
                posData: localStorage.getItem('posData'),
                advancedData: localStorage.getItem('posAdvancedData'),
                categories: localStorage.getItem('posCategories'),
                shiftArchives: localStorage.getItem('shiftArchives'),
                readNotifications: localStorage.getItem('readNotifications')
            };

            // الاحتفاظ بآخر 5 نسخ احتياطية
            const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]');
            backups.push(backup);
            if (backups.length > 5) backups.shift();
            localStorage.setItem('autoBackups', JSON.stringify(backups));

            console.log('✅ تم عمل نسخة احتياطية تلقائية:', new Date().toLocaleString());
        } catch (e) {
            console.error('فشل النسخ الاحتياطي:', e);
        }
    }

    function restoreBackup() {
        const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]');
        if (backups.length === 0) {
            showToastSafe('warning', 'لا توجد نسخ', 'لم يتم إنشاء أي نسخ احتياطية بعد');
            return;
        }

        const list = backups.slice().reverse().map((b, i) => `
            <div class="backup-item">
                <div>
                    <strong>نسخة #${backups.length - i}</strong>
                    <p style="color:var(--text-secondary);font-size:0.875rem">
                        ${new Date(b.timestamp).toLocaleString('ar-JO')}
                    </p>
                </div>
                <button class="btn btn-success btn-sm" data-restore="${b.timestamp}">
                    <i class="fas fa-undo"></i> استعادة
                </button>
            </div>
        `).join('');

        showInfoModal('💾 النسخ الاحتياطية التلقائية', `<div class="backup-list">${list}</div>`);

        document.querySelectorAll('[data-restore]').forEach(btn => {
            btn.addEventListener('click', function() {
                const ts = this.getAttribute('data-restore');
                const backup = backups.find(b => b.timestamp === ts);
                if (!backup) return;
                if (!confirm('سيتم استبدال كل بياناتك الحالية بهذه النسخة. هل أنت متأكد؟')) return;

                if (backup.posData) localStorage.setItem('posData', backup.posData);
                if (backup.advancedData) localStorage.setItem('posAdvancedData', backup.advancedData);
                if (backup.categories) localStorage.setItem('posCategories', backup.categories);
                if (backup.shiftArchives) localStorage.setItem('shiftArchives', backup.shiftArchives);

                showToastSafe('success', 'تم الاستعادة', 'سيتم إعادة تحميل الصفحة...');
                setTimeout(() => location.reload(), 1500);
            });
        });
    }

    // نسخة احتياطية كل 10 دقائق
    setInterval(autoBackup, 10 * 60 * 1000);

    // ==================== 9️⃣ الوضع الليلي ====================
    function toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark ? '1' : '0');
        const btn = document.getElementById('darkModeBtn');
        if (btn) btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    function initDarkMode() {
        if (localStorage.getItem('darkMode') === '1') {
            document.body.classList.add('dark-mode');
        }
    }

    // ==================== 🔟 اختصارات لوحة المفاتيح ====================
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // تجاهل إذا كان المستخدم يكتب في حقل
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') {
                // باستثناء F1-F12 التي تعمل دائماً
                if (!(e.key >= 'F1' && e.key <= 'F12')) return;
            }

            // F1: مساعدة الاختصارات
            if (e.key === 'F1') { e.preventDefault(); showShortcutsHelp(); }
            // F2: نقطة البيع
            else if (e.key === 'F2') { e.preventDefault(); if (typeof loadPage === 'function') loadPage('pos'); }
            // F3: المنتجات
            else if (e.key === 'F3') { e.preventDefault(); if (typeof loadPage === 'function') loadPage('products'); }
            // F4: العملاء
            else if (e.key === 'F4') { e.preventDefault(); if (typeof loadPage === 'function') loadPage('customers'); }
            // F5: لا نتدخل (تحديث الصفحة الافتراضي)
            // F6: مسح باركود
            else if (e.key === 'F6') {
                e.preventDefault();
                if (typeof openBarcodeScannerPOS === 'function') openBarcodeScannerPOS();
            }
            // F7: تعليق الفاتورة
            else if (e.key === 'F7') { e.preventDefault(); holdCurrentOrder(); }
            // F8: استرجاع الفواتير المعلقة
            else if (e.key === 'F8') { e.preventDefault(); showHeldOrders(); }
            // F9: إتمام الدفع المتقدم
            else if (e.key === 'F9') {
                e.preventDefault();
                if (POSApp?.state?.currentPage === 'pos') openAdvancedCheckout();
            }
            // F10: المناوبة
            else if (e.key === 'F10') { e.preventDefault(); openShiftManager(); }
            // ESC: إغلاق المودال
            else if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => {
                    closeModalSafe(m.id);
                });
                closeInfoModal();
            }
        });
    }

    function showShortcutsHelp() {
        const html = `
            <div class="shortcuts-grid">
                <div class="shortcut-item"><kbd>F1</kbd><span>عرض هذه المساعدة</span></div>
                <div class="shortcut-item"><kbd>F2</kbd><span>الانتقال إلى نقطة البيع</span></div>
                <div class="shortcut-item"><kbd>F3</kbd><span>الانتقال إلى المنتجات</span></div>
                <div class="shortcut-item"><kbd>F4</kbd><span>الانتقال إلى العملاء</span></div>
                <div class="shortcut-item"><kbd>F6</kbd><span>فتح ماسح الباركود</span></div>
                <div class="shortcut-item"><kbd>F7</kbd><span>تعليق الفاتورة الحالية</span></div>
                <div class="shortcut-item"><kbd>F8</kbd><span>عرض الفواتير المعلقة</span></div>
                <div class="shortcut-item"><kbd>F9</kbd><span>إتمام الدفع (متعدد)</span></div>
                <div class="shortcut-item"><kbd>F10</kbd><span>إدارة المناوبة</span></div>
                <div class="shortcut-item"><kbd>ESC</kbd><span>إغلاق النوافذ</span></div>
            </div>
        `;
        showInfoModal('⌨️ اختصارات لوحة المفاتيح', html);
    }

    // ==================== 1️⃣1️⃣ نافذة المعلومات العامة (Info Modal) ====================
    function showInfoModal(title, contentHTML, printable = false) {
        let modal = document.getElementById('infoModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'infoModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3 id="infoModalTitle"></h3>
                        <button class="modal-close" id="infoModalCloseBtn"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body" id="infoModalBody"></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="infoModalCloseBtn2">إغلاق</button>
                        <button class="btn btn-primary" id="infoModalPrintBtn" style="display:none">
                            <i class="fas fa-print"></i> طباعة
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.modal-overlay').addEventListener('click', closeInfoModal);
            modal.querySelector('#infoModalCloseBtn').addEventListener('click', closeInfoModal);
            modal.querySelector('#infoModalCloseBtn2').addEventListener('click', closeInfoModal);
            modal.querySelector('#infoModalPrintBtn').addEventListener('click', () => {
                printElement('infoModalBody');
            });
        }

        document.getElementById('infoModalTitle').textContent = title;
        document.getElementById('infoModalBody').innerHTML = contentHTML;
        document.getElementById('infoModalPrintBtn').style.display = printable ? 'inline-flex' : 'none';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    window.showInfoModal = showInfoModal;

    function closeInfoModal() {
        const modal = document.getElementById('infoModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    window.closeInfoModal = closeInfoModal;

    function printElement(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const w = window.open('', '_blank');
        w.document.write(`
            <!DOCTYPE html><html lang="ar" dir="rtl"><head>
            <meta charset="UTF-8"><title>طباعة</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 20px; direction: rtl; }
                table { width:100%; border-collapse:collapse; margin: 10px 0; }
                th,td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background: #493628; color: white; }
                h2,h3,h4 { color: #493628; }
                .shift-report-table tr td:last-child { text-align: left; font-weight: bold; }
            </style></head><body>
            ${el.innerHTML}
            </body></html>
        `);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 500);
    }
    window.printElement = printElement;

    // ==================== 1️⃣2️⃣ زر القائمة الرئيسية المتقدمة (Toolbar) ====================
    function injectAdvancedToolbar() {
        // إضافة عناصر للقائمة الرئيسية
        const navMenu = document.querySelector('.navbar-menu');
        if (!navMenu || document.querySelector('[data-page="advanced"]')) return;

        const advBtn = document.createElement('button');
        advBtn.className = 'nav-item nav-advanced';
        advBtn.setAttribute('data-page', 'advanced');
        advBtn.innerHTML = '<i class="fas fa-bolt"></i><span>الأدوات</span>';
        advBtn.addEventListener('click', showAdvancedMenu);
        navMenu.appendChild(advBtn);
    }

    function showAdvancedMenu() {
        const html = `
            <div class="advanced-menu-grid">
                <button class="adv-menu-item" data-action="shift">
                    <i class="fas fa-clock"></i>
                    <span>المناوبة</span>
                    <small>فتح/إغلاق + تقارير X/Z</small>
                </button>
                <button class="adv-menu-item" data-action="held">
                    <i class="fas fa-pause-circle"></i>
                    <span>الفواتير المعلقة</span>
                    <small>${POSAdvanced.heldOrders.length} فاتورة</small>
                </button>
                <button class="adv-menu-item" data-action="receive">
                    <i class="fas fa-truck-loading"></i>
                    <span>استلام بضاعة</span>
                    <small>إضافة مخزون من المورد</small>
                </button>
                <button class="adv-menu-item" data-action="movements">
                    <i class="fas fa-exchange-alt"></i>
                    <span>حركة المخزون</span>
                    <small>سجل دخول/خروج البضاعة</small>
                </button>
                <button class="adv-menu-item" data-action="profit">
                    <i class="fas fa-chart-line"></i>
                    <span>تقرير الأرباح</span>
                    <small>صافي الربح وهامش الربح</small>
                </button>
                <button class="adv-menu-item" data-action="users">
                    <i class="fas fa-users-cog"></i>
                    <span>المستخدمون</span>
                    <small>إدارة الكاشيرز والصلاحيات</small>
                </button>
                <button class="adv-menu-item" data-action="backup">
                    <i class="fas fa-database"></i>
                    <span>النسخ الاحتياطية</span>
                    <small>استعادة نسخ تلقائية</small>
                </button>

                <button class="adv-menu-item" data-action="shortcuts">
                    <i class="fas fa-keyboard"></i>
                    <span>اختصارات F1-F10</span>
                    <small>قائمة الاختصارات</small>
                </button>
                <button class="adv-menu-item" data-action="loyalty">
                    <i class="fas fa-gift"></i>
                    <span>إعدادات الولاء</span>
                    <small>نقاط مكافأة العملاء</small>
                </button>
            </div>
        `;
        showInfoModal('⚡ الأدوات المتقدمة', html);

        document.querySelectorAll('.adv-menu-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                closeInfoModal();
                setTimeout(() => {
                    switch(action) {
                        case 'shift': openShiftManager(); break;
                        case 'held': showHeldOrders(); break;
                        case 'receive': openStockReceiveModal(); break;
                        case 'movements': showStockMovementsLog(); break;
                        case 'profit': showProfitReport(); break;
                        case 'users': openUserManagement(); break;
                        case 'backup': restoreBackup(); break;
                        case 'darkmode': toggleDarkMode(); break;
                        case 'shortcuts': showShortcutsHelp(); break;
                        case 'loyalty': openLoyaltySettings(); break;
                    }
                }, 200);
            });
        });
    }

    // ==================== 1️⃣3️⃣ إدارة المستخدمين ====================
    function openUserManagement() {
        if (!hasPermission('admin')) {
            // المدير فقط
            if (POSAdvanced.currentUser?.role !== 'admin') {
                showToastSafe('error', 'غير مسموح', 'هذه الميزة للمدير فقط');
                return;
            }
        }

        const rows = POSAdvanced.users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.username}</td>
                <td><span class="role-badge role-${u.role}">${
                    u.role === 'admin' ? 'مدير' : u.role === 'manager' ? 'مشرف' : 'كاشير'
                }</span></td>
                <td>${u.active ? '✅ نشط' : '❌ معطل'}</td>
                <td>
                    ${u.id !== POSAdvanced.currentUser?.id ? `
                        <button class="btn btn-secondary btn-sm" data-edit-user="${u.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" data-delete-user="${u.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : '<span style="color:var(--text-secondary)">(الحالي)</span>'}
                </td>
            </tr>
        `).join('');

        const html = `
            <button class="btn btn-primary" id="addUserBtn" style="margin-bottom:1rem">
                <i class="fas fa-user-plus"></i> إضافة مستخدم
            </button>
            <div class="table-container">
                <table class="data-table">
                    <thead><tr>
                        <th>الاسم</th><th>اسم المستخدم</th><th>الدور</th>
                        <th>الحالة</th><th>الإجراءات</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        showInfoModal('👥 إدارة المستخدمين', html);

        document.getElementById('addUserBtn').addEventListener('click', () => addEditUser());
        document.querySelectorAll('[data-edit-user]').forEach(btn => {
            btn.addEventListener('click', function() {
                addEditUser(this.getAttribute('data-edit-user'));
            });
        });
        document.querySelectorAll('[data-delete-user]').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteUser(this.getAttribute('data-delete-user'));
            });
        });
    }

    function addEditUser(userId = null) {
        const user = userId ? POSAdvanced.users.find(u => u.id === userId) : null;

        const html = `
            <div class="form-row">
                <div class="form-group">
                    <label>الاسم الكامل *</label>
                    <input type="text" id="userName" value="${user?.name || ''}">
                </div>
                <div class="form-group">
                    <label>اسم المستخدم *</label>
                    <input type="text" id="userUsername" value="${user?.username || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>رقم PIN (4-6 أرقام) *</label>
                    <input type="password" id="userPin" maxlength="6" value="${user?.pin || ''}">
                </div>
                <div class="form-group">
                    <label>الدور *</label>
                    <select id="userRole">
                        <option value="cashier" ${user?.role === 'cashier' ? 'selected' : ''}>كاشير</option>
                        <option value="manager" ${user?.role === 'manager' ? 'selected' : ''}>مشرف</option>
                        <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>مدير</option>
                    </select>
                </div>
            </div>
            <label style="display:flex;align-items:center;gap:0.5rem;margin-top:1rem">
                <input type="checkbox" id="userActive" ${(user?.active !== false) ? 'checked' : ''}>
                المستخدم نشط
            </label>
            <button class="btn btn-success btn-large" id="saveUserBtn" style="margin-top:1rem;width:100%">
                <i class="fas fa-save"></i> حفظ
            </button>
        `;

        showInfoModal(user ? '✏️ تعديل مستخدم' : '➕ إضافة مستخدم', html);

        document.getElementById('saveUserBtn').addEventListener('click', () => {
            const name = document.getElementById('userName').value.trim();
            const username = document.getElementById('userUsername').value.trim();
            const pin = document.getElementById('userPin').value;
            const role = document.getElementById('userRole').value;
            const active = document.getElementById('userActive').checked;

            if (!name || !username || !pin || pin.length < 4) {
                showToastSafe('error', 'خطأ', 'املأ جميع الحقول. PIN على الأقل 4 أرقام');
                return;
            }

            // التحقق من عدم تكرار PIN
            const pinExists = POSAdvanced.users.some(u => u.pin === pin && u.id !== userId);
            if (pinExists) {
                showToastSafe('error', 'خطأ', 'رقم PIN مستخدم بالفعل');
                return;
            }

            if (user) {
                Object.assign(user, { name, username, pin, role, active });
            } else {
                POSAdvanced.users.push({
                    id: genId(),
                    name, username, pin, role, active,
                    createdAt: new Date().toISOString()
                });
            }
            saveAdvancedData();
            closeInfoModal();
            setTimeout(openUserManagement, 200);
            showToastSafe('success', 'تم الحفظ', `تم ${user ? 'تعديل' : 'إضافة'} المستخدم`);
        });
    }

    function deleteUser(userId) {
        if (!confirm('حذف هذا المستخدم؟')) return;
        POSAdvanced.users = POSAdvanced.users.filter(u => u.id !== userId);
        saveAdvancedData();
        openUserManagement();
        showToastSafe('success', 'تم الحذف', 'تم حذف المستخدم');
    }

    // ==================== 1️⃣4️⃣ إعدادات الولاء ====================
    function openLoyaltySettings() {
        const s = POSAdvanced.loyaltySettings;
        const html = `
            <label style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
                <input type="checkbox" id="loyaltyEnabled" ${s.enabled ? 'checked' : ''}>
                <strong>تفعيل نظام نقاط الولاء</strong>
            </label>
            <div class="form-group">
                <label>عدد النقاط لكل 1 ${POSApp?.data?.settings?.currency || 'د.أ'}</label>
                <input type="number" id="pointsPerCurrency" min="0" step="0.1" value="${s.pointsPerCurrency}">
                <small>كم نقطة يحصل عليها العميل لكل وحدة عملة في فاتورته</small>
            </div>
            <div class="form-group">
                <label>قيمة النقطة الواحدة عند الاستبدال (${POSApp?.data?.settings?.currency || 'د.أ'})</label>
                <input type="number" id="currencyPerPoint" min="0" step="0.001" value="${s.currencyPerPoint}">
                <small>كم تساوي النقطة من العملة عند استخدامها كخصم</small>
            </div>
            <div class="form-group">
                <label>الحد الأدنى للنقاط للاستبدال</label>
                <input type="number" id="minRedeemPoints" min="0" value="${s.minRedeemPoints}">
            </div>
            <button class="btn btn-success btn-large" id="saveLoyaltyBtn" style="width:100%;margin-top:1rem">
                <i class="fas fa-save"></i> حفظ الإعدادات
            </button>
        `;
        showInfoModal('🎁 إعدادات نقاط الولاء', html);

        document.getElementById('saveLoyaltyBtn').addEventListener('click', () => {
            POSAdvanced.loyaltySettings = {
                enabled: document.getElementById('loyaltyEnabled').checked,
                pointsPerCurrency: parseFloat(document.getElementById('pointsPerCurrency').value) || 1,
                currencyPerPoint: parseFloat(document.getElementById('currencyPerPoint').value) || 0.05,
                minRedeemPoints: parseInt(document.getElementById('minRedeemPoints').value) || 100
            };
            saveAdvancedData();
            closeInfoModal();
            showToastSafe('success', 'تم الحفظ', 'تم حفظ إعدادات الولاء');
        });
    }

    // ==================== 1️⃣5️⃣ زر تعليق الفاتورة في POS ====================
    function injectPOSButtons() {
        const cartHeader = document.querySelector('.cart-header');
        if (!cartHeader || document.getElementById('holdOrderBtn')) return;

        // زر تعليق الفاتورة
        const holdBtn = document.createElement('button');
        holdBtn.id = 'holdOrderBtn';
        holdBtn.className = 'btn-icon btn-hold-order';
        holdBtn.title = 'تعليق الفاتورة (F7)';
        holdBtn.innerHTML = `<i class="fas fa-pause"></i><span class="held-orders-badge" id="heldOrdersBadge" style="display:none">0</span>`;
        holdBtn.addEventListener('click', holdCurrentOrder);
        cartHeader.appendChild(holdBtn);

        // زر استرجاع الفواتير المعلقة
        const resumeBtn = document.createElement('button');
        resumeBtn.id = 'resumeOrderBtn';
        resumeBtn.className = 'btn-icon btn-resume-order';
        resumeBtn.title = 'الفواتير المعلقة (F8)';
        resumeBtn.innerHTML = `<i class="fas fa-list"></i>`;
        resumeBtn.addEventListener('click', showHeldOrders);
        cartHeader.appendChild(resumeBtn);

        // تعديل زر الدفع ليفتح الدفع المتقدم
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn && !checkoutBtn.dataset.advancedHooked) {
            checkoutBtn.dataset.advancedHooked = '1';
            // إضافة زر دفع متقدم بجانبه
            const advCheckoutBtn = document.createElement('button');
            advCheckoutBtn.className = 'btn btn-success btn-checkout-advanced';
            advCheckoutBtn.innerHTML = '<i class="fas fa-coins"></i> دفع متعدد + باقي (F9)';
            advCheckoutBtn.addEventListener('click', openAdvancedCheckout);
            checkoutBtn.parentNode.insertBefore(advCheckoutBtn, checkoutBtn.nextSibling);
        }

        updateHoldButtonBadge();
    }

    // ==================== 1️⃣6️⃣ ربط مع نظام البيع الأساسي (Hooks) ====================
    function setupHooks() {
        // ربط مع handleCheckout الأساسي - تسجيل الفاتورة في المناوبة + نقاط الولاء
        if (typeof window.handleCheckout === 'function') {
            const originalCheckout = window.handleCheckout;
            window.handleCheckout = function() {
                const beforeSalesCount = window.POSApp?.data?.sales?.length || 0;
                originalCheckout.apply(this, arguments);
                const afterSalesCount = window.POSApp?.data?.sales?.length || 0;

                // إذا تمت إضافة فاتورة جديدة
                if (afterSalesCount > beforeSalesCount) {
                    const newSale = window.POSApp.data.sales[afterSalesCount - 1];

                    // 1. إضافة الفاتورة للمناوبة
                    if (POSAdvanced.currentShift && !POSAdvanced.currentShift.closedAt) {
                        POSAdvanced.currentShift.salesIds.push(newSale.id);
                    }

                    // 2. منح نقاط الولاء
                    if (newSale.customerId) {
                        const points = awardLoyaltyPoints(newSale.customerId, newSale.total);
                        if (points > 0) {
                            newSale.loyaltyPointsEarned = points;
                            setTimeout(() => {
                                showToastSafe('info', '🎁 نقاط ولاء', `حصل العميل على ${points} نقطة`);
                            }, 800);
                        }
                    }

                    // 3. تسجيل حركة مخزون لكل منتج
                    newSale.items.forEach(item => {
                        if (item.productId) {
                            recordStockMovement(item.productId, 'out', item.quantity, 'بيع', newSale.invoiceNumber);
                        }
                    });

                    saveAdvancedData();
                }
            };
        }

        // ربط مع saveData لعمل نسخة احتياطية
        if (typeof window.saveData === 'function') {
            const originalSave = window.saveData;
            window.saveData = function() {
                originalSave.apply(this, arguments);
                // عمل نسخة احتياطية كل 50 عملية حفظ
                if (!window._saveCount) window._saveCount = 0;
                window._saveCount++;
                if (window._saveCount % 50 === 0) autoBackup();
            };
        }
    }

    // ==================== 1️⃣7️⃣ تحسينات صفحة المنتجات (سعر التكلفة) ====================
    function injectCostFieldInProductForm() {
        const productForm = document.getElementById('productForm');
        if (!productForm || document.getElementById('productCost')) return;

        // إضافة حقل سعر التكلفة بعد حقل السعر
        const priceField = document.getElementById('productPrice')?.closest('.form-group');
        if (!priceField) return;

        const costFieldHTML = `
            <div class="form-group">
                <label><i class="fas fa-dollar-sign"></i> سعر التكلفة (د.أ)</label>
                <input type="number" id="productCost" step="0.01" min="0" placeholder="اختياري - لحساب الأرباح">
                <small style="color:var(--text-secondary)">سعر شراء المنتج لحساب صافي الربح</small>
            </div>
        `;
        priceField.insertAdjacentHTML('afterend', costFieldHTML);

        // تعديل دالة الحفظ والتحرير لتشمل سعر التكلفة
        if (typeof window.handleProductSubmit === 'function' && !window._productSubmitHooked) {
            window._productSubmitHooked = true;
            const originalSubmit = window.handleProductSubmit;
            window.handleProductSubmit = function(e) {
                // قبل الاستدعاء، احفظ المرجع للنموذج لإضافة cost لاحقاً
                const costInput = document.getElementById('productCost');
                const cost = parseFloat(costInput?.value) || 0;
                const productId = document.getElementById('productId')?.value;

                originalSubmit.call(this, e);

                // بعد الإضافة/التعديل، أضف سعر التكلفة
                setTimeout(() => {
                    if (productId) {
                        const p = window.POSApp.data.products.find(x => x.id === productId);
                        if (p) p.cost = cost;
                    } else {
                        // المنتج المضاف هو الأخير
                        const p = window.POSApp.data.products[window.POSApp.data.products.length - 1];
                        if (p) p.cost = cost;
                    }
                    if (typeof saveData === 'function') saveData();
                }, 50);
            };
        }

        // إضافة قراءة سعر التكلفة عند تعديل المنتج
        if (typeof window.openProductModal === 'function' && !window._openModalHooked) {
            window._openModalHooked = true;
            const originalOpen = window.openProductModal;
            window.openProductModal = function(productId = null) {
                originalOpen.call(this, productId);
                setTimeout(() => {
                    const costInput = document.getElementById('productCost');
                    if (costInput) {
                        if (productId) {
                            const p = window.POSApp?.data?.products?.find(x => x.id === productId);
                            costInput.value = p?.cost || '';
                        } else {
                            costInput.value = '';
                        }
                    }
                }, 50);
            };
        }
    }

    // ==================== 1️⃣8️⃣ التهيئة ====================
    function initialize() {
        loadAdvancedData();
        initDarkMode();
        initKeyboardShortcuts();

        // عرض شاشة تسجيل الدخول
        showLoginScreen();

        // الحقن بعد تحميل DOM الأساسي
        setTimeout(() => {
            injectAdvancedToolbar();
            injectPOSButtons();
            injectCostFieldInProductForm();
            updateUserDisplay();
            updateShiftDisplay();
            setupHooks();

            // إعادة الحقن عند تغيير الصفحة
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    setTimeout(() => {
                        injectPOSButtons();
                        injectCostFieldInProductForm();
                    }, 200);
                });
            });
        }, 1500);
    }

    // ==================== كشف الدوال للنطاق العام ====================
    window.POSAdvanced.openShift = openShift;
    window.POSAdvanced.closeShift = closeShift;
    window.POSAdvanced.holdOrder = holdCurrentOrder;
    window.POSAdvanced.showHeld = showHeldOrders;
    window.POSAdvanced.toggleDarkMode = toggleDarkMode;
    window.POSAdvanced.showProfitReport = showProfitReport;
    window.POSAdvanced.openShiftManager = openShiftManager;

    // بدء التشغيل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    console.log('✅ نظام POS المتقدم - الإصدار 3.0 - تم التحميل بنجاح');
})();
