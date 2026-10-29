// VF kit: запуск JS компонентов после сборки страницы
window.VFKit = window.VFKit || {
  parts: {},
  register(id, init) { this.parts[id] = init; },
  boot() {
    document.querySelectorAll('[data-part]').forEach(root => {
      const init = this.parts[root.dataset.part];
      if (!init || root.__vfBooted) return;
      root.__vfBooted = true;
      try { init(root); } catch (err) { console.error(`[VFKit] ${root.dataset.part}:`, err); }
    });
    // По умолчанию «записаться» прокручивает к слоту заявки, если его компонент не перехватил событие
    document.addEventListener('vf:book', e => {
      if (e.defaultPrevented) return;
      document.querySelector('[data-slot="booking"]')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  },
};
