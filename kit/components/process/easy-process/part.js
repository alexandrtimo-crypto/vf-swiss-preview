// easy-process: колода «Как это будет» — кнопка «Дальше», свайп, стрелка вправо
VFKit.register('easy-process', root => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deck = root.querySelector('.deck'), dots = [...root.querySelectorAll('.dots i')];
  const cards = [...deck.querySelectorAll('.card')];
  let order = cards.slice();
  const tilts = [-3, 4, -6, 2];
  function layout() {
    order.forEach((c, i) => {
      c.style.zIndex = 10 - i;
      c.style.transform = i === 0 ? 'rotate(-1deg)' : `translate(${i * 8}px, ${i * 12}px) rotate(${tilts[i]}deg) scale(${1 - i * 0.04})`;
      c.style.opacity = i > 3 ? 0 : 1;
      c.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      c.classList.toggle('is-back', i !== 0);
    });
    const cur = cards.indexOf(order[0]);
    dots.forEach((d, i) => d.classList.toggle('on', i === cur));
  }
  function next(dir = 1) {
    const top = order[0];
    top.style.transform = `translate(${dir * 130}%, -30px) rotate(${dir * 24}deg)`;
    top.style.zIndex = 20;
    setTimeout(() => { order.push(order.shift()); layout(); }, RM ? 0 : 260);
  }
  layout();
  root.querySelector('.deck__next').addEventListener('click', () => next(1));
  // свайп
  let sx = 0, dx = 0, drag = null;
  deck.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    drag = order[0]; sx = e.clientX; dx = 0;
    drag.classList.add('is-drag'); drag.setPointerCapture(e.pointerId);
  });
  deck.addEventListener('pointermove', e => {
    if (!drag) return;
    dx = e.clientX - sx;
    drag.style.transform = `translate(${dx}px, ${Math.abs(dx) * -0.08}px) rotate(${dx / 14}deg)`;
  });
  const end = () => {
    if (!drag) return;
    drag.classList.remove('is-drag');
    if (Math.abs(dx) > 80) next(Math.sign(dx)); else layout();
    drag = null;
  };
  deck.addEventListener('pointerup', end); deck.addEventListener('pointercancel', end);
  deck.addEventListener('keydown', e => { if (e.key === 'ArrowRight') next(1); });
});
