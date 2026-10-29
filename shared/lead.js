// Общая логика заявки для всех вариантов VF swiss v2: маска телефона и проверка
window.VFLead = (() => {
  function formatPhone(value) {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1);
    d = d.slice(0, 10);
    if (!d) return '';
    let r = '+7 (' + d.slice(0, 3);
    if (d.length > 3) r += ') ' + d.slice(3, 6);
    if (d.length > 6) r += '-' + d.slice(6, 8);
    if (d.length > 8) r += '-' + d.slice(8, 10);
    return r;
  }

  // Проверка заявки перед отправкой.
  // data: { name, phone, contact: 'call'|'telegram', brand, description, photos: File[] }
  // Вернуть { ok: true } или { ok: false, field: 'имя поля', message: 'текст для клиента' }.
  function validateLead(data) {
    // TODO(human): правила проверки заявки
    return { ok: true };
  }

  // Подключает маску к полю телефона
  function bindPhone(input) {
    input.addEventListener('input', () => { input.value = formatPhone(input.value); });
  }

  return { formatPhone, validateLead, bindPhone };
})();
