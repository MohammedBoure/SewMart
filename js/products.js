import { initializeApp } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();

        const productsTableBody = document.getElementById('products-table-body');
        const productCategorySelect = document.getElementById('product-category');
        const editProductCategorySelect = document.getElementById('edit-product-category');
        const addProductForm = document.getElementById('add-product-form');
        const editProductForm = document.getElementById('edit-product-form');
        const searchInput = document.getElementById('product-search-input');
        const openProductModalBtn = document.getElementById('open-product-modal');

        // Populate category selects
        async function populateCategories() {
            if (!window.categoriesDB) {
                console.error('CategoriesDB not initialized');
                alert('فشل تحميل الفئات. يرجى إعادة تحميل الصفحة.');
                return;
            }
            const categories = await window.categoriesDB.getAllCategories();
            productCategorySelect.innerHTML = '<option value="">اختر الفئة</option>';
            editProductCategorySelect.innerHTML = '<option value="">اختر الفئة</option>';
            categories.forEach(category => {
                const option = `<option value="${category}">${category}</option>`;
                productCategorySelect.insertAdjacentHTML('beforeend', option);
                editProductCategorySelect.insertAdjacentHTML('beforeend', option);
            });
        }

        // Render products
        async function renderProducts(searchTerm = '') {
            if (!window.productsDB) {
                console.error('ProductsDB not initialized');
                alert('فشل تحميل المنتجات. يرجى إعادة تحميل الصفحة.');
                return;
            }
            const products = await window.productsDB.getAllProducts(searchTerm);
            productsTableBody.innerHTML = '';
            if (products.length === 0) {
                productsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">لم يتم العثور على منتجات.</td></tr>`;
                return;
            }

            products.forEach(p => {
                const stockLevel = p.stock > 0 ? p.stock / p.minStock : 0;
                const tagClass = stockLevel === 0 ? 'tag-red' : stockLevel <= 1 ? 'tag-yellow' : 'tag-green';
                const row = `
                    <tr data-id="${p.id}">
                        <td>${p.name}</td>
                        <td>${p.category}</td>
                        <td>${p.buyPrice.toFixed(2)} دينار</td>
                        <td>${p.sellPrice.toFixed(2)} دينار</td>
                        <td class="quantity"><span class="tag ${tagClass}">${p.stock} ${p.unit}</span></td>
                        <td>
                            <div class="actions">
                                <button class="edit-product" data-id="${p.id}"><i data-lucide="edit"></i></button>
                                <button class="delete-product" data-id="${p.id}"><i data-lucide="trash-2"></i></button>
                            </div>
                        </td>
                    </tr>`;
                productsTableBody.insertAdjacentHTML('beforeend', row);
            });
            lucide.createIcons();
        }

        // Check if product can be deleted (not linked to sales)
        async function canDeleteProduct(id) {
            if (!window.salesDB) {
                console.error('SalesDB not initialized');
                return false;
            }
            const db = await window.salesDB.getDB();
            const stmt = db.prepare('SELECT COUNT(*) AS count FROM sale_items WHERE productId = ?;');
            stmt.bind([id]);
            const result = stmt.step() ? stmt.getAsObject().count : 0;
            stmt.free();
            return result === 0;
        }

        // Handle add product form submission
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const product = {
                    name: document.getElementById('product-name').value.trim(),
                    category: document.getElementById('product-category').value,
                    buyPrice: parseFloat(document.getElementById('buy-price').value),
                    sellPrice: parseFloat(document.getElementById('sell-price').value),
                    stock: parseInt(document.getElementById('quantity').value),
                    unit: document.getElementById('product-unit').value,
                    minStock: parseInt(document.getElementById('min-quantity').value),
                };

                // Validate inputs
                if (!product.name) throw new Error('اسم السلعة مطلوب.');
                if (!product.category) throw new Error('يجب اختيار فئة.');
                if (isNaN(product.buyPrice) || product.buyPrice < 0) throw new Error('سعر الشراء يجب أن يكون رقمًا صالحًا.');
                if (isNaN(product.sellPrice) || product.sellPrice < 0) throw new Error('سعر البيع يجب أن يكون رقمًا صالحًا.');
                if (isNaN(product.stock) || product.stock < 0) throw new Error('الكمية يجب أن تكون رقمًا صالحًا.');
                if (isNaN(product.minStock) || product.minStock < 0) throw new Error('الحد الأدنى للمخزون يجب أن يكون رقمًا صالحًا.');
                if (!product.unit) throw new Error('يجب اختيار وحدة قياس.');

                await window.productsDB.addProduct(product);
                await renderProducts();
                addProductForm.reset();
                window.closeModal(document.getElementById('add-product-modal'));
            } catch (error) {
                console.error('Failed to add product:', error);
                alert(`فشل إضافة السلعة: ${error.message}`);
            }
        });

        // Handle edit product form submission
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const id = parseInt(document.getElementById('edit-product-id').value);
                const product = {
                    name: document.getElementById('edit-product-name').value.trim(),
                    category: document.getElementById('edit-product-category').value,
                    buyPrice: parseFloat(document.getElementById('edit-buy-price').value),
                    sellPrice: parseFloat(document.getElementById('edit-sell-price').value),
                    stock: parseInt(document.getElementById('edit-quantity').value),
                    unit: document.getElementById('edit-product-unit').value,
                    minStock: parseInt(document.getElementById('edit-min-quantity').value),
                };

                // Validate inputs
                if (!product.name) throw new Error('اسم السلعة مطلوب.');
                if (!product.category) throw new Error('يجب اختيار فئة.');
                if (isNaN(product.buyPrice) || product.buyPrice < 0) throw new Error('سعر الشراء يجب أن يكون رقمًا صالحًا.');
                if (isNaN(product.sellPrice) || product.sellPrice < 0) throw new Error('سعر البيع يجب أن يكون رقمًا صالحًا.');
                if (isNaN(product.stock) || product.stock < 0) throw new Error('الكمية يجب أن تكون رقمًا صالحًا.');
                if (isNaN(product.minStock) || product.minStock < 0) throw new Error('الحد الأدنى للمخزون يجب أن يكون رقمًا صالحًا.');
                if (!product.unit) throw new Error('يجب اختيار وحدة قياس.');

                await window.productsDB.updateProduct(id, product);
                await renderProducts();
                editProductForm.reset();
                window.closeModal(document.getElementById('edit-product-modal'));
            } catch (error) {
                console.error('Failed to update product:', error);
                alert(`فشل تعديل السلعة: ${error.message}`);
            }
        });

        // Handle edit and delete buttons
        productsTableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const id = parseInt(button.closest('tr').dataset.id);

            if (button.classList.contains('edit-product')) {
                try {
                    const products = await window.productsDB.getAllProducts();
                    const product = products.find(p => p.id === id);
                    if (!product) throw new Error('المنتج غير موجود.');

                    // Populate edit form
                    document.getElementById('edit-product-id').value = product.id;
                    document.getElementById('edit-product-name').value = product.name;
                    document.getElementById('edit-product-category').value = product.category;
                    document.getElementById('edit-product-unit').value = product.unit;
                    document.getElementById('edit-buy-price').value = product.buyPrice;
                    document.getElementById('edit-sell-price').value = product.sellPrice;
                    document.getElementById('edit-quantity').value = product.stock;
                    document.getElementById('edit-min-quantity').value = product.minStock;

                    window.openModal(document.getElementById('edit-product-modal'));
                } catch (error) {
                    console.error('Failed to load product for editing:', error);
                    alert(`فشل تحميل بيانات المنتج: ${error.message}`);
                }
            } else if (button.classList.contains('delete-product')) {
                try {
                    if (!(await canDeleteProduct(id))) {
                        alert('لا يمكن حذف هذا المنتج لأنه مرتبط بمبيعات.');
                        return;
                    }
                    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                        await window.productsDB.deleteProduct(id);
                        await renderProducts();
                    }
                } catch (error) {
                    console.error('Failed to delete product:', error);
                    alert(`فشل حذف السلعة: ${error.message}`);
                }
            }
        });

        // Handle search
        searchInput.addEventListener('input', async (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            await renderProducts(searchTerm);
        });

        // Handle open add product modal
        openProductModalBtn.addEventListener('click', () => {
            window.openModal(document.getElementById('add-product-modal'));
        });

        // Initialize
        await populateCategories();
        await renderProducts();
    } catch (error) {
        console.error('Products page initialization failed:', error);
        alert('حدث خطأ أثناء تحميل صفحة المنتجات. يرجى التحقق من الاتصال بالإنترنت وإعادة تحميل الصفحة.');
    }
});