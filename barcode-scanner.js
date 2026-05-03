/**
 * ==================================================
 * نظام مسح الباركود المحسّن - Barcode Scanner System
 * ==================================================
 * يستخدم مكتبة html5-qrcode الأفضل والأكثر استقرارًا
 * يعمل على الموبايل والتابلت بشكل مثالي
 * يتوقف تلقائيًا بعد المسح الناجح
 */

// ==================================================
// 1️⃣ الماسح الخاص بصفحة POS (إضافة للسلة)
// ==================================================

let posScanner = {
    html5QrCode: null,
    isScanning: false,
    isInitialized: false
};

/**
 * فتح ماسح الباركود في صفحة POS
 */
async function openBarcodeScannerPOS() {
    try {
        // فتح النافذة المنبثقة
        openModal('barcodeScannerModal');
        
        // تحديث الحالة
        updateScannerStatus('barcodeScannerStatus', 'جاري تهيئة الكاميرا...', 'info');
        
        // إنشاء ماسح جديد إذا لم يكن موجودًا
        if (!posScanner.html5QrCode) {
            posScanner.html5QrCode = new Html5Qrcode("barcodeScannerReader");
        }
        
        // تكوين الكاميرا
        const config = {
            fps: 10, // عدد الإطارات في الثانية
            qrbox: { width: 250, height: 250 }, // حجم مربع المسح
            aspectRatio: 1.0
        };
        
        // بدء المسح
        await posScanner.html5QrCode.start(
            { facingMode: "environment" }, // الكاميرا الخلفية
            config,
            onPOSScanSuccess,
            onPOSScanFailure
        );
        
        posScanner.isScanning = true;
        posScanner.isInitialized = true;
        
        updateScannerStatus('barcodeScannerStatus', 'وجّه الكاميرا نحو الباركود', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في فتح الكاميرا:', error);
        
        let errorMessage = 'فشل الوصول إلى الكاميرا';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'لم يتم العثور على كاميرا';
        }
        
        updateScannerStatus('barcodeScannerStatus', errorMessage, 'error');
        showToast('error', 'خطأ', errorMessage);
        
        setTimeout(() => {
            closeBarcodeScanner();
        }, 3000);
    }
}

/**
 * معالجة المسح الناجح في POS
 */
function onPOSScanSuccess(decodedText, decodedResult) {
    console.log('✅ تم مسح الباركود:', decodedText);
    
    // إيقاف المسح فورًا
    stopPOSScanner();
    
    // البحث عن المنتج
    const product = POSApp.data.products.find(p => p.barcode === decodedText);
    
    if (product) {
        // عرض رسالة النجاح
        updateScannerStatus('barcodeScannerStatus', `✓ تم العثور على: ${product.name}`, 'success');
        
        // إضافة المنتج للسلة
        addToCart(product.id);
        
        // إغلاق النافذة بعد ثانيتين
        setTimeout(() => {
            closeBarcodeScanner();
        }, 2000);
        
    } else {
        // المنتج غير موجود
        updateScannerStatus('barcodeScannerStatus', `❌ الباركود ${decodedText} غير مسجل`, 'error');
        showToast('warning', 'غير موجود', `الباركود ${decodedText} غير مسجل في النظام`);
        
        // إعادة فتح الماسح بعد 3 ثوانٍ
        setTimeout(() => {
            if (posScanner.isInitialized) {
                restartPOSScanner();
            }
        }, 3000);
    }
}

/**
 * معالجة أخطاء المسح (يتم تجاهلها)
 */
function onPOSScanFailure(error) {
    // لا نفعل شيئاً - الأخطاء طبيعية أثناء المسح
}

/**
 * إيقاف ماسح POS
 */
function stopPOSScanner() {
    if (posScanner.html5QrCode && posScanner.isScanning) {
        posScanner.html5QrCode.stop()
            .then(() => {
                posScanner.isScanning = false;
                console.log('✓ تم إيقاف ماسح POS');
            })
            .catch(err => {
                console.error('خطأ في إيقاف الماسح:', err);
            });
    }
}

/**
 * إعادة تشغيل ماسح POS
 */
async function restartPOSScanner() {
    updateScannerStatus('barcodeScannerStatus', 'جاري إعادة المسح...', 'info');
    
    try {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        await posScanner.html5QrCode.start(
            { facingMode: "environment" },
            config,
            onPOSScanSuccess,
            onPOSScanFailure
        );
        
        posScanner.isScanning = true;
        updateScannerStatus('barcodeScannerStatus', 'وجّه الكاميرا نحو الباركود', 'success');
        
    } catch (error) {
        console.error('خطأ في إعادة التشغيل:', error);
        updateScannerStatus('barcodeScannerStatus', 'فشل إعادة التشغيل', 'error');
    }
}

