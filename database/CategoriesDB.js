import Database from './Database.js';

class CategoriesDB extends Database {

    /**
     *  دالة لإضافة صنف جديد إلى قاعدة البيانات
     * @param {string} name - اسم الصنف الجديد
     */
    async addCategory(name) {
        if (!name || !name.trim()) {
            throw new Error("اسم الصنف لا يمكن أن يكون فارغًا.");
        }
        const db = await this.getDB();
        const stmt = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?);');
        stmt.run([name.trim()]);
        stmt.free();
        await this.save(); // حفظ التغيير
    }

    /**
     * دالة لاسترداد جميع الأصناف من قاعدة البيانات
     * @returns {Promise<string[]>} - مصفوفة تحتوي على أسماء جميع الأصناف
     */
    async getAllCategories() {
        const db = await this.getDB();
        const stmt = db.prepare('SELECT name FROM categories ORDER BY name;');
        const categories = [];
        while (stmt.step()) {
            categories.push(stmt.get()[0]);
        }
        stmt.free();
        return categories;
    }

    /**
     * دالة لتعديل اسم صنف موجود
     * @param {string} oldName - اسم الصنف القديم
     * @param {string} newName - اسم الصنف الجديد
     */
    async updateCategory(oldName, newName) {
        if (!oldName || !newName || !newName.trim()) {
            throw new Error("الأسماء القديمة والجديدة مطلوبة للتعديل.");
        }
        if (oldName === newName.trim()) return; // لا يوجد تغيير

        const db = await this.getDB();
        try {
            // تحديث الصنف في جدول الأصناف
            db.run('UPDATE categories SET name = ? WHERE name = ?;', [newName.trim(), oldName]);
            // تحديث كل المنتجات التي تنتمي لهذا الصنف
            db.run('UPDATE products SET category = ? WHERE category = ?;', [newName.trim(), oldName]);
            await this.save(); // حفظ التغييرات
        } catch (error) {
            console.error(` فشل تحديث الصنف: ${error.message}`);
            // هنا يمكن عمل Rollback إذا كانت قاعدة البيانات تدعمها
            throw error;
        }
    }

    /**
     * دالة لحذف صنف، بشرط عدم وجود منتجات مرتبطة به
     * @param {string} name - اسم الصنف المراد حذفه
     */
    async deleteCategory(name) {
        const db = await this.getDB();
        
        const checkStmt = db.prepare('SELECT COUNT(*) AS count FROM products WHERE category = ?;');
        checkStmt.bind([name]);
        const result = checkStmt.step() ? checkStmt.getAsObject() : { count: 0 };
        checkStmt.free();

        if (result.count > 0) {
            throw new Error(`لا يمكن حذف الصنف "${name}" لأنه يحتوي على ${result.count} منتج مرتبط به.`);
        }

        const deleteStmt = db.prepare('DELETE FROM categories WHERE name = ?;');
        deleteStmt.run([name]);
        deleteStmt.free();
        await this.save(); // حفظ التغيير
    }

    /**
     * دالة لحساب عدد المنتجات في كل صنف
     * @returns {Promise<Object>} - كائن يحتوي على كل صنف وعدد المنتجات فيه
     */
    async getCategoryCounts() {
        const db = await this.getDB();
        const categories = await this.getAllCategories();
        const counts = {};
        
        if (categories.length === 0) {
            return counts;
        }

        const stmt = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE category = ?;`);
        
        for (const category of categories) {
            stmt.bind([category]);
            counts[category] = stmt.step() ? stmt.getAsObject().count : 0;
            stmt.reset();
        }

        stmt.free();
        return counts;
    }
}

export default CategoriesDB;

