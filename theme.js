(function(){
  const KEY='quackerShopTheme';
  function applyTheme(theme){
    const light=theme==='light';
    document.body.classList.toggle('light-mode',light);
    const b=document.getElementById('themeToggle');
    if(b){
      const icon=b.querySelector('.theme-icon'), label=b.querySelector('.theme-label');
      if(icon) icon.textContent=light?'🌙':'☀️';
      if(label) label.textContent=light?'Dark':'Light';
      const text=light?'Switch to dark mode':'Switch to light mode';
      b.setAttribute('aria-label',text); b.title=text;
    }
  }
  function initTheme(){
    let saved='dark';
    try{saved=localStorage.getItem(KEY)||'dark'}catch(e){}
    applyTheme(saved);
    const b=document.getElementById('themeToggle');
    if(b && !b.dataset.themeBound){
      b.dataset.themeBound='1';
      b.addEventListener('click',function(e){
        e.preventDefault(); e.stopPropagation();
        const next=document.body.classList.contains('light-mode')?'dark':'light';
        try{localStorage.setItem(KEY,next)}catch(err){}
        applyTheme(next);
      });
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initTheme); else initTheme();
})();

document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){if(typeof loadAllReviews==='function')loadAllReviews();},1400);});
