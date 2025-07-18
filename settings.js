import { initializeApp } from './script.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApp();

        const backupBtn = document.querySelector('.btn-primary');
        const restoreBtn = document.querySelector('.btn-secondary');
        const deleteBtn = document.querySelector('.btn-danger');

        backupBtn.addEventListener('click', () => {
            if (!window.settingsDB) {
                console.error('SettingsDB not initialized');
                return;
            }
            window.settingsDB.backup();
        });

        restoreBtn.addEventListener('click', () => {
            if (!window.settingsDB) {
                console.error('SettingsDB not initialized');
                return;
            }
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.sql';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        await window.settingsDB.restore(file);
                        alert('تم استعادة البيانات بنجاح!');
                        window.location.reload();
                    } catch (error) {
                        console.error('Restore failed:', error);
                        alert('فشل في استعادة البيانات!');
                    }
                }
            };
            input.click();
        });

        deleteBtn.addEventListener('click', () => {
            if (!window.settingsDB) {
                console.error('SettingsDB not initialized');
                return;
            }
            if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا إجراء لا يمكن التراجع عنه.')) {
                window.settingsDB.deleteAllData();
                alert('تم حذف جميع البيانات!');
                window.location.reload();
            }
        });

        lucide.createIcons();
    } catch (error) {
        console.error('Settings page initialization failed:', error);
        alert('حدث خطأ أثناء تحميل صفحة الإعدادات. يرجى إعادة تحميل الصفحة.');
    }
});