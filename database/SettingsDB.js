
import Database from './Database.js';

class SettingsDB extends Database {
    // يرث دوال backup, restore, deleteAllData من الكلاس الأساسي Database.
    // كل منطق الحفظ والاستمرارية تتم معالجته في الكلاس الأساسي.
}

export default SettingsDB;
