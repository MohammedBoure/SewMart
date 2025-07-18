import Database from './Database.js';

class SalesDB extends Database {
    /**
     * Retrieves all sales with their items, ordered by date descending.
     * @returns {Promise<Object[]>} Array of sales with their items.
     */
    async getAllSales() {
        const db = await this.getDB();
        const sales = [];
        const stmt = db.prepare(`SELECT * FROM sales ORDER BY date DESC;`);
        while (stmt.step()) {
            const sale = stmt.getAsObject();
            const itemsStmt = db.prepare(`
                SELECT si.productId, si.qty, p.name 
                FROM sale_items si
                JOIN products p ON si.productId = p.id
                WHERE si.saleId = ?;
            `, [sale.id]);
            const items = [];
            while (itemsStmt.step()) {
                items.push(itemsStmt.getAsObject());
            }
            itemsStmt.free();
            sale.items = items;
            sales.push(sale);
        }
        stmt.free();
        return sales;
    }

    /**
     * Retrieves sales with pagination and optional date range filtering.
     * @param {number} [page=1] - Page number (1-based).
     * @param {number} [perPage=10] - Number of sales per page.
     * @param {string} [startDate] - Start date in YYYY-MM-DD format.
     * @param {string} [endDate] - End date in YYYY-MM-DD format.
     * @returns {Promise<{sales: Object[], total: number}>} Object containing paginated sales and total count.
     */
    async getSales({ page = 1, perPage = 10, startDate, endDate } = {}) {
        const db = await this.getDB();

        // Validate pagination parameters
        if (!Number.isInteger(page) || page < 1) {
            throw new Error('رقم الصفحة يجب أن يكون عددًا صحيحًا أكبر من 0.');
        }
        if (!Number.isInteger(perPage) || perPage < 1) {
            throw new Error('عدد العناصر لكل صفحة يجب أن يكون عددًا صحيحًا أكبر من 0.');
        }

        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (startDate && !dateRegex.test(startDate)) {
            throw new Error('تاريخ البداية يجب أن يكون بصيغة YYYY-MM-DD.');
        }
        if (endDate && !dateRegex.test(endDate)) {
            throw new Error('تاريخ النهاية يجب أن يكون بصيغة YYYY-MM-DD.');
        }
        if (startDate && endDate && startDate > endDate) {
            throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية.');
        }

        // Build the WHERE clause for date filtering
        let whereClause = '';
        const params = [];
        if (startDate || endDate) {
            whereClause = 'WHERE ';
            if (startDate) {
                whereClause += 'date >= ?';
                params.push(startDate);
            }
            if (endDate) {
                if (startDate) whereClause += ' AND ';
                whereClause += 'date <= ?';
                params.push(endDate);
            }
        }

        // Get total count of sales
        const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM sales ${whereClause};`, params);
        const total = countStmt.step() ? countStmt.getAsObject().total : 0;
        countStmt.free();

        // Calculate offset
        const offset = (page - 1) * perPage;

        // Fetch paginated sales
        const sales = [];
        const salesStmt = db.prepare(`
            SELECT * FROM sales 
            ${whereClause}
            ORDER BY date DESC 
            LIMIT ? OFFSET ?;
        `, [...params, perPage, offset]);
        while (salesStmt.step()) {
            const sale = salesStmt.getAsObject();
            const itemsStmt = db.prepare(`
                SELECT si.productId, si.qty, p.name 
                FROM sale_items si
                JOIN products p ON si.productId = p.id
                WHERE si.saleId = ?;
            `, [sale.id]);
            const items = [];
            while (itemsStmt.step()) {
                items.push(itemsStmt.getAsObject());
            }
            itemsStmt.free();
            sale.items = items;
            sales.push(sale);
        }
        salesStmt.free();

        return { sales, total };
    }

    /**
     * Adds a new sale and updates product stock.
     * @param {Object[]} saleCart - Array of items with id and qty.
     * @returns {Promise<Object>} The created sale object.
     */
    async addSale(saleCart) {
        const db = await this.getDB();

        const getProductByIdSync = (id) => {
            const stmt = db.prepare(`SELECT * FROM products WHERE id = ?;`, [id]);
            const result = stmt.step() ? stmt.getAsObject() : null;
            stmt.free();
            return result;
        };
        
        const totalProfit = saleCart.reduce((sum, item) => {
            const product = getProductByIdSync(item.id);
            if (!product) return sum;
            return sum + (item.qty * (product.sellPrice - product.buyPrice));
        }, 0);

        const saleId = Date.now();
        const date = new Date().toISOString().split('T')[0];
        
        db.run(`INSERT INTO sales (id, date, totalProfit) VALUES (?, ?, ?);`, [saleId, date, totalProfit]);

        for (const item of saleCart) {
            db.run(`INSERT INTO sale_items (saleId, productId, qty) VALUES (?, ?, ?);`, [saleId, item.id, item.qty]);
            db.run(`UPDATE products SET stock = stock - ? WHERE id = ?;`, [item.qty, item.id]);
        }

        await this.save();

        return { id: saleId, date, totalProfit, items: saleCart };
    }

    /**
     * Retrieves a product by ID.
     * @param {number} id - Product ID.
     * @returns {Promise<Object|null>} Product object or null if not found.
     */
    async getProductById(id) {
        const db = await this.getDB();
        const stmt = db.prepare(`SELECT * FROM products WHERE id = ?;`, [id]);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
    }

    /**
     * Helper function to aggregate data by time period.
     * @param {'SUM(totalProfit)' | 'COUNT(id)'} aggregation - Aggregation operation (sum or count).
     * @param {'totalProfit' | 'salesCount'} resultColumnName - Result column name.
     * @param {'%Y-%m-%d' | '%Y-%W' | '%Y-%m' | '%Y'} format - Date format for grouping.
     * @returns {Promise<Object[]>}
     * @private
     */
    async _getAggregatedDataByPeriod(aggregation, resultColumnName, format) {
        const db = await this.getDB();
        const query = `
            SELECT 
                strftime(?, date) as period, 
                ${aggregation} as ${resultColumnName}
            FROM sales 
            GROUP BY period 
            ORDER BY period DESC;
        `;
        const stmt = db.prepare(query, [format]);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    /**
     * Returns profits grouped by day.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023-10-27', totalProfit: 150.50 }]
     */
    async getProfitByDay() {
        return this._getAggregatedDataByPeriod('SUM(totalProfit)', 'totalProfit', '%Y-%m-%d');
    }

    /**
     * Returns profits grouped by week.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023-43', totalProfit: 800.00 }]
     */
    async getProfitByWeek() {
        return this._getAggregatedDataByPeriod('SUM(totalProfit)', 'totalProfit', '%Y-%W');
    }

    /**
     * Returns profits grouped by month.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023-10', totalProfit: 2500.75 }]
     */
    async getProfitByMonth() {
        return this._getAggregatedDataByPeriod('SUM(totalProfit)', 'totalProfit', '%Y-%m');
    }

    /**
     * Returns profits grouped by year.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023', totalProfit: 30000.00 }]
     */
    async getProfitByYear() {
        return this._getAggregatedDataByPeriod('SUM(totalProfit)', 'totalProfit', '%Y');
    }

    /**
     * Returns sales count grouped by day.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023-10-27', salesCount: 5 }]
     */
    async getSalesCountByDay() {
        return this._getAggregatedDataByPeriod('COUNT(id)', 'salesCount', '%Y-%m-%d');
    }

    /**
     * Returns sales count grouped by week.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023-43', salesCount: 25 }]
     */
    async getSalesCountByWeek() {
        return this._getAggregatedDataByPeriod('COUNT(id)', 'salesCount', '%Y-%W');
    }

    /**
     * Returns sales count grouped by month.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023-10', salesCount: 120 }]
     */
    async getSalesCountByMonth() {
        return this._getAggregatedDataByPeriod('COUNT(id)', 'salesCount', '%Y-%m');
    }

    /**
     * Returns sales count grouped by year.
     * @returns {Promise<Object[]>} e.g., [{ period: '2023', salesCount: 1500 }]
     */
    async getSalesCountByYear() {
        return this._getAggregatedDataByPeriod('COUNT(id)', 'salesCount', '%Y');
    }

    /**
     * Returns detailed information about a specific sale, including total price and profit.
     * @param {number} saleId - Sale ID.
     * @returns {Promise<Object|null>} Object with total price and profit, or null if sale not found.
     */
    async getSaleDetails(saleId) {
        const db = await this.getDB();
        
        // Get total profit directly from sales table
        const saleStmt = db.prepare('SELECT totalProfit FROM sales WHERE id = ?;', [saleId]);
        const saleResult = saleStmt.step() ? saleStmt.getAsObject() : null;
        saleStmt.free();

        if (!saleResult) {
            return null; // Sale not found
        }

        // Calculate total selling price
        const itemsStmt = db.prepare(`
            SELECT SUM(p.sellPrice * si.qty) as totalPrice
            FROM sale_items si
            JOIN products p ON si.productId = p.id
            WHERE si.saleId = ?;
        `, [saleId]);
        const itemsResult = itemsStmt.step() ? itemsStmt.getAsObject() : { totalPrice: 0 };
        itemsStmt.free();

        return {
            saleId: saleId,
            totalPrice: itemsResult.totalPrice,
            totalProfit: saleResult.totalProfit
        };
    }
}

export default SalesDB;