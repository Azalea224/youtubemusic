(function(){
  if(window.__ytmPollInjected)return;
  window.__ytmPollInjected=true;
  function scrapeAndReport(){
    try{
      if(document.visibilityState==='hidden')return;
      if(!window.ytm||typeof window.ytm.reportPlayback!=='function')return;
      function q(root,sel){
        if(!root)return null;
        var sr=root.shadowRoot||root._shadowRoot;
        if(sr){var r=sr.querySelector(sel);if(r)return r;}
        if(root.__shady_native_querySelector)return root.__shady_native_querySelector(sel);
        return root.querySelector(sel);
      }
      var bar=document.querySelector('ytmusic-player-bar');
      if(!bar)return;
      var t=q(bar,'.title.ytmusic-player-bar')||q(bar,'.title');
      var s=q(bar,'.ytmusic-player-bar.subtitle')||q(bar,'.subtitle');
      if(!s){var sr=bar.shadowRoot||bar._shadowRoot;if(sr){var links=sr.querySelectorAll('.subtitle a[href*="channel/"]');if(links&&links[0])s=links[0];}}
      var p=q(bar,'#play-pause-button')||q(bar,'.play-pause-button');
      var title=t?t.textContent.trim():'';
      var artist=s?s.textContent.trim():'';
      var state='paused';
      if(p){var l=(p.getAttribute('aria-label')||'').toLowerCase();state=l.indexOf('pause')>=0?'playing':'paused';}
      var prog=0,dur=0;
      var te=q(bar,'.time-info')||q(bar,'.time');
      if(te){
        var txt=te.textContent||'0:00 / 0:00';
        var pts=txt.split('/').map(function(x){return x.trim();});
        if(pts.length>=2){
          function parse(str){var parts=str.split(':').map(Number).reverse(),sec=0;for(var i=0;i<parts.length;i++)sec+=(parts[i]||0)*Math.pow(60,i);return sec;}
          prog=parse(pts[0]);dur=parse(pts[1]);
        }
      }
      var adTitleExact=title&&/^(Advertisement|Ad)$/i.test(title.trim());
      var adPhrases=/Sponsored|video will play after this ad/i;
      var isAd=!!(adTitleExact||(title&&adPhrases.test(title))||(artist&&adPhrases.test(artist)));
      if(title||artist||isAd){
        window.ytm.reportPlayback({title:title||'',artist:artist||'',album:'',state:state,progress:prog,duration:dur,isAdvertisement:isAd});
      }
    }catch(e){}
  }
  function tick(){
    if(document.visibilityState==='hidden')return;
    if(window.requestIdleCallback){
      requestIdleCallback(scrapeAndReport,{timeout:3000});
    }else{
      setTimeout(scrapeAndReport,50);
    }
  }
  tick();
  setInterval(tick,15000);
})();
