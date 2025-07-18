import { initializeApp } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();

        const dashboardTotalProducts = document.getElementById('dashboard-total-products');
        const dashboardLowStock = document.getElementById('dashboard-low-stock');
        const dashboardTodaySales = document.getElementById('dashboard-today-sales');
        const dashboardMonthlyProfit = document.getElementById('dashboard-monthly-profit');
        const dashboardTotalCapitalBuy = document.getElementById('dashboard-total-capital-buy');
        const dashboardTotalCapitalSell = document.getElementById('dashboard-total-capital-sell');
        const dashboardRecentSales = document.getElementById('dashboard-recent-sales');
        const dashboardTopProducts = document.getElementById('dashboard-top-products');
        const profitFilterCategory = document.getElementById('profit-filter-category');
        const profitFilterPeriod = document.getElementById('profit-filter-period');
        const dashboardProfitByCategory = document.getElementById('dashboard-profit-by-category');

        // Populate category filter
        async function populateCategories() {
            const categories = await window.categoriesDB.getAllCategories();
            profitFilterCategory.innerHTML = '<option value="">جميع الفئات</option>';
            categories.forEach(category => {
                profitFilterCategory.insertAdjacentHTML('beforeend', `
                    <option value="${category}">${category}</option>
                `);
            });
        }

        async function updateDashboard(category = null, period = 'month') {
            if (!window.productsDB || !window.salesDB || !window.categoriesDB) {
                console.error('Database not initialized');
                alert('فشل تحميل لوحة التحكم. يرجى إعادة تحميل الصفحة.');
                return;
            }

            // Total products
            const totalProducts = await window.productsDB.getTotalProductsCount();
            dashboardTotalProducts.textContent = totalProducts;

            // Total capital (buy price)
            const totalCapitalBuy = await window.productsDB.getTotalCapitalBuyPrice();
            dashboardTotalCapitalBuy.textContent = `${totalCapitalBuy.toFixed(2)} دينار`;

            // Total capital (sell price)
            const totalCapitalSell = await window.productsDB.getTotalCapitalSellPrice();
            dashboardTotalCapitalSell.textContent = `${totalCapitalSell.toFixed(2)} دينار`;

            // Low stock count
            const lowStockCount = await window.productsDB.getLowStockProductsCount();
            dashboardLowStock.textContent = `${lowStockCount} ${lowStockCount === 1 ? 'منتج' : lowStockCount === 2 ? 'منتجان' : 'منتجات'}`;

            // Today's sales
            const today = new Date().toISOString().split('T')[0];
            const todaySalesCount = (await window.salesDB.getSalesCountByDay())
                .filter(s => s.period === today)
                .reduce((sum, s) => sum + s.salesCount, 0);
            dashboardTodaySales.textContent = `${todaySalesCount} ${todaySalesCount === 1 ? 'عملية' : todaySalesCount === 2 ? 'عمليتان' : 'عمليات'}`;

            // Monthly profit
            const monthlyProfits = await window.salesDB.getProfitByMonth();
            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthlyProfit = monthlyProfits
                .filter(p => p.period === currentMonth)
                .reduce((sum, p) => sum + p.totalProfit, 0);
            dashboardMonthlyProfit.textContent = `${monthlyProfit.toFixed(2)} دينار`;

            // Recent sales
            const { sales: recentSales } = await window.salesDB.getSales({ page: 1, perPage: 3, startDate: null, endDate: null });
            dashboardRecentSales.innerHTML = '';
            if (recentSales.length === 0) {
                dashboardRecentSales.innerHTML = '<li class="py-3"><span>لا توجد مبيعات بعد</span></li>';
            } else {
                for (const sale of recentSales) {
                    const firstItem = sale.items[0];
                    const product = await window.salesDB.getProductById(firstItem.productId);
                    const productName = product?.name || 'منتج';
                    dashboardRecentSales.insertAdjacentHTML('beforeend', `
                        <li class="flex justify-between py-3 border-b border-gray-200">
                            <span>${productName} (x${firstItem.qty})</span>
                            <span class="profit text-green-500">+${sale.totalProfit.toFixed(2)} دينار</span>
                        </li>`);
                }
            }

            // Top products
            const topProducts = await window.productsDB.getTopSellingProducts(3);
            dashboardTopProducts.innerHTML = '';
            if (topProducts.length === 0) {
                dashboardTopProducts.innerHTML = '<li class="py-3"><span>لا توجد مبيعات بعد</span></li>';
            } else {
                for (const product of topProducts) {
                    dashboardTopProducts.insertAdjacentHTML('beforeend', `
                        <li class="flex justify-between py-3 border-b border-gray-200">
                            <span>${product.name}</span>
                            <span class="price">${product.totalSold || 0} ${product.unit || ''}</span>
                        </li>`);
                }
            }

            // Profit by category
            let profitData;
            if (period === 'today') {
                profitData = await window.salesDB.getProfitByDay();
            } else if (period === 'week') {
                profitData = await window.salesDB.getProfitByWeek();
            } else {
                profitData = await window.salesDB.getProfitByMonth();
            }

            const { sales } = await window.salesDB.getSales({ page: 1, perPage: 1000, startDate: null, endDate: null });
            const profitByCategory = {};
            for (const sale of sales) {
                const saleDate = sale.date;
                let periodKey;
                if (period === 'today') {
                    periodKey = saleDate;
                } else if (period === 'week') {
                    const date = new Date(saleDate);
                    const year = date.getFullYear();
                    const week = Math.floor((date.getDate() - 1) / 7) + 1;
                    periodKey = `${year}-${week}`;
                } else {
                    periodKey = saleDate.slice(0, 7);
                }

                if (profitData.some(p => p.period === periodKey)) {
                    for (const item of sale.items) {
                        const product = await window.salesDB.getProductById(item.productId);
                        if (product && (!category || product.category === category)) {
                            profitByCategory[product.category] = (profitByCategory[product.category] || 0) + 
                                (item.qty * (product.sellPrice - product.buyPrice));
                        }
                    }
                }
            }

            dashboardProfitByCategory.innerHTML = '';
            if (Object.keys(profitByCategory).length === 0) {
                dashboardProfitByCategory.innerHTML = '<p class="text-gray-500">لا توجد أرباح مسجلة لهذه الفئة أو الفترة.</p>';
            } else {
                for (const [cat, profit] of Object.entries(profitByCategory)) {
                    dashboardProfitByCategory.insertAdjacentHTML('beforeend', `
                        <div class="category-profit-item p-4 border-b border-gray-200">
                            <span>${cat}</span>
                            <span class="profit text-green-500">+${profit.toFixed(2)} دينار</span>
                        </div>`);
                }
            }

            lucide.createIcons();
        }

        // Populate categories and update dashboard
        await populateCategories();
        await updateDashboard();

        // Event listeners for filters
        profitFilterCategory.addEventListener('change', async () => {
            const category = profitFilterCategory.value || null;
            const period = profitFilterPeriod.value;
            await updateDashboard(category, period);
        });

        profitFilterPeriod.addEventListener('change', async () => {
            const category = profitFilterCategory.value || null;
            const period = profitFilterPeriod.value;
            await updateDashboard(category, period);
        });
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        alert('حدث خطأ أثناء تحميل لوحة التحكم. يرجى التحقق من الاتصال بالإنترنت وإعادة تحميل الصفحة.');
    }
});