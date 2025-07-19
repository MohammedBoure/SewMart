import { initializeApp } from './script.js';

initSqlJs({
  locateFile: file => `libs/sql.js/${file}`
}).then(SQL => {
  console.log("SQLite initialized successfully");
});

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
        const dashboardProfitByCategory = document.getElementById('dashboard-profit-by-category');
        const dashboardYearlyProfit = document.getElementById('dashboard-yearly-profit');
        const dashboardYearlyChange = document.getElementById('dashboard-yearly-change');
        const dashboardMonthlyChange = document.getElementById('dashboard-monthly-change');
        const dashboardDailyChange = document.getElementById('dashboard-daily-change');

        async function updateDashboard() {
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
            const salesByDay = await window.salesDB.getSalesCountByDay();
            const todayDate = new Date();
            const yesterdayDate = new Date();
            yesterdayDate.setDate(todayDate.getDate() - 1);

            const formatDate = d => d.toISOString().split('T')[0];
            const todayStr = formatDate(todayDate);
            const yesterdayStr = formatDate(yesterdayDate);



            const todaySalesCount = salesByDay.find(s => s.period === todayStr)?.salesCount || 0;
            const yesterdaySalesCount = salesByDay.find(s => s.period === yesterdayStr)?.salesCount || 0;

            dashboardTodaySales.textContent = `${todaySalesCount} ${todaySalesCount === 1 ? 'عملية' : todaySalesCount === 2 ? 'عمليتان' : 'عمليات'}`;

            const dailyChange = yesterdaySalesCount === 0 ? 100 : ((todaySalesCount - yesterdaySalesCount) / yesterdaySalesCount * 100);
            dashboardDailyChange.textContent = `${dailyChange.toFixed(1)}%`;
            dashboardDailyChange.style.color = dailyChange >= 0 ? 'green' : 'red';

            // Monthly profit
            const monthlyProfits = await window.salesDB.getProfitByMonth();
            // Total profit for all years
            const totalProfitAllYears = monthlyProfits.reduce((sum, p) => sum + p.totalProfit, 0);
            const dashboardTotalProfitAllYears = document.getElementById('dashboard-total-profit-all-years');
            if (dashboardTotalProfitAllYears) {
                dashboardTotalProfitAllYears.textContent = `${totalProfitAllYears.toFixed(2)} دينار`;
            }

            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthlyProfit = monthlyProfits
                .filter(p => p.period === currentMonth)
                .reduce((sum, p) => sum + p.totalProfit, 0);
            dashboardMonthlyProfit.textContent = `${monthlyProfit.toFixed(2)} دينار`;

            const dateNow = new Date();
            const currentYear = dateNow.getFullYear().toString();
            const lastYear = (dateNow.getFullYear() - 1).toString();

            const yearlyProfit = monthlyProfits
                .filter(p => p.period.startsWith(currentYear))
                .reduce((sum, p) => sum + p.totalProfit, 0);

            const lastYearProfit = monthlyProfits
                .filter(p => p.period.startsWith(lastYear))
                .reduce((sum, p) => sum + p.totalProfit, 0);

            dashboardYearlyProfit.textContent = `${yearlyProfit.toFixed(2)} دينار`;

            const yearlyChange = lastYearProfit === 0 ? 100 : ((yearlyProfit - lastYearProfit) / lastYearProfit * 100);
            dashboardYearlyChange.textContent = `${yearlyChange.toFixed(1)}%`;
            dashboardYearlyChange.style.color = yearlyChange >= 0 ? 'green' : 'red';

            const lastMonthDate = new Date();
            lastMonthDate.setMonth(dateNow.getMonth() - 1);
            const lastMonth = lastMonthDate.toISOString().slice(0, 7);

            const lastMonthProfit = monthlyProfits
                .filter(p => p.period === lastMonth)
                .reduce((sum, p) => sum + p.totalProfit, 0);

            const monthlyChange = lastMonthProfit === 0 ? 100 : ((monthlyProfit - lastMonthProfit) / lastMonthProfit * 100);
            dashboardMonthlyChange.textContent = `${monthlyChange.toFixed(1)}%`;
            dashboardMonthlyChange.style.color = monthlyChange >= 0 ? 'green' : 'red';

            // Recent sales
            const { sales: recentSales } = await window.salesDB.getSales({ page: 1, perPage: 5, startDate: null, endDate: null });
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

            // Profit by category (show all categories, default to monthly)
            const profitData = await window.salesDB.getProfitByMonth();
            const { sales } = await window.salesDB.getSales({ page: 1, perPage: 1000, startDate: null, endDate: null });
            const profitByCategory = {};
            for (const sale of sales) {
                const saleDate = sale.date;
                const periodKey = saleDate.slice(0, 7);
                if (profitData.some(p => p.period === periodKey)) {
                    for (const item of sale.items) {
                        const product = await window.salesDB.getProductById(item.productId);
                        if (product) {
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

        // Update dashboard
        await updateDashboard();
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
        alert('حدث خطأ أثناء تحميل لوحة التحكم. يرجى التحقق من الاتصال بالإنترنت وإعادة تحميل الصفحة.');
    }
});