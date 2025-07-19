const initSqlJs = window.initSqlJs;
const INDEXEDDB_NAME = 'sqljs-database'; // اسم قاعدة البيانات في IndexedDB

class Database {
    constructor() {
        this.db = null;
        this.SQL = null;
        // هذا الوعد (Promise) يضمن عدم استخدام قاعدة البيانات قبل أن تكون جاهزة تمامًا
        this.initializationPromise = this.initialize(); 
    }

    /**
     * يقوم بتحميل قاعدة البيانات من IndexedDB أو إنشاء واحدة جديدة إذا لم تكن موجودة.
     */
    async initialize() {
        try {
            this.SQL = await initSqlJs({ locateFile: () => '/libs/sql.js/sql-wasm.wasm' });
            const savedDb = await this._loadDBFromIndexedDB();
            if (savedDb) {
                console.log("Loading database from IndexedDB...");
                this.db = new this.SQL.Database(savedDb);
            } else {
                console.log("Creating new database...");
                this.db = new this.SQL.Database();
                this.createTables();
                await this.save();
            }
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * دالة خاصة لتحميل قاعدة البيانات من IndexedDB.
     * @returns {Promise<Uint8Array|null>}
     */
    _loadDBFromIndexedDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open(INDEXEDDB_NAME, 1);
            request.onerror = (event) => {
                console.error("IndexedDB error:", request.error);
                resolve(null);
            };
            request.onupgradeneeded = (event) => {
                 const db = event.target.result;
                 if (!db.objectStoreNames.contains('database_file')) {
                     db.createObjectStore('database_file');
                 }
            };
            request.onsuccess = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('database_file')) {
                    db.close();
                    resolve(null);
                    return;
                }
                const transaction = db.transaction(['database_file'], 'readonly');
                const store = transaction.objectStore('database_file');
                const getReq = store.get('sqljs_db_blob');
                getReq.onsuccess = () => resolve(getReq.result || null);
                getReq.onerror = (event) => {
                    console.error("Failed to get from IndexedDB:", event.target.error);
                    resolve(null);
                }
            };
        });
    }

    /**
     * دالة عامة لحفظ الحالة الحالية لقاعدة البيانات في IndexedDB.
     */
    async save() {
        if (!this.db) return;
        
        const data = this.db.export(); // تصدير قاعدة البيانات كـ Uint8Array
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(INDEXEDDB_NAME, 1);
            request.onerror = reject;
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['database_file'], 'readwrite');
                const store = transaction.objectStore('database_file');
                const putReq = store.put(data, 'sqljs_db_blob');
                putReq.onsuccess = () => {
                    // console.log("Database saved to IndexedDB.");
                    resolve();
                };
                putReq.onerror = (event) => {
                    console.error("Failed to save to IndexedDB:", event.target.error);
                    reject(event.target.error);
                };
            };
        });
    }

    createTables() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                buyPrice REAL NOT NULL,
                sellPrice REAL NOT NULL,
                stock INTEGER NOT NULL,
                unit TEXT NOT NULL,
                minStock INTEGER NOT NULL
            );
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                totalProfit REAL NOT NULL
            );
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS sale_items (
                saleId INTEGER,
                productId INTEGER,
                qty INTEGER NOT NULL,
                PRIMARY KEY (saleId, productId),
                FOREIGN KEY (saleId) REFERENCES sales(id),
                FOREIGN KEY (productId) REFERENCES products(id)
            );
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                name TEXT PRIMARY KEY
            );
        `);

        // Seed initial categories
        const categories = ['قماش', 'خيط', 'أدوات', 'إكسسوارات', 'أقمشة خاصة', 'أزرار', 'معدات خياطة'];
        categories.forEach(category => {
            this.db.run(`INSERT OR IGNORE INTO categories (name) VALUES (?);`, [category]);
        });

        // Seed initial products (expanded list)
        const initialProducts = [
            [1, '🌸 قماش وردي', 'قماش', 10, 15, 50, 'متر', 20],
            [2, '🧵 خيط أسود', 'خيط', 3, 5, 25, 'قطعة', 10],
            [3, '💙 قماش أزرق', 'قماش', 12, 18, 15, 'متر', 20],
            [4, '🪡 إبر خياطة', 'أدوات', 8, 12, 30, 'علبة', 5],
            [5, '🔘 أزرار ذهبية', 'إكسسوارات', 0.5, 1, 200, 'قطعة', 50],
            [6, '🌟 قماش مخملي', 'أقمشة خاصة', 20, 30, 40, 'متر', 15],
            [7, '🧵 خيط أبيض', 'خيط', 3, 5, 30, 'قطعة', 10],
            [8, '🧶 خيط قطني ملون', 'خيط', 4, 6, 20, 'قطعة', 8],
            [9, '🌹 قماش حريري', 'أقمشة خاصة', 25, 35, 25, 'متر', 10],
            [10, '📍 دبابيس', 'أدوات', 5, 8, 100, 'علبة', 20],
            [11, '✂️ مقص خياطة', 'أدوات', 15, 22, 10, 'قطعة', 3],
            [12, '🔴 أزرار حمراء', 'إكسسوارات', 0.6, 1.2, 150, 'قطعة', 40],
            [13, '🟢 قماش قطني أخضر', 'قماش', 8, 12, 60, 'متر', 25],
            [14, '🟡 خيط أصفر', 'خيط', 3.5, 5.5, 28, 'قطعة', 12],
            [15, '⚪ قماش كتان أبيض', 'قماش', 14, 20, 35, 'متر', 15],
            [16, '🟣 قماش بنفسجي', 'قماش', 11, 16, 45, 'متر', 18],
            [17, '🧵 خيط أزرق', 'خيط', 3.2, 5.2, 35, 'قطعة', 15],
            [18, '🪢 خيط نايلون', 'خيط', 4.5, 6.5, 22, 'قطعة', 10],
            [19, '🖤 أزرار سوداء', 'إكسسوارات', 0.7, 1.3, 180, 'قطعة', 45],
            [20, '🧷 دبابيس أمان', 'أدوات', 6, 9, 80, 'علبة', 15],
            [21, '🌿 قماش قطني طبيعي', 'قماش', 9, 14, 55, 'متر', 20],
            [22, '✨ قماش ساتان', 'أقمشة خاصة', 22, 32, 30, 'متر', 12],
            [23, '🔩 براغي تزيين', 'إكسسوارات', 1, 2, 120, 'قطعة', 30],
            [24, '🪚 منشار خياطة', 'أدوات', 18, 25, 8, 'قطعة', 2],
            [25, '🟤 قماش صوفي', 'أقمشة خاصة', 28, 40, 20, 'متر', 8]
        ];
        initialProducts.forEach(p => {
            this.db.run(
                `INSERT INTO products (id, name, category, buyPrice, sellPrice, stock, unit, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                p
            );
        });

        // Seed initial sales with varied dates
        const initialSales = [
            // Today (2025-07-19)
            ['2025-07-19', 50.0], ['2025-07-19', 75.0], ['2025-07-19', 60.0], ['2025-07-19', 90.0], ['2025-07-19', 45.0],
            // Last week (2025-07-12 to 2025-07-18)
            ['2025-07-18', 55.0], ['2025-07-17', 65.0], ['2025-07-16', 70.0], ['2025-07-15', 40.0], ['2025-07-14', 80.0],
            ['2025-07-13', 45.0], ['2025-07-12', 60.0],
            // Last month (2025-06-19 to 2025-07-11)
            ['2025-07-10', 50.0], ['2025-07-05', 70.0], ['2025-07-01', 55.0], ['2025-06-28', 60.0], ['2025-06-25', 45.0],
            ['2025-06-20', 65.0],
            // Last year (2024-07-20 to 2025-06-18)
            ['2025-06-10', 50.0], ['2025-05-15', 70.0], ['2025-04-20', 55.0], ['2025-03-10', 60.0], ['2025-02-01', 45.0],
            ['2024-12-15', 65.0], ['2024-10-25', 50.0], ['2024-08-20', 70.0],
            // Previous years (2022-2024)
            ['2024-06-10', 60.0], ['2024-03-05', 45.0], ['2023-12-10', 55.0], ['2023-06-20', 50.0], ['2023-01-15', 65.0],
            ['2022-12-01', 70.0], ['2022-06-15', 45.0]
        ];
        initialSales.forEach(sale => {
            this.db.run(
                `INSERT INTO sales (date, totalProfit) VALUES (?, ?);`,
                sale
            );
        });

        // Seed initial sale items (link products to sales)
        const initialSaleItems = [
            // Today (2025-07-19, sales 1-5)
            [1, 1, 6], [1, 5, 40], [1, 10, 10], [1, 15, 5], [1, 20, 15],
            [2, 2, 12], [2, 6, 3], [2, 12, 30], [2, 17, 10], [2, 22, 4],
            [3, 3, 4], [3, 8, 8], [3, 13, 7], [3, 19, 25], [3, 24, 2],
            [4, 4, 3], [4, 9, 5], [4, 14, 12], [4, 21, 6], [4, 25, 3],
            [5, 7, 10], [5, 11, 2], [5, 16, 5], [5, 18, 8], [5, 23, 20],
            // Last week (2025-07-12 to 2025-07-18, sales 6-12)
            [6, 1, 4], [6, 5, 30], [6, 10, 8], [6, 15, 3], 
            [7, 2, 10], [7, 6, 2], [7, 12, 20], [7, 17, 8],
            [8, 3, 3], [8, 8, 6], [8, 13, 5], [8, 19, 15],
            [9, 4, 2], [9, 9, 3], [9, 14, 10], [9, 21, 4],
            [10, 7, 8], [10, 11, 1], [10, 16, 4], [10, 18, 6],
            [11, 1, 3], [11, 5, 20], [11, 10, 5], [11, 15, 2],
            [12, 2, 8], [12, 6, 1], [12, 12, 15], [12, 17, 6],
            // Last month (2025-06-19 to 2025-07-11, sales 13-18)
            [13, 3, 2], [13, 8, 5], [13, 13, 4], [13, 19, 10],
            [14, 4, 1], [14, 9, 2], [14, 14, 8], [14, 21, 3],
            [15, 7, 6], [15, 11, 1], [15, 16, 3], [15, 18, 5],
            [16, 1, 2], [16, 5, 15], [16, 10, 4], [16, 15, 2],
            [17, 2, 6], [17, 6, 1], [17, 12, 10], [17, 17, 5],
            [18, 3, 2], [18, 8, 4], [18, 13, 3], [18, 19, 8],
            // Last year (2024-07-20 to 2025-06-18, sales 19-26)
            [19, 4, 1], [19, 9, 2], [19, 14, 6], [19, 21, 2],
            [20, 7, 5], [20, 11, 1], [20, 16, 2], [20, 18, 4],
            [21, 1, 2], [21, 5, 10], [21, 10, 3], [21, 15, 1],
            [22, 2, 5], [22, 6, 1], [22, 12, 8], [22, 17, 4],
            [23, 3, 1], [23, 8, 3], [23, 13, 2], [23, 19, 5],
            [24, 4, 1], [24, 9, 1], [24, 14, 5], [24, 21, 2],
            [25, 7, 4], [25, 11, 1], [25, 16, 2], [25, 18, 3],
            [26, 1, 1], [26, 5, 8], [26, 10, 2], [26, 15, 1],
            // Previous years (2022-2024, sales 27-33)
            [27, 2, 4], [27, 6, 1], [27, 12, 6], [27, 17, 3],
            [28, 3, 1], [28, 8, 2], [28, 13, 2], [28, 19, 4],
            [29, 4, 1], [29, 9, 1], [29, 14, 4], [29, 21, 1],
            [30, 7, 3], [30, 11, 1], [30, 16, 1], [30, 18, 2],
            [31, 1, 1], [31, 5, 5], [31, 10, 2], [31, 15, 1],
            [32, 2, 3], [32, 6, 1], [32, 12, 5], [32, 17, 2],
            [33, 3, 1], [33, 8, 2], [33, 13, 1], [33, 19, 3]
        ];
        initialSaleItems.forEach(item => {
            this.db.run(
                `INSERT INTO sale_items (saleId, productId, qty) VALUES (?, ?, ?);`,
                item
            );
        });
    }

    async getDB() {
        await this.initializationPromise; // انتظر حتى يكتمل التهيئة
        if (!this.db) throw new Error('Database is not initialized or failed to initialize.');
        return this.db;
    }

    async backup() {
        const db = await this.getDB();
        const data = db.export();
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup.sql';
        a.click();
        URL.revokeObjectURL(url);
    }

    async restore(file) {
        const SQL = await initSqlJs({ locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm' });
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
            reader.onload = () => {
                try {
                    const arrayBuffer = reader.result;
                    const uInt8Array = new Uint8Array(arrayBuffer);
                    this.db = new SQL.Database(uInt8Array);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });

        await this.save(); // بعد الاستعادة الناجحة، يجب حفظ الحالة الجديدة
        console.log("Database restored and saved to IndexedDB.");
    }

    async deleteAllData() {
        const db = await this.getDB();
        db.run(`DELETE FROM products;`);
        db.run(`DELETE FROM sales;`);
        db.run(`DELETE FROM sale_items;`);
        db.run(`DELETE FROM categories;`);
        this.createTables(); // إعادة تعبئة البيانات الأساسية
        await this.save(); // حفظ حالة الحذف وإعادة التعيين
        console.log("All data deleted and database has been reset.");
    }
}

export default Database;