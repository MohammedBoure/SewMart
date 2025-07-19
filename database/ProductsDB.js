import Database from './Database.js';

class ProductsDB extends Database {
    async getAllProducts(searchTerm = '') {
        const db = await this.getDB();
        const query = searchTerm
            ? `SELECT * FROM products WHERE name LIKE ? ORDER BY name;`
            : `SELECT * FROM products ORDER BY name;`;
        const stmt = db.prepare(query, searchTerm ? [`%${searchTerm}%`] : []);
        const products = [];
        while (stmt.step()) {
            products.push(stmt.getAsObject());
        }
        stmt.free();
        return products;
    }

    async addProduct(product) {
        const { name, category, buyPrice, sellPrice, stock, unit, minStock } = product;
        const db = await this.getDB();
        db.run(
            `INSERT INTO products (id, name, category, buyPrice, sellPrice, stock, unit, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [Date.now(), name, category, buyPrice, sellPrice, stock, unit, minStock]
        );
        await this.save();
    }

    async updateProduct(id, product) {
        const { name, category, buyPrice, sellPrice, stock, unit, minStock } = product;
        const db = await this.getDB();
        db.run(
            `UPDATE products SET name = ?, category = ?, buyPrice = ?, sellPrice = ?, stock = ?, unit = ?, minStock = ? WHERE id = ?;`,
            [name, category, buyPrice, sellPrice, stock, unit, minStock, id]
        );
        await this.save();
    }

    async deleteProduct(id) {
        const db = await this.getDB();
        db.run(`DELETE FROM products WHERE id = ?;`, [id]);
        await this.save();
    }

    async getTopSellingProducts(limit = 5) {
        const db = await this.getDB();
        const stmt = db.prepare(`
            SELECT p.id, p.name, p.category, p.unit, SUM(si.qty) as totalSold
            FROM products p
            LEFT JOIN sale_items si ON p.id = si.productId
            GROUP BY p.id
            ORDER BY totalSold DESC, p.name
            LIMIT ?;
        `, [limit]);
        const products = [];
        while (stmt.step()) {
            products.push(stmt.getAsObject());
        }
        stmt.free();
        return products;
    }

    async getTotalProductsCount() {
        const db = await this.getDB();
        const result = db.exec("SELECT COUNT(*) FROM products;");
        if (result.length > 0 && result[0].values && result[0].values.length > 0) {
            return result[0].values[0][0];
        }
        return 0;
    }

    async getLowStockProductsCount() {
        const db = await this.getDB();
        const result = db.exec("SELECT COUNT(*) FROM products WHERE stock <= minStock;");
        if (result.length > 0 && result[0].values && result[0].values.length > 0) {
            return result[0].values[0][0];
        }
        return 0;
    }

    async getLowStockProducts() {
        const db = await this.getDB();
        const stmt = db.prepare(`
            SELECT id, name, category, stock, minStock, unit
            FROM products 
            WHERE stock <= minStock
            ORDER BY (CAST(stock AS REAL) / minStock) ASC, name ASC;
        `);
        const products = [];
        while (stmt.step()) {
            products.push(stmt.getAsObject());
        }
        stmt.free();
        return products;
    }

    async getTotalCapitalBuyPrice() {
        const db = await this.getDB();
        const result = db.exec("SELECT SUM(buyPrice * stock) AS totalCapital FROM products;");
        if (result.length > 0 && result[0].values && result[0].values.length > 0) {
            return result[0].values[0][0] || 0;
        }
        return 0;
    }

    async getTotalCapitalSellPrice() {
        const db = await this.getDB();
        const result = db.exec("SELECT SUM(sellPrice * stock) AS totalCapital FROM products;");
        if (result.length > 0 && result[0].values && result[0].values.length > 0) {
            return result[0].values[0][0] || 0;
        }
        return 0;
    }

    /**
     * Retrieves products that have not been sold since a specified date.
     * @param {string} sinceDate - Date in YYYY-MM-DD format to check for sales since.
     * @returns {Promise<Object[]>} Array of products that haven't been sold since the specified date.
     */
    async getUnsoldProductsSince(sinceDate) {
        const db = await this.getDB();

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(sinceDate)) {
            throw new Error('تاريخ البداية يجب أن يكون بصيغة YYYY-MM-DD.');
        }

        const stmt = db.prepare(`
            SELECT p.id, p.name, p.category, p.stock, p.unit, p.minStock, MAX(s.date) as lastSold
            FROM products p
            LEFT JOIN sale_items si ON p.id = si.productId
            LEFT JOIN sales s ON si.saleId = s.id
            GROUP BY p.id
            HAVING MAX(s.date) IS NULL OR MAX(s.date) < ?
            ORDER BY p.name;
        `, [sinceDate]);

        const products = [];
        while (stmt.step()) {
            products.push(stmt.getAsObject());
        }
        stmt.free();
        return products;
    }
}

export default ProductsDB;