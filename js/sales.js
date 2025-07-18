import { initializeApp } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();

        let saleCart = [];
        let currentPage = 1;
        let perPage = 100;
        let startDate = '';
        let endDate = '';
        let isLoading = false;
        let allSales = [];

        const salesHistoryBody = document.getElementById('sales-history-body');
        const saleCartItemsContainer = document.getElementById('sale-cart-items');
        const summaryProfitEl = document.getElementById('summary-profit');
        const summaryTotalEl = document.getElementById('summary-total');
        const saleSearchInput = document.getElementById('sale-product-search');
        const saleSearchResults = document.getElementById('sale-search-results');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const perPageSelect = document.getElementById('per-page');
        const saleDetailsModal = document.getElementById('sale-details-modal');
        const saleDetailsContent = document.getElementById('sale-details-content');

        async function renderSaleCart() {
            saleCartItemsContainer.innerHTML = '';
            for (const item of saleCart) {
                const product = await window.salesDB.getProductById(item.id);
                if (!product) continue;
                const row = `
                    <div class="cart-item" data-id="${item.id}">
                        <span class="item-name">${product.name}</span>
                        <div class="item-qty"><input type="number" value="${item.qty}" min="1" max="${product.stock}" class="cart-item-qty-input"><span>${product.unit}</span></div>
                        <span class="item-price">${product.sellPrice.toFixed(2)} دينار</span>
                        <strong class="item-total">${(item.qty * product.sellPrice).toFixed(2)} دينار</strong>
                        <button class="item-remove" aria-label="Remove item"><i data-lucide="trash-2"></i></button>
                    </div>`;
                saleCartItemsContainer.insertAdjacentHTML('beforeend', row);
            }
            await updateSaleSummary();
            lucide.createIcons();
        }

        async function updateSaleSummary() {
            let total = 0, profit = 0;
            for (const item of saleCart) {
                const product = await window.salesDB.getProductById(item.id);
                if (!product) continue;
                total += item.qty * product.sellPrice;
                profit += item.qty * (product.sellPrice - product.buyPrice);
            }
            summaryTotalEl.textContent = `${total.toFixed(2)} دينار`;
            summaryProfitEl.textContent = `${profit.toFixed(2)} دينار`;
        }

        async function renderSalesHistory(append = false) {
            if (!window.salesDB || isLoading) return;
            isLoading = true;
            salesHistoryBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">جارٍ تحميل المبيعات...</td></tr>';

            try {
                const { sales, total } = await window.salesDB.getSales({ page: currentPage, perPage, startDate, endDate });
                if (!append) allSales = [];
                allSales = [...allSales, ...sales];

                // Keep only the most recent 100 sales
                if (allSales.length > 100) {
                    allSales = allSales.slice(-100);
                }

                salesHistoryBody.innerHTML = '';
                if (allSales.length === 0) {
                    salesHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">لا يوجد سجل مبيعات.</td></tr>`;
                    isLoading = false;
                    return;
                }

                for (const sale of allSales) {
                    const row = `
                        <tr data-id="${sale.id}">
                            <td>#${sale.id}</td>
                            <td>${sale.date}</td>
                            <td class="profit">+${sale.totalProfit.toFixed(2)} دينار</td>
                            <td><div class="actions">
                                <button class="view-details" data-id="${sale.id}"><i data-lucide="file-text"></i> عرض التفاصيل</button>
                            </div></td>
                        </tr>`;
                    salesHistoryBody.insertAdjacentHTML('beforeend', row);
                }
                lucide.createIcons();
                isLoading = false;
            } catch (error) {
                console.error('Failed to fetch sales:', error);
                salesHistoryBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">فشل تحميل المبيعات: ${error.message}</td></tr>`;
                isLoading = false;
            }
        }

        async function loadMoreSales() {
            if (isLoading) return;
            currentPage++;
            await renderSalesHistory(true);
        }

        // Lazy loading on scroll
        const tableContainer = document.querySelector('.table-container');
        tableContainer.addEventListener('scroll', () => {
            if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 50) {
                loadMoreSales();
            }
        });

        saleSearchInput.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            saleSearchResults.innerHTML = '';
            if (searchTerm.length < 1) {
                saleSearchResults.classList.remove('visible');
                return;
            }

            const products = await window.productsDB.getAllProducts(searchTerm);
            const results = products.filter(p => p.stock > 0);
            if (results.length > 0) {
                results.forEach(p => {
                    const isAdded = saleCart.some(item => item.id === p.id);
                    saleSearchResults.insertAdjacentHTML('beforeend', `
                        <div class="result-item" data-id="${p.id}" ${isAdded ? 'style="opacity:0.5; cursor:not-allowed;"' : ''}>
                            ${p.name} <span>(المتوفر: ${p.stock})</span>
                        </div>`);
                });
                saleSearchResults.classList.add('visible');
            } else {
                saleSearchResults.classList.remove('visible');
            }
        });

        saleSearchResults.addEventListener('click', async (e) => {
            const resultItem = e.target.closest('.result-item');
            if (!resultItem || resultItem.style.cursor === 'not-allowed') return;

            saleCart.push({ id: parseInt(resultItem.dataset.id), qty: 1 });
            await renderSaleCart();
            saleSearchInput.value = '';
            saleSearchResults.classList.remove('visible');
            saleSearchInput.focus();
        });

        saleCartItemsContainer.addEventListener('click', async e => {
            const removeButton = e.target.closest('.item-remove');
            if (removeButton) {
                saleCart = saleCart.filter(item => item.id !== parseInt(removeButton.closest('.cart-item').dataset.id));
                await renderSaleCart();
            }
        });

        saleCartItemsContainer.addEventListener('input', async e => {
            const qtyInput = e.target.closest('.cart-item-qty-input');
            if (qtyInput) {
                const cartItemDiv = qtyInput.closest('.cart-item');
                const product = await window.salesDB.getProductById(parseInt(cartItemDiv.dataset.id));
                if (!product) return;
                const validatedQty = Math.min(parseInt(qtyInput.value) || 1, product.stock);

                qtyInput.value = validatedQty;
                const cartItem = saleCart.find(item => item.id === product.id);
                if (cartItem) {
                    cartItem.qty = validatedQty;
                    await updateSaleSummary();
                    cartItemDiv.querySelector('.item-total').textContent = `${(validatedQty * product.sellPrice).toFixed(2)} دينار`;
                }
            }
        });

        document.getElementById('complete-sale-btn').addEventListener('click', async () => {
            if (saleCart.length === 0) {
                alert('سلة البيع فارغة!');
                return;
            }
            try {
                await window.salesDB.addSale(saleCart);
                saleCart = [];
                currentPage = 1;
                await renderSaleCart();
                await renderSalesHistory();
                window.closeModal(document.getElementById('add-sale-modal'));
            } catch (error) {
                console.error('Failed to complete sale:', error);
                alert(`فشل إتمام البيع: ${error.message}`);
            }
        });

        document.getElementById('open-sale-modal-sales').addEventListener('click', () => {
            window.openModal(document.getElementById('add-sale-modal'));
        });

        startDateInput.addEventListener('change', () => {
            startDate = startDateInput.value;
            currentPage = 1;
            allSales = [];
            renderSalesHistory();
        });

        endDateInput.addEventListener('change', () => {
            endDate = endDateInput.value;
            currentPage = 1;
            allSales = [];
            renderSalesHistory();
        });

        perPageSelect.addEventListener('change', () => {
            perPage = parseInt(perPageSelect.value);
            currentPage = 1;
            allSales = [];
            renderSalesHistory();
        });

        // View sale details
        salesHistoryBody.addEventListener('click', async (e) => {
            const button = e.target.closest('.view-details');
            if (button) {
                const saleId = parseInt(button.dataset.id);
                try {
                    const sale = allSales.find(s => s.id === saleId);
                    const details = await window.salesDB.getSaleDetails(saleId);
                    if (!details || !sale) {
                        alert('لم يتم العثور على تفاصيل المبيعة.');
                        return;
                    }
                    const productDetails = await Promise.all(sale.items.map(async item => {
                        const product = await window.salesDB.getProductById(item.productId);
                        return `<li>${product?.name || 'منتج محذوف'}: ${item.qty} ${product?.unit || ''}</li>`;
                    }));
                    saleDetailsContent.innerHTML = `
                        <p><strong>رقم المبيعة:</strong> #${details.saleId}</p>
                        <p><strong>التاريخ:</strong> ${sale.date}</p>
                        <p><strong>إجمالي المبلغ:</strong> ${details.totalPrice.toFixed(2)} دينار</p>
                        <p><strong>إجمالي الربح:</strong> ${details.totalProfit.toFixed(2)} دينار</p>
                        <p><strong>المنتجات:</strong></p>
                        <ul>${productDetails.join('')}</ul>`;
                    window.openModal(saleDetailsModal);
                } catch (error) {
                    console.error('Failed to fetch sale details:', error);
                    alert(`فشل تحميل تفاصيل المبيعة: ${error.message}`);
                }
            }
        });

        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                window.closeModal(btn.closest('.modal'));
            });
        });

        await renderSalesHistory();
        await renderSaleCart();
    } catch (error) {
        console.error('Sales page initialization failed:', error);
        alert('حدث خطأ أثناء تحميل صفحة المبيعات. يرجى التحقق من الاتصال بالإنترنت وإعادة تحميل الصفحة.');
    }
});