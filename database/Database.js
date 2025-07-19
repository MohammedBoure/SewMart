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
        const categories = ['قماش', 'خيط', 'أدوات', 'إكسسوارات', 'أقمشة خاصة'];
        categories.forEach(category => {
            this.db.run(`INSERT OR IGNORE INTO categories (name) VALUES (?);`, [category]);
        });

        // Seed initial products
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
            [15, '⚪ قماش كتان أبيض', 'قماش', 14, 20, 35, 'متر', 15]
        ];
        initialProducts.forEach(p => {
            this.db.run(
                `INSERT INTO products (id, name, category, buyPrice, sellPrice, stock, unit, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                p
            );
        });

        // Seed initial sales with varied dates
        const initialSales = [
            ['2023-01-15', 25.0],  // مبيعات في 2023
            ['2023-06-20', 45.0],
            ['2023-12-10', 60.0],
            ['2024-03-05', 30.0],  // مبيعات في 2024
            ['2024-07-12', 55.0],
            ['2024-10-25', 70.0],
            ['2025-02-01', 40.0],  // مبيعات في 2025
            ['2025-04-18', 65.0],
            ['2025-07-10', 80.0]
        ];
        initialSales.forEach(sale => {
            this.db.run(
                `INSERT INTO sales (date, totalProfit) VALUES (?, ?);`,
                sale
            );
        });

        // Seed initial sale items (link products to sales)
        const initialSaleItems = [
            [1, 1, 5],  // بيع 5 متر من القماش الوردي في المبيعة 1
            [1, 2, 10], // بيع 10 خيط أسود
            [2, 3, 3],  // بيع 3 متر من القماش الأزرق
            [2, 4, 2],  // بيع 2 علبة إبر
            [3, 5, 50], // بيع 50 زر ذهبي
            [3, 6, 2],  // بيع 2 متر من القماش المخملي
            [4, 7, 5],  // بيع 5 خيط أبيض
            [4, 8, 4],  // بيع 4 خيط قطني ملون
            [5, 9, 3],  // بيع 3 متر من القماش الحريري
            [5, 10, 10], // بيع 10 علب دبابيس
            [6, 11, 1], // بيع مقص خياطة
            [6, 12, 20], // بيع 20 زر أحمر
            [7, 13, 6], // بيع 6 متر من القماش القطني الأخضر
            [7, 14, 8], // بيع 8 خيط أصفر
            [8, 15, 4], // بيع 4 متر من قماش الكتان الأبيض
            [8, 1, 2],  // بيع 2 متر من القماش الوردي
            [9, 2, 15], // بيع 15 خيط أسود
            [9, 5, 30]  // بيع 30 زر ذهبي
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