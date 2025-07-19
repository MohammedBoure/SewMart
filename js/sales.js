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
        let isSensitiveInfoVisible = false;

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
        const toggleSensitiveInfoBtn = document.getElementById('toggle-sensitive-info');

        function toggleSensitiveInfo() {
            isSensitiveInfoVisible = !isSensitiveInfoVisible;
            const sensitiveElements = document.querySelectorAll('.sensitive-info');
            sensitiveElements.forEach(el => {
                el.style.display = isSensitiveInfoVisible ? '' : 'none';
            });
            if (toggleSensitiveInfoBtn) {
                const icon = toggleSensitiveInfoBtn.querySelector('i');
                icon.setAttribute('data-lucide', isSensitiveInfoVisible ? 'eye' : 'eye-off');
                lucide.createIcons();
            }
        }

        if (toggleSensitiveInfoBtn) {
            toggleSensitiveInfoBtn.addEventListener('click', toggleSensitiveInfo);
        } else {
            console.warn('Toggle button with ID "toggle-sensitive-info" not found in the DOM.');
        }

        async function renderSaleCart() {
            saleCartItemsContainer.innerHTML = '';
            for (const item of saleCart) {
                const product = await window.salesDB.getProductById(item.id);
                if (!product) continue;
                const row = `
                    <div class="sale-cart-item" data-id="${item.id}">
                        <span class="item-name">${product.name}</span>
                        <div class="item-qty">
                            <div class="qty-wheel" data-id="${item.id}" data-max="${product.stock}">${item.qty}</div>
                            <span>${product.unit}</span>
                        </div>
                        <span class="item-price">${product.sellPrice.toFixed(2)} دينار</span>
                        <strong class="item-total">${(item.qty * product.sellPrice).toFixed(2)} دينار</strong>
                        <button class="item-remove" aria-label="Remove item"><i data-lucide="trash-2"></i></button>
                    </div>`;
                saleCartItemsContainer.insertAdjacentHTML('beforeend', row);
            }
            await updateSaleSummary();
            lucide.createIcons();
            initializeQtyWheels();
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
            if (!isSensitiveInfoVisible) {
                summaryTotalEl.parentElement.style.display = 'none';
                summaryProfitEl.parentElement.style.display = 'none';
            }
        }

        function initializeQtyWheels() {
            const wheels = document.querySelectorAll('.qty-wheel');
            wheels.forEach(wheel => {
                let isDragging = false;
                let startY = 0;
                let currentQty = parseInt(wheel.textContent) || 1;
                const maxQty = parseInt(wheel.dataset.max) || 999;
                const productId = parseInt(wheel.dataset.id);

                const updateQty = async (newQty) => {
                    newQty = Math.max(1, Math.min(newQty, maxQty));
                    wheel.textContent = newQty;
                    const cartItem = saleCart.find(item => item.id === productId);
                    if (cartItem) {
                        cartItem.qty = newQty;
                        const cartItemDiv = wheel.closest('.sale-cart-item');
                        const product = await window.salesDB.getProductById(productId);
                        if (product) {
                            cartItemDiv.querySelector('.item-total').textContent = `${(newQty * product.sellPrice).toFixed(2)} دينار`;
                        }
                        await updateSaleSummary();
                    }
                };

                wheel.addEventListener('wheel', e => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -1 : 1;
                    currentQty = parseInt(wheel.textContent);
                    updateQty(currentQty + delta);
                });

                wheel.addEventListener('touchstart', e => {
                    isDragging = true;
                    startY = e.touches[0].clientY;
                });

                wheel.addEventListener('touchmove', e => {
                    if (!isDragging) return;
                    e.preventDefault();
                    const currentY = e.touches[0].clientY;
                    const deltaY = startY - currentY;
                    if (Math.abs(deltaY) > 10) {
                        const delta = deltaY > 0 ? -1 : 1;
                        currentQty = parseInt(wheel.textContent);
                        updateQty(currentQty + delta);
                        startY = currentY;
                    }
                });

                wheel.addEventListener('touchend', () => {
                    isDragging = false;
                });
            });
        }

        async function renderSalesHistory(append = false) {
            if (!window.salesDB || isLoading) return;
            isLoading = true;
            salesHistoryBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">جارٍ تحميل المبيعات...</td></tr>';

            try {
                const { sales, total } = await window.salesDB.getSales({ page: currentPage, perPage, startDate, endDate });
                if (!append) {
                    allSales = sales;
                } else {
                    allSales = [...sales, ...allSales];
                }

                if (allSales.length > 100) {
                    allSales = allSales.slice(0, 100);
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
                            <td class="profit sensitive-info">+${sale.totalProfit.toFixed(2)} دينار</td>
                            <td><div class="actions">
                                <button class="view-details" data-id="${sale.id}"><i data-lucide="file-text"></i> عرض التفاصيل</button>
                            </div></td>
                        </tr>`;
                    salesHistoryBody.insertAdjacentHTML('beforeend', row);
                }
                lucide.createIcons();
                if (!isSensitiveInfoVisible) {
                    document.querySelectorAll('.sensitive-info').forEach(el => {
                        el.style.display = 'none';
                    });
                }
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
                saleCart = saleCart.filter(item => item.id !== parseInt(removeButton.closest('.sale-cart-item').dataset.id));
                await renderSaleCart();
            }
        });

        document.getElementById('complete-sale-btn').addEventListener('click', async () => {
            if (saleCart.length === 0) {
                alert('سلة البيع فارغة!');
                return;
            }
            try {
                const newSale = await window.salesDB.addSale(saleCart);
                saleCart = [];
                allSales = [newSale, ...allSales];
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
                        <p class="sensitive-info"><strong>إجمالي المبلغ:</strong> ${details.totalPrice.toFixed(2)} دينار</p>
                        <p class="sensitive-info"><strong>إجمالي الربح:</strong> ${details.totalProfit.toFixed(2)} دينار</p>
                        <p><strong>المنتجات:</strong></p>
                        <ul>${productDetails.join('')}</ul>`;
                    if (!isSensitiveInfoVisible) {
                        saleDetailsContent.querySelectorAll('.sensitive-info').forEach(el => {
                            el.style.display = 'none';
                        });
                    }
                    window.openModal(saleDetailsModal);
                } catch (error) {
                    console.error('Failed to fetch sale details:', error);
                    alert(`فشل تحميل تفاصيل المبيعة: ${error.message}`);
                }
            }
        });

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