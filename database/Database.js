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
            this.SQL = await initSqlJs({ locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm' });
            
            const savedDb = await this._loadDBFromIndexedDB();

            if (savedDb) {
                console.log("Loading database from IndexedDB...");
                this.db = new this.SQL.Database(savedDb);
            } else {
                console.log("Creating new database...");
                this.db = new this.SQL.Database();
                this.createTables(); // هذه الدالة ستضيف البيانات الأولية
                await this.save(); // حفظ الحالة الأولية الجديدة
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
        const categories = ['قماش', 'خيط', 'أدوات'];
        categories.forEach(category => {
            this.db.run(`INSERT OR IGNORE INTO categories (name) VALUES (?);`, [category]);
        });

        // Seed initial products (سيتم تشغيل هذا مرة واحدة فقط عند الإنشاء الأول)
        const initialProducts = [
            [1, '🌸 قماش وردي', 'قماش', 10, 15, 50, 'متر', 20],
            [2, '🧵 خيط أسود', 'خيط', 3, 5, 25, 'قطعة', 10],
            [3, '💙 قماش أزرق', 'قماش', 12, 18, 15, 'متر', 20],
            [4, '🪡 إبر خياطة', 'أدوات', 8, 12, 30, 'علبة', 5],
            [5, '🔘 أزرار ذهبية', 'أدوات', 0.5, 1, 200, 'قطعة', 50]
        ];
        initialProducts.forEach(p => {
            this.db.run(
                `INSERT INTO products (id, name, category, buyPrice, sellPrice, stock, unit, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                p
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