/**
 * إغلاق ماسح POS بالكامل
 */
function closeBarcodeScanner() {
    stopPOSScanner();
    
    // مسح الكائن
    if (posScanner.html5QrCode) {
        posScanner.html5QrCode.clear().catch(err => {
            console.error('خطأ في مسح الماسح:', err);
        });
        posScanner.html5QrCode = null;
    }
    
    posScanner.isInitialized = false;
    posScanner.isScanning = false;
    
    // إغلاق النافذة
    closeModal('barcodeScannerModal');
}

// ==================================================
// 2️⃣ الماسح الخاص بنافذة المنتج (ملء حقل الباركود)
// ==================================================

let productScanner = {
    html5QrCode: null,
    isScanning: false,
    isInitialized: false
};

/**
 * فتح ماسح الباركود في نافذة المنتج
 */
async function openProductBarcodeScanner() {
    try {
        // فتح النافذة المنبثقة
        openModal('productBarcodeScannerModal');
        
        // تحديث الحالة
        updateScannerStatus('productBarcodeScannerStatus', 'جاري تهيئة الكاميرا...', 'info');
        
        // إنشاء ماسح جديد إذا لم يكن موجودًا
        if (!productScanner.html5QrCode) {
            productScanner.html5QrCode = new Html5Qrcode("productBarcodeScannerReader");
        }
        
        // تكوين الكاميرا
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        // بدء المسح
        await productScanner.html5QrCode.start(
            { facingMode: "environment" },
            config,
            onProductScanSuccess,
            onProductScanFailure
        );
        
        productScanner.isScanning = true;
        productScanner.isInitialized = true;
        
        updateScannerStatus('productBarcodeScannerStatus', 'وجّه الكاميرا نحو باركود المنتج', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في فتح الكاميرا:', error);
        
        let errorMessage = 'فشل الوصول إلى الكاميرا';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'لم يتم العثور على كاميرا';
        }
        
        updateScannerStatus('productBarcodeScannerStatus', errorMessage, 'error');
        showToast('error', 'خطأ', errorMessage);
        
        setTimeout(() => {
            closeProductBarcodeScanner();
        }, 3000);
    }
}

/**
 * معالجة المسح الناجح في نافذة المنتج
 */
function onProductScanSuccess(decodedText, decodedResult) {
    console.log('✅ تم مسح باركود المنتج:', decodedText);
    
    // إيقاف المسح فورًا
    stopProductScanner();
    
    // التحقق من تكرار الباركود
    const existingProduct = POSApp.data.products.find(p => p.barcode === decodedText);
    const currentProductId = document.getElementById('productId')?.value;
    
    if (existingProduct && existingProduct.id !== currentProductId) {
        // الباركود مستخدم بالفعل
        updateScannerStatus('productBarcodeScannerStatus', `⚠ الباركود مستخدم للمنتج: ${existingProduct.name}`, 'warning');
        showToast('warning', 'تنبيه', `الباركود ${decodedText} مستخدم بالفعل للمنتج: ${existingProduct.name}`);
        
        // إعادة المسح بعد 3 ثوانٍ
        setTimeout(() => {
            if (productScanner.isInitialized) {
                restartProductScanner();
            }
        }, 3000);
        
        return;
    }
    
    // ملء حقل الباركود
    const barcodeInput = document.getElementById('productBarcode');
    if (barcodeInput) {
        barcodeInput.value = decodedText;
        
        // تأثير بصري
        barcodeInput.style.background = 'rgba(16, 185, 129, 0.1)';
        barcodeInput.style.borderColor = 'var(--success)';
        barcodeInput.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            barcodeInput.style.background = '';
            barcodeInput.style.borderColor = '';
        }, 2000);
    }
    
    // عرض رسالة النجاح
    updateScannerStatus('productBarcodeScannerStatus', `✓ تم مسح الباركود: ${decodedText}`, 'success');
    showToast('success', 'تم المسح', 'تم مسح الباركود وإدخاله بنجاح');
    
    // إغلاق النافذة بعد ثانيتين
    setTimeout(() => {
        closeProductBarcodeScanner();
    }, 2000);
}

/**
 * معالجة أخطاء المسح (يتم تجاهلها)
 */
function onProductScanFailure(error) {
    // لا نفعل شيئاً - الأخطاء طبيعية أثناء المسح
}

/**
 * إيقاف ماسح المنتج
 */
