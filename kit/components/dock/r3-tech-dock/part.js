VFKit.register('r3-tech-dock', root => {
  root.querySelector('.r3dk__book').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  });
  // пока на экране форма заявки, док уходит вниз — не закрывает поля
  const form = document.querySelector('[data-slot="booking"] form');
  if (form && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => root.classList.toggle('is-away', e.isIntersecting), { threshold: 0.12 }).observe(form);
  }
});
