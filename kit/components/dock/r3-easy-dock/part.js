VFKit.register('r3-easy-dock', root => {
  root.querySelector('.r3dk__book').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { from: 'r3-easy-dock' } }));
  });
  // Пока на экране бирка-заявка, док уходит вниз и не закрывает поля
  const form = document.querySelector('[data-slot="hero"] .r3h__tag, [data-slot="booking"] form');
  if (form && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => root.classList.toggle('is-away', e.isIntersecting), { threshold: 0.3 }).observe(form);
  }
});