function stopProductScanner() {
    if (productScanner.html5QrCode && productScanner.isScanning) {
        productScanner.html5QrCode.stop()
            .then(() => {
                productScanner.isScanning = false;
                console.log('✓ تم إيقاف ماسح المنتج');
            })
            .catch(err => {
                console.error('خطأ في إيقاف الماسح:', err);
            });
    }
}

/**
 * إعادة تشغيل ماسح المنتج
 */
async function restartProductScanner() {
    updateScannerStatus('productBarcodeScannerStatus', 'جاري إعادة المسح...', 'info');
    
    try {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        await productScanner.html5QrCode.start(
            { facingMode: "environment" },
            config,
            onProductScanSuccess,
            onProductScanFailure
        );
        
        productScanner.isScanning = true;
        updateScannerStatus('productBarcodeScannerStatus', 'وجّه الكاميرا نحو باركود المنتج', 'success');
        
    } catch (error) {
        console.error('خطأ في إعادة التشغيل:', error);
        updateScannerStatus('productBarcodeScannerStatus', 'فشل إعادة التشغيل', 'error');
    }
}

/**
 * إغلاق ماسح المنتج بالكامل
 */
function closeProductBarcodeScanner() {
    stopProductScanner();
    
    // مسح الكائن
    if (productScanner.html5QrCode) {
        productScanner.html5QrCode.clear().catch(err => {
            console.error('خطأ في مسح الماسح:', err);
        });
        productScanner.html5QrCode = null;
    }
    
    productScanner.isInitialized = false;
    productScanner.isScanning = false;
    
    // إغلاق النافذة
    closeModal('productBarcodeScannerModal');
}

// ==================================================
// 3️⃣ دوال مساعدة
// ==================================================

/**
 * تحديث رسالة الحالة في واجهة الماسح
 */
function updateScannerStatus(elementId, message, type = 'info') {
    const statusElement = document.getElementById(elementId);
    if (!statusElement) return;
    
    statusElement.textContent = message;
    
    // تغيير اللون حسب النوع
    const colors = {
        'info': 'var(--text-secondary)',
        'success': 'var(--success)',
        'error': 'var(--danger)',
        'warning': 'var(--warning)'
    };
    
    statusElement.style.color = colors[type] || colors['info'];
    statusElement.style.fontWeight = '600';
}

// ==================================================
// 4️⃣ ربط الأحداث عند تحميل الصفحة
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ تم تحميل نظام مسح الباركود المحسّن');
    
    // زر مسح الباركود في POS
    const barcodeScanBtn = document.getElementById('barcodeScanBtn');
    if (barcodeScanBtn) {
        barcodeScanBtn.addEventListener('click', openBarcodeScannerPOS);
    }
    
    // زر مسح الباركود في نافذة المنتج
    const scanProductBarcodeBtn = document.getElementById('scanProductBarcodeBtn');
    if (scanProductBarcodeBtn) {
        scanProductBarcodeBtn.addEventListener('click', openProductBarcodeScanner);
    }
    
    // أزرار إغلاق ماسح POS
    document.querySelectorAll('[data-modal="barcodeScannerModal"]').forEach(btn => {
        btn.addEventListener('click', closeBarcodeScanner);
    });
    
    // أزرار إغلاق ماسح المنتج
    document.querySelectorAll('[data-modal="productBarcodeScannerModal"]').forEach(btn => {
        btn.addEventListener('click', closeProductBarcodeScanner);
    });
    
    // إغلاق عند النقر على الخلفية
    const posScannerOverlay = document.querySelector('#barcodeScannerModal .modal-overlay');
    if (posScannerOverlay) {
        posScannerOverlay.addEventListener('click', (e) => {
            if (e.target === posScannerOverlay) {
                closeBarcodeScanner();
            }
        });
    }
    
    const productScannerOverlay = document.querySelector('#productBarcodeScannerModal .modal-overlay');
    if (productScannerOverlay) {
        productScannerOverlay.addEventListener('click', (e) => {
            if (e.target === productScannerOverlay) {
                closeProductBarcodeScanner();
            }
        });
    }
});

// ==================================================
// 5️⃣ تنظيف عند إغلاق الصفحة
// ==================================================

window.addEventListener('beforeunload', function() {
    // إيقاف جميع الماسحات قبل إغلاق الصفحة
    if (posScanner.html5QrCode) {
        posScanner.html5QrCode.stop().catch(err => console.log('تم إيقاف ماسح POS'));
    }
    
    if (productScanner.html5QrCode) {
        productScanner.html5QrCode.stop().catch(err => console.log('تم إيقاف ماسح المنتج'));
    }
});

console.log('✅ barcode-scanner.js تم التحميل بنجاح');
