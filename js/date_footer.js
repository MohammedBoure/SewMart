function updateDateTimeInArabic() {
    const months = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const days = [
        "الأحد", "الإثنين", "الثلاثاء", "الأربعاء",
        "الخميس", "الجمعة", "السبت"
    ];
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const fullDateTime = `${dayName} ${day} ${monthName} ${year} - ${hours}:${minutes}:${seconds}`;
    document.getElementById('arabic-date-time').textContent = fullDateTime;
}
setInterval(updateDateTimeInArabic, 1000);
updateDateTimeInArabic(); 