import { initializeApp } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();

        const reportsLowStockAlerts = document.getElementById('reports-low-stock-alerts');

        async function updateReports() {
            if (!window.productsDB) {
                console.error('ProductsDB not initialized');
                return;
            }
            const products = await window.productsDB.getAllProducts();
            reportsLowStockAlerts.innerHTML = '';
            const lowStockProducts = products.filter(p => p.stock <= p.minStock);
            if (lowStockProducts.length === 0) {
                reportsLowStockAlerts.innerHTML = '<p class="alert alert-success bg-green-100 text-green-700 border border-green-300 p-4 rounded-lg">المخزون بحالة جيدة.</p>';
            } else {
                lowStockProducts.forEach(p => {
                    const alertClass = p.stock === 0 ? 'alert-danger bg-red-100 text-red-700 border-red-300' : 'alert-warning bg-yellow-100 text-yellow-700 border-yellow-300';
                    const message = p.stock === 0 ? 'نفدت الكمية!' : `${p.stock} ${p.unit} متبقية فقط. (الحد الأدنى: ${p.minStock})`;
                    reportsLowStockAlerts.insertAdjacentHTML('beforeend', `<p class="alert ${alertClass} p-4 rounded-lg flex items-center gap-2"><i data-lucide="alert-triangle"></i> <b>${p.name}:</b> ${message}</p>`);
                });
            }
            lucide.createIcons();
        }

        await updateReports();
    } catch (error) {
        console.error('Reports page initialization failed:', error);
        alert('حدث خطأ أثناء تحميل صفحة التقارير. يرجى إعادة تحميل الصفحة.');
    }
});