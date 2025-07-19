import { initializeApp } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();

        const reportsLowStockAlerts = document.getElementById('reports-low-stock-alerts');

        // Function to calculate the date based on workingDays
        function getDateSinceWorkingDays(workingDays) {
            const today = new Date();
            today.setDate(today.getDate() - workingDays);
            return today.toISOString().split('T')[0]; // Returns date in YYYY-MM-DD format
        }

        // Function to interpolate color based on age relative to workingDays
        function getAgeColor(age, startThreshold) {
            // The warning period starts at `startThreshold` (e.g., 200 days).
            // We define the maximum danger point at double the threshold.
            const maxThreshold = startThreshold * 2;

            // Calculate how far the product's age is into the "warning zone".
            // The warning zone is the range between startThreshold and maxThreshold.
            const ageIntoWarningZone = Math.max(0, age - startThreshold);
            const warningZoneDuration = maxThreshold - startThreshold;

            // Calculate the ratio of how deep into the warning zone we are.
            // Cap ratio at 1.0 for ages exceeding the maxThreshold.
            const ratio = Math.min(ageIntoWarningZone / warningZoneDuration, 1.0);
            
            let r, g, b;

            if (ratio <= 0.2) {
                // 0% to 20% of the zone: Light yellow (rgb(255, 255, 224))
                r = 255;
                g = 255;
                b = 224;
            } else if (ratio <= 0.5) {
                // 20% to 50% of the zone: Interpolate from light yellow to orange
                const subRatio = (ratio - 0.2) / (0.5 - 0.2);
                r = 255;
                g = Math.round(255 - (255 - 165) * subRatio);
                b = Math.round(224 - (224 - 0) * subRatio);
            } else { // ratio > 0.5 up to 1.0
                // 50% to 100% of the zone: Interpolate from orange to dark red
                const subRatio = (ratio - 0.5) / (1.0 - 0.5);
                r = Math.round(255 - (255 - 127) * subRatio);
                g = Math.round(165 - (165 - 0) * subRatio);
                b = 0;
            }

            const color = `rgb(${r}, ${g}, ${b})`;
            // Optional: Keep the console log for debugging
            // console.log(`Age: ${age.toFixed(2)}, Start: ${startThreshold}, Ratio: ${ratio.toFixed(2)}, Color: ${color}`);
            return color;
        }
        // Updated updateReports function
        async function updateReports() {
            if (!window.productsDB) {
                console.error('ProductsDB not initialized');
                return;
            }

            // Low stock alerts (unchanged)
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

            // Unsold products alerts
            const reportsUnsoldAlerts = document.getElementById('reports-unsold-alerts');
            if (reportsUnsoldAlerts) {
                const workingDays = parseInt(localStorage.getItem('workingDays')) || 200; // Default to 200 as per your input
                console.log('workingDays from localStorage:', workingDays);
                const sinceDate = getDateSinceWorkingDays(workingDays);
                console.log('Calculated sinceDate:', sinceDate);

                try {
                    const unsoldProducts = await window.productsDB.getUnsoldProductsSince(sinceDate);
                    console.log('Unsold products:', unsoldProducts);
                    reportsUnsoldAlerts.innerHTML = '';
                    if (unsoldProducts.length === 0) {
                        reportsUnsoldAlerts.innerHTML = `<p class="alert alert-success bg-green-100 text-green-700 border border-green-300 p-4 rounded-lg">جميع المنتجات تم بيعها خلال ال${workingDays} يومًا الماضية.</p>`;
                    } else {
                        const today = new Date();
                        const sinceDateObj = new Date(sinceDate);
                        unsoldProducts.forEach(p => {
                            const lastSoldDate = p.lastSold ? new Date(p.lastSold) : sinceDateObj;
                            const age = (today - lastSoldDate) / (1000 * 60 * 60 * 24);
                            console.log(`Product: ${p.name}, Last Sold: ${p.lastSold}, Age: ${age.toFixed(2)}, WorkingDays: ${workingDays}`);
                            const color = getAgeColor(age, workingDays);
                            const daysText = p.lastSold ? Math.round(age) : workingDays;
                            reportsUnsoldAlerts.insertAdjacentHTML('beforeend', `<p class="alert alert-info unsold-product p-4 rounded-lg flex items-center gap-2" style="border: 2px solid ${color};"><i data-lucide="info"></i> <b>${p.name}:</b> لم يتم بيعه منذ ${daysText} يومًا.</p>`);
                        });
                    }
                } catch (error) {
                    console.error('Error fetching unsold products:', error.message);
                    reportsUnsoldAlerts.innerHTML = `<p class="alert alert-danger bg-red-100 text-red-700 border-red-300 p-4 rounded-lg">خطأ في جلب المنتجات غير المباعة: ${error.message}</p>`;
                }
            } else {
                console.error('Element with ID reports-unsold-alerts not found');
            }

            lucide.createIcons();
        }

        await updateReports();
    } catch (error) {
        console.error('Reports page initialization failed:', error);
        alert('حدث خطأ أثناء تحميل صفحة التقارير. يرجى إعادة تحميل الصفحة.');
    }
});