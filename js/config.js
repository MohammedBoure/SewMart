initSqlJs({
  locateFile: file => `libs/sql.js/${file}`
}).then(SQL => {
  // استخدم SQL.Database() هنا
  console.log("SQLite initialized successfully");
});
