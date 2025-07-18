import ProductsDB from '../database/ProductsDB.js';
import SalesDB from '../database/SalesDB.js';
import CategoriesDB from '../database/CategoriesDB.js';
import SettingsDB from '../database/SettingsDB.js';

export async function initializeApp() {
    try {
        // Initialize database instances
        window.productsDB = new ProductsDB();
        window.salesDB = new SalesDB();
        window.categoriesDB = new CategoriesDB();
        window.settingsDB = new SettingsDB();

        await Promise.all([
            window.productsDB.initialize(),
            window.salesDB.initialize(),
            window.categoriesDB.initialize(),
            window.settingsDB.initialize()
        ]);

        // Shared Modal Logic
        window.openModal = (modal) => {
            if (modal) modal.classList.add('visible');
        };
        window.closeModal = (modal) => {
            if (modal) modal.classList.remove('visible');
        };

        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => window.closeModal(button.closest('.modal')));
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) window.closeModal(modal);
            });
        });

        lucide.createIcons();
    } catch (error) {
        console.error('App initialization failed:', error);
        throw error;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});