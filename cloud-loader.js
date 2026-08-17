/* KOPEYKA CLOUD BOOTSTRAP */
(function(){'use strict';
if(window.kopeykaCloud||document.querySelector('script[data-kopeyka-auth]'))return;
const s=document.createElement('script');
s.src='./auth-cloud.js?v=4';
s.async=false;
s.dataset.kopeykaAuth='1';
s.onload=()=>console.log('Kopeyka: cloud auth loaded');
s.onerror=e=>console.error('Kopeyka: cloud auth failed',e);
document.head.appendChild(s);
})();