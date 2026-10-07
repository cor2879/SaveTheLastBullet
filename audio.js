// Soundtrack and synthesized arcade effects. Audio begins only after a user gesture.
const AudioEngine=(()=>{
  const tracks=[['audio/save-the-last-bullet.mp3','Save the Last Bullet'],['audio/save-the-last-bullet-2.mp3','Save the Last Bullet 2'],['audio/lion-of-god-remix.mp3','Save the Last Bullet — Lion of God Remix']];
  let prefs={music:.38,effects:.55,muted:false};
  try{const saved=JSON.parse(localStorage.getItem('stlb-audio')||'{}');for(const k of ['music','effects'])if(Number.isFinite(saved[k]))prefs[k]=Math.max(0,Math.min(1,saved[k]));if(typeof saved.muted==='boolean')prefs.muted=saved.muted;}catch{}
  const music=new Audio();music.preload='none';
  let context,musicGain,effectsGain,noise,index=0,unlocked=false,active=0,failures=0,lastPlaying=false;
  const last=new Map();
  function save(){try{localStorage.setItem('stlb-audio',JSON.stringify(prefs));}catch{}}
  function apply(){music.muted=prefs.muted;if(musicGain)musicGain.gain.value=prefs.music;if(effectsGain)effectsGain.gain.value=prefs.muted?0:prefs.effects;
    const b=document.getElementById('btn-mute');b.textContent=prefs.muted?'🔇 Unmute':'🔊 Mute';b.setAttribute('aria-pressed',String(prefs.muted));}
  function load(){music.src=tracks[index][0];document.getElementById('audio-track').textContent=tracks[index][1];}
  function play(){if(unlocked&&!prefs.muted&&lastPlaying)music.play().catch(()=>{document.getElementById('audio-track').textContent='Tap a control to resume music';});}
  function unlock(){
    if(!unlocked){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      try{context=new AC();const compressor=context.createDynamicsCompressor();compressor.connect(context.destination);
        musicGain=context.createGain();musicGain.connect(compressor);context.createMediaElementSource(music).connect(musicGain);
        effectsGain=context.createGain();effectsGain.connect(compressor);
        noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
        unlocked=true;load();apply();}catch{return;}
    }
    if(context.state==='suspended')context.resume().catch(()=>{});play();
  }
  function sync(state){const wanted=!document.hidden&&state!=='title'&&state!=='paused';if(wanted!==lastPlaying){lastPlaying=wanted;if(wanted)play();else music.pause();}}
  function next(){index=(index+1)%tracks.length;load();play();}
  music.addEventListener('ended',()=>{failures=0;next();});
  music.addEventListener('error',()=>{if(++failures<tracks.length)next();else document.getElementById('audio-track').textContent='Music unavailable — effects still enabled';});
  music.addEventListener('playing',()=>{document.getElementById('audio-track').textContent=tracks[index][1];});
  function tone(f,end,duration,type='square',level=.13,delay=0){
    const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(level,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(effectsGain);active++;o.onended=()=>{active--;o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
  }
  function hiss(duration,frequency,level=.15){const t=context.currentTime,s=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain();s.buffer=noise;filter.type='lowpass';filter.frequency.value=frequency;g.gain.setValueAtTime(level,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);s.connect(filter);filter.connect(g);g.connect(effectsGain);active++;s.onended=()=>{active--;s.disconnect();filter.disconnect();g.disconnect();};s.start(t);s.stop(t+duration);}
  function sfx(kind){if(!unlocked||prefs.muted||prefs.effects===0||context.state!=='running'||document.hidden||active>=24)return;
    const now=context.currentTime,interval=kind==='laser'||kind==='flame'?.18:kind==='gun'?.045:.08;
    if(now-(last.get(kind)??-Infinity)<interval)return;last.set(kind,now);
    switch(kind){
      case 'gun':tone(1100,130,.09,'square',.10);break;
      case 'laser':tone(1800,350,.14,'sawtooth',.065);break;
      case 'frost':tone(1300,2400,.22,'sine',.10);hiss(.12,5000,.06);break;
      case 'mortar':tone(170,40,.22,'triangle',.25);hiss(.16,700,.18);break;
      case 'tesla':tone(800,70,.17,'sawtooth',.10);hiss(.13,4500,.10);break;
      case 'flame':hiss(.24,850,.18);break;
      case 'explosion':hiss(.4,950,.24);tone(110,25,.35,'triangle',.25);break;
      case 'place':tone(420,650,.10,'triangle');break;
      case 'upgrade':tone(500,500,.10,'triangle');tone(750,750,.12,'triangle',.13,.1);tone(1000,1000,.16,'triangle',.13,.2);break;
      case 'boss':tone(180,140,.3,'sawtooth',.17);tone(180,100,.5,'sawtooth',.17,.35);break;
      case 'wave':tone(350,700,.2,'square',.10);break;
    }
  }
  document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();lastPlaying=false;context?.suspend().catch(()=>{});}else if(typeof G!=='undefined')sync(G.state);});
  document.getElementById('btn-mute').addEventListener('click',()=>{prefs.muted=!prefs.muted;apply();save();if(prefs.muted)music.pause();else{unlock();play();}});
  document.getElementById('btn-next-track').addEventListener('click',()=>{unlock();failures=0;next();});
  for(const key of ['music','effects']){const slider=document.getElementById('volume-'+key);slider.value=prefs[key]*100;slider.addEventListener('input',()=>{prefs[key]=Number(slider.value)/100;apply();save();});}
  apply();return{sync,sfx};
})();
