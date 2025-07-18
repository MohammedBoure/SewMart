import { initializeApp } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();

        const categoriesTableBody = document.getElementById('categories-table-body');
        const addCategoryForm = document.getElementById('add-category-form');
        const editCategoryForm = document.getElementById('edit-category-form');
        const openCategoryModalBtn = document.getElementById('open-category-modal');

        // Render categories table
        async function renderCategories() {
            if (!window.categoriesDB) {
                console.error('CategoriesDB not initialized');
                alert('فشل تحميل الفئات. يرجى إعادة تحميل الصفحة.');
                return;
            }
            const categories = await window.categoriesDB.getAllCategories();
            const counts = await window.categoriesDB.getCategoryCounts();
            categoriesTableBody.innerHTML = '';
            if (categories.length === 0) {
                categoriesTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">لا توجد فئات.</td></tr>`;
                return;
            }

            categories.forEach(category => {
                const count = counts[category] || 0;
                const row = `
                    <tr data-name="${category}">
                        <td>${category}</td>
                        <td>${count} ${count === 1 ? 'منتج' : count === 2 ? 'منتجان' : count > 2 && count <= 10 ? 'منتجات' : 'منتج'}</td>
                        <td><div class="actions">
                            <button class="edit-category" data-name="${category}"><i data-lucide="edit"></i></button>
                            <button class="delete-category" data-name="${category}"><i data-lucide="trash-2"></i></button>
                        </div></td>
                    </tr>`;
                categoriesTableBody.insertAdjacentHTML('beforeend', row);
            });
            lucide.createIcons();
        }

        // Handle add category form submission
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const name = document.getElementById('category-name').value.trim();
                if (!name) throw new Error('اسم الفئة مطلوب.');
                const categories = await window.categoriesDB.getAllCategories();
                if (categories.includes(name)) throw new Error('الفئة موجودة بالفعل.');

                await window.categoriesDB.addCategory(name);
                await renderCategories();
                addCategoryForm.reset();
                window.closeModal(document.getElementById('add-category-modal'));
            } catch (error) {
                console.error('Failed to add category:', error);
                alert(`فشل إضافة الفئة: ${error.message}`);
            }
        });

        // Handle edit category form submission
        editCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const oldName = document.getElementById('edit-category-old-name').value;
                const newName = document.getElementById('edit-category-name').value.trim();
                if (!newName) throw new Error('اسم الفئة مطلوب.');
                const categories = await window.categoriesDB.getAllCategories();
                if (newName !== oldName && categories.includes(newName)) throw new Error('الفئة موجودة بالفعل.');

                await window.categoriesDB.updateCategory(oldName, newName);
                await renderCategories();
                editCategoryForm.reset();
                window.closeModal(document.getElementById('edit-category-modal'));
            } catch (error) {
                console.error('Failed to update category:', error);
                alert(`فشل تعديل الفئة: ${error.message}`);
            }
        });

        // Handle edit and delete buttons
        categoriesTableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            const name = button.closest('tr').dataset.name;

            if (button.classList.contains('edit-category')) {
                try {
                    document.getElementById('edit-category-old-name').value = name;
                    document.getElementById('edit-category-name').value = name;
                    window.openModal(document.getElementById('edit-category-modal'));
                } catch (error) {
                    console.error('Failed to load category for editing:', error);
                    alert(`فشل تحميل بيانات الفئة: ${error.message}`);
                }
            } else if (button.classList.contains('delete-category')) {
                try {
                    if (!(await window.categoriesDB.canDeleteCategory(name))) {
                        alert('لا يمكن حذف هذه الفئة لأنها مرتبطة بمنتجات.');
                        return;
                    }
                    if (confirm(`هل أنت متأكد من حذف الفئة "${name}"؟`)) {
                        await window.categoriesDB.deleteCategory(name);
                        await renderCategories();
                    }
                } catch (error) {
                    console.error('Failed to delete category:', error);
                    alert(`فشل حذف الفئة: ${error.message}`);
                }
            }
        });

        // Handle open add category modal
        openCategoryModalBtn.addEventListener('click', () => {
            window.openModal(document.getElementById('add-category-modal'));
        });

        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                window.closeModal(btn.closest('.modal'));
            });
        });

        await renderCategories();
    } catch (error) {
        console.error('Categories page initialization failed:', error);
        alert('حدث خطأ أثناء تحميل صفحة الفئات. يرجى التحقق من الاتصال بالإنترنت وإعادة تحميل الصفحة.');
    }
});