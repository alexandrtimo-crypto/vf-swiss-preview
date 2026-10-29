// «Скопировать адрес»: буфер обмена с запасным путём, подтверждение в aria-live
VFKit.register('r3-easy-contacts', root => {
  const btn = root.querySelector('.r3ct__copy');
  const label = btn.querySelector('span');
  const icon = btn.querySelector('.vf-i');
  const out = root.querySelector('.r3ct__copied');
  const idle = label.textContent;
  let timer = 0;
  const ok = () => {
    label.textContent = 'Адрес скопирован'; icon.className = 'vf-i vf-i--check'; btn.classList.add('is-done');
    out.classList.remove('is-err'); out.textContent = 'Адрес скопирован в буфер обмена';
    document.dispatchEvent(new CustomEvent('vf:sound', { detail: { name: 'success' } }));
    clearTimeout(timer);
    timer = setTimeout(() => { label.textContent = idle; icon.className = 'vf-i vf-i--copy'; btn.classList.remove('is-done'); out.textContent = ''; }, 2200);
  };
  const fail = () => { out.classList.add('is-err'); out.textContent = 'Не удалось скопировать — выделите адрес и скопируйте вручную.'; };
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return ok(); }
      throw 0;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      let done = false;
      try { done = document.execCommand('copy'); } catch {}
      ta.remove(); btn.focus();
      done ? ok() : fail();
    }
  });
});
