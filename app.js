let token=localStorage.getItem("sr_token"),mode="login",passage=null,timer=null,remaining=300,started=false,paused=false,backspaces=0,focusLosses=0;
const $=id=>document.getElementById(id);
const rows=[["`","1","2","3","4","5","6","7","8","9","0","-","=","Backspace"],["Tab","Q","W","E","R","T","Y","U","I","O","P","[","]","\\"],["Caps","A","S","D","F","G","H","J","K","L",";","'","Enter"],["Shift","Z","X","C","V","B","N","M",",",".","/","Shift"],["Ctrl","Alt","Space","Alt","Ctrl"]];
function api(u,o={}){o.headers={...(o.headers||{}),"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})};return fetch(u,o).then(async r=>{let text=await r.text(),d;try{d=JSON.parse(text)}catch(e){throw Error(`Server returned non-JSON (${r.status}) for ${u}`)}if(!r.ok)throw Error(d.error||"Request failed");return d})}
function openAuth(){$("modal").classList.remove("hidden")}function closeAuth(){$("modal").classList.add("hidden")}
$("switch").onclick=()=>{mode=mode==="login"?"register":"login";$("mt").textContent=mode==="register"?"Create account":"Login";$("auth").textContent=mode==="register"?"Register":"Login";$("name").style.display=mode==="register"?"block":"none"}
$("auth").onclick=async()=>{try{let b={email:$("email").value,password:$("pass").value};if(mode==="register")b.name=$("name").value;let d=await api(mode==="register"?"/api/register":"/api/login",{method:"POST",body:JSON.stringify(b)});token=d.token;localStorage.setItem("sr_token",token);localStorage.setItem("sr_user",JSON.stringify(d.user));closeAuth();boot();showAdminIfNeeded()}catch(e){$("msg").textContent=e.message}}
function buildKeyboard(){let k=$("keyboard");k.innerHTML=rows.map(r=>`<div class="keyrow">${r.map(x=>`<div class="key ${x==="Space"?"space":(x.length>1?"wide":"")}" data-key="${esc(x.toLowerCase())}">${esc(x)}</div>`).join("")}</div>`).join("")}
function keyDown(v){document.querySelectorAll(".key").forEach(k=>k.classList.remove("active"));let x=v===" "?"space":v.toLowerCase();let k=[...document.querySelectorAll(".key")].find(z=>z.dataset.key===x);if(k)k.classList.add("active")}
function keyUp(){document.querySelectorAll(".key").forEach(k=>k.classList.remove("active"))}
document.addEventListener("keydown",e=>{if(started&&!paused)keyDown(e.key)});document.addEventListener("keyup",keyUp);
async function newPassage(){let q=new URLSearchParams({language:$("lang").value,difficulty:$("difficulty").value});if($("category").value!=="All")q.set("category",$("category").value);try{let d=await api("/api/passages?"+q);let list=d.passages||[];if(!list.length)throw Error("No typing passage found");passage=list[Math.floor(Math.random()*list.length)];$("passageTitle").textContent=passage.title;$("passageTag").textContent=`${passage.difficulty} • ${passage.category}`;$("target").textContent=passage.text;reset()}catch(e){alert(e.message)}}
$("newPassage").onclick=newPassage;
["lang","difficulty","category"].forEach(id=>$(id).onchange=newPassage);
$("duration").onchange=()=>{remaining=+$("duration").value;clock()};
function countErrors(t,p){let e=0;for(let i=0;i<t.length;i++)if(t[i]!==p[i])e++;return e}
function render(){if(!passage)return;let t=$("input").value,p=passage.text,html="";for(let i=0;i<p.length;i++){let c=p[i],typed=t[i],cl=typed===undefined?"missing":typed===c?"correct":"wrong";if(i===t.length&&!paused)cl+=" current";html+=`<span class="${cl}">${esc(c)}</span>`}$("target").innerHTML=html;let pct=Math.min(100,t.length/p.length*100);$("progress").style.width=pct+"%";let duration=Math.max(1,+$("duration").value-remaining),min=duration/60,chars=t.length,errors=countErrors(t,p),gross=(chars/5)/min,net=Math.max(0,gross-errors/min),cpm=chars/min,acc=chars?Math.max(0,(chars-errors)/chars*100):100;$("gross").textContent=Math.round(gross);$("net").textContent=Math.round(net);$("cpm").textContent=Math.round(cpm);$("acc").textContent=acc.toFixed(1)+"%";$("err").textContent=errors;$("back").textContent=backspaces;$("focus").textContent=focusLosses}
$("input").oninput=()=>{if(!started||paused)return;render();if($("input").value.length>=passage.text.length)finish()};
$("input").onkeydown=e=>{if(e.key==="Backspace")backspaces++};$("input").onpaste=e=>e.preventDefault();$("input").oncut=e=>e.preventDefault();
window.addEventListener("blur",()=>{if(started&&!paused){focusLosses++;render()}});
function clock(){let m=Math.floor(remaining/60),s=remaining%60;$("time").textContent=`${m}:${String(s).padStart(2,"0")}`}
function reset(){clearInterval(timer);started=false;paused=false;remaining=+$("duration").value;backspaces=0;focusLosses=0;$("input").value="";$("input").disabled=true;$("start").disabled=false;$("pause").textContent="Pause";$("result").innerHTML="";clock();render()}
$("reset").onclick=reset;
$("start").onclick=()=>{if(!token)return openAuth();if(!passage)return newPassage();if(started)return;started=true;paused=false;remaining=+$("duration").value;$("input").disabled=false;$("start").disabled=true;$("input").focus();timer=setInterval(()=>{if(!paused){remaining--;clock();render();if(remaining<=0)finish()}},1000)}
$("pause").onclick=()=>{if(!started)return;paused=!paused;$("pause").textContent=paused?"Resume":"Pause";render()}
async function finish(){clearInterval(timer);started=false;$("input").disabled=true;render();let t=$("input").value,p=passage.text,duration=Math.max(1,+$("duration").value-remaining),errors=countErrors(t,p),min=duration/60,chars=t.length,gross=(chars/5)/min,net=Math.max(0,gross-errors/min),cpm=chars/min,acc=chars?Math.max(0,(chars-errors)/chars*100):100;try{await api("/api/results",{method:"POST",body:JSON.stringify({test_type:"Professional Practice",language:passage.language,duration,chars,errors,gross_wpm:gross,net_wpm:net,cpm,accuracy:acc,backspaces,focusLosses,category:passage.category,difficulty:passage.difficulty,passageTitle:passage.title})});$("result").innerHTML=`<div class="resultCard"><h2>🎉 Test Complete</h2><p>${esc(passage.title)} • ${passage.difficulty} • ${passage.category}</p><div class="resultGrid"><div>Net WPM<b>${Math.round(net)}</b></div><div>Gross WPM<b>${Math.round(gross)}</b></div><div>Accuracy<b>${acc.toFixed(1)}%</b></div><div>CPM<b>${Math.round(cpm)}</b></div></div><p>Errors: ${errors} • Backspaces: ${backspaces} • Focus losses: ${focusLosses}</p><button onclick="window.print()">Print Result</button></div>`;loadDashboard()}catch(e){alert(e.message)}}
async function loadDashboard(){if(!token)return;try{let d=await api("/api/dashboard"),s=d.stats;$("dash").innerHTML=`<div><small>TESTS</small><strong>${s.totalTests}</strong></div><div><small>BEST NET WPM</small><strong>${Math.round(s.bestWpm)}</strong></div><div><small>AVG NET WPM</small><strong>${s.avgWpm.toFixed(1)}</strong></div><div><small>AVG ACCURACY</small><strong>${s.accuracy.toFixed(1)}%</strong></div>`;$("recent").innerHTML=d.recent.map(x=>`<div class="activity"><span>${esc(x.passage_title||x.test_type)}</span><b>${Math.round(x.net_wpm)} WPM</b><span>${x.accuracy.toFixed(1)}%</span><span>${esc(x.difficulty)}</span><span>${x.errors} errors</span></div>`).join("")}catch{}}
async function loadExams(){try{let d=await api("/api/exams");$("examsGrid").innerHTML=d.exams.map(e=>`<div class="exam"><span class="tag">${e.language}</span><h3>${esc(e.name)}</h3><p>${esc(e.description)}</p><b>${e.required_wpm} WPM</b> • ${e.required_accuracy}%</div>`).join("")}catch{}}
async function boot(){
 try{
  let m=await api("/api/me");
  localStorage.setItem("sr_user",JSON.stringify(m.user));
  $("user").textContent=m.user.name+(m.user.role==="admin"?" • ADMIN":"");
  if(m.user.role==="admin"){
    const link=document.getElementById("adminLink");
    if(link)link.classList.remove("hidden");
  }
  loadDashboard();
 }catch(e){}
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
buildKeyboard();newPassage();loadExams();boot();
/* ===== Phase 8: Full Exam System ===== */
let activeExam=null,examTimer=null,examRemaining=0,examStartedAt=0,examFocusLosses=0,examBackspaces=0,examSubmitted=false;
async function loadExamCenter(){
 try{
  let d=await api("/api/exams");
  $("examSelect").innerHTML=d.exams.map(e=>`<option value="${e.id}">${esc(e.name)} — ${esc(e.language)} — ${e.duration/60} min</option>`).join("");
 }catch{}
}
$("startExam").onclick=async()=>{
 if(!token)return openAuth();
 let name=$("candidateName").value.trim(),roll=$("rollNo").value.trim(),id=$("examSelect").value;
 if(!name||!roll){alert("Candidate name and roll number required.");return}
 try{
  let d=await api("/api/exams/"+id+"/full");activeExam=d;examSubmitted=false;examFocusLosses=0;examBackspaces=0;
  $("examSetup").classList.add("hidden");$("examScreen").classList.remove("hidden");$("examResult").innerHTML="";
  $("examStatus").textContent="LIVE EXAM";$("examName").textContent=d.exam.name+" • "+d.exam.organization;
  $("examRules").textContent=`5 minutes • Minimum: ${d.exam.language==='English'?150:125} words • ${d.exam.required_wpm} WPM + ${d.exam.required_accuracy}% accuracy`;
  $("examCandidate").textContent=name;$("examRoll").textContent=roll;$("examTarget").textContent=d.passage.text;
  $("examInput").value="";$("examInput").disabled=false;$("examInput").focus();
  examRemaining=d.exam.duration;examStartedAt=Date.now();examClock();renderExam();
  clearInterval(examTimer);examTimer=setInterval(()=>{examRemaining--;examClock();renderExam();if(examRemaining<=0)submitExam(true)},1000);
 }catch(e){alert(e.message)}
};
function examClock(){let m=Math.floor(examRemaining/60),s=examRemaining%60;$("examClock").textContent=`${m}:${String(s).padStart(2,"0")}`}
function renderExam(){
 if(!activeExam)return;let t=$("examInput").value,p=activeExam.passage.text,errors=countErrors(t,p),duration=activeExam.exam.duration,min=duration/60,gross=(t.length/5)/min,net=Math.max(0,gross-errors/min),acc=t.length?Math.max(0,(t.length-errors)/t.length*100):100;
 $("examNet").textContent=Math.round(net);$("examAcc").textContent=acc.toFixed(1)+"%";$("examErr").textContent=errors;$("examFocus").textContent=examFocusLosses;
 let h="";for(let i=0;i<p.length;i++){let c=p[i],v=t[i],cl=v===undefined?"missing":v===c?"correct":"wrong";if(i===t.length)cl+=" current";h+=`<span class="${cl}">${esc(c)}</span>`}$("examTarget").innerHTML=h;
}
$("examInput").oninput=()=>{if(!activeExam||examSubmitted)return;renderExam()};
$("examInput").onkeydown=e=>{if(e.key==="Backspace")examBackspaces++};
["paste","cut","contextmenu"].forEach(ev=>$("examInput").addEventListener(ev,e=>e.preventDefault()));
window.addEventListener("blur",()=>{if(activeExam&&!examSubmitted){examFocusLosses++;renderExam()}});
async function submitExam(auto=false){
 if(!activeExam||examSubmitted)return;
 examSubmitted=true;clearInterval(examTimer);$("examInput").disabled=true;
 let t=$("examInput").value,p=activeExam.passage.text,duration=activeExam.exam.duration,errors=countErrors(t,p);
 try{
  let d=await api("/api/exams/"+activeExam.exam.id+"/submit",{method:"POST",body:JSON.stringify({
   candidateName:$("candidateName").value.trim(),rollNo:$("rollNo").value.trim(),duration,chars:t.length,errors,
   backspaces:examBackspaces,focusLosses:examFocusLosses,passageTitle:activeExam.passage.title
  })});
  let cls=d.passed?"":"fail";
  $("examStatus").textContent=d.passed?"PASSED":"NOT PASSED";
  $("examResult").innerHTML=`<div class="certificate ${cls}" id="printCertificate"><h1>SR TYPING</h1><h3>${d.passed?"CERTIFICATE OF QUALIFICATION":"EXAM RESULT"}</h3><p>This certifies that</p><h2>${esc(d.candidateName)}</h2><p>Roll No: <b>${esc(d.rollNo)}</b></p><p>${esc(d.exam.name)} — ${esc(d.exam.organization)}</p><div class="resultGrid"><div>Net WPM<b>${Math.round(d.score.net_wpm)}</b></div><div>Accuracy<b>${d.score.accuracy.toFixed(1)}%</b></div><div>Errors<b>${errors}</b></div><div>CPM<b>${Math.round(d.score.cpm)}</b></div></div><p>Required: ${d.exam.required_wpm} WPM and ${d.exam.required_accuracy}% accuracy</p><p class="certNo">Certificate No: ${d.certificateNo}</p><button onclick="window.print()">Print / Save PDF</button><button class="secondary" onclick="resetExam()">New Exam</button></div>`;
 }catch(e){alert(e.message)}
}
$("submitExam").onclick=()=>submitExam(false);
function resetExam(){activeExam=null;examSubmitted=false;clearInterval(examTimer);$("examScreen").classList.add("hidden");$("examSetup").classList.remove("hidden");$("examStatus").textContent="Ready";$("examResult").innerHTML=""}
loadExamCenter();

/* ===== Phase 9 Complete Website Layer ===== */
async function loadSiteContent(){
 try{
  const d=await api("/api/site-content"),c=d.content||{};
  if(c.hero_title)$("heroTitle").textContent=c.hero_title;
  if(c.hero_subtitle)$("heroSubtitle").textContent=c.hero_subtitle;
  if(c.announcement)$("announcement").textContent=c.announcement;
  if(c.about)$("aboutText").textContent=c.about;
  if(c.contact_email)$("contactEmail").textContent=c.contact_email;
 }catch{}
}
async function loadExamHistory(){
 if(!token)return;
 try{
  let d=await api("/api/exam-attempts/me");
  $("examHistory").innerHTML=d.attempts.length?d.attempts.map(x=>`<div class="activity"><span>${esc(x.exam_name)}</span><b>${x.passed?"PASSED":"FAILED"}</b><span>${Math.round(x.net_wpm)} WPM</span><span>${x.accuracy.toFixed(1)}%</span><span>#${x.id}</span></div>`).join(""):"<p>No exam attempts yet.</p>";
 }catch{}
}
const oldBoot=boot;
boot=async function(){await oldBoot();loadSiteContent();loadExamHistory();if(token){$("authBtn").textContent="Logout";$("authBtn").onclick=()=>{localStorage.removeItem("sr_token");localStorage.removeItem("sr_user");location.reload()}}else{$("authBtn").textContent="Login";$("authBtn").onclick=openAuth}};
loadSiteContent();loadExamHistory();

/* ===== Admin Passage Manager ===== */
function showAdminIfNeeded(){
 try{
  const u=JSON.parse(localStorage.getItem("sr_user")||"null");
  if(u&&u.role==="admin"){
    const link=document.getElementById("adminLink"), panel=document.getElementById("adminPanel");
    if(link)link.classList.remove("hidden");
    if(location.hash==="#adminPanel"&&panel){panel.classList.remove("hidden");loadAdminPassages();}
  }
 }catch{}
}
async function loadAdminPassages(){
 const box=document.getElementById("adminPassages"); if(!box)return;
 try{
  const d=await api("/api/admin/passages");
  box.innerHTML=(d.passages||[]).map(p=>`<div class="adminRow">
   <div><b>${esc(p.title)}</b><small>${esc(p.language)} · ${esc(p.difficulty)} · ${esc(p.category)}</small></div>
   <span>${p.word_count||String(p.text||"").trim().split(/\s+/).filter(Boolean).length} words</span>
   <span>${p.min_words|| (p.language==="English"?150:125)} min</span>
   <span>#${p.id}</span>
   <button class="danger" onclick="deleteAdminPassage(${p.id})">Delete</button>
  </div>`).join("")||"<p>No passages yet.</p>";
 }catch(e){box.innerHTML=`<p>${esc(e.message)}</p>`}
}
async function deleteAdminPassage(id){
 if(!confirm("Delete this passage?"))return;
 try{await api("/api/admin/passages/"+id,{method:"DELETE"});loadAdminPassages();}catch(e){alert(e.message)}
}
function updatePassageCounter(){
 const lang=document.getElementById("pLang"),text=document.getElementById("pText"),count=document.getElementById("pCount"),req=document.getElementById("pRequirement");
 if(!lang||!text)return;
 const n=text.value.trim()?text.value.trim().split(/\s+/).filter(Boolean).length:0;
 const min=lang.value==="English"?150:125;
 count.textContent=n+" words";req.textContent="Minimum "+min+" words";
 const box=count.parentElement;box.classList.toggle("ok",n>=min);box.classList.toggle("bad",n<min);
}
document.addEventListener("DOMContentLoaded",()=>{
 const lang=document.getElementById("pLang"),text=document.getElementById("pText"),form=document.getElementById("passageForm");
 if(lang)lang.addEventListener("change",updatePassageCounter);
 if(text)text.addEventListener("input",updatePassageCounter);
 if(form)form.addEventListener("submit",async e=>{
  e.preventDefault();const msg=document.getElementById("adminMsg");
  const body={language:pLang.value,difficulty:pDiff.value,category:pCat.value,title:pTitle.value,text:pText.value};
  try{
   const d=await api("/api/admin/passages",{method:"POST",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}});
   msg.textContent="Passage added successfully: "+d.passage.word_count+" words.";
   form.reset();pCat.value="General";updatePassageCounter();loadAdminPassages();
  }catch(err){msg.textContent=err.message}
 });
 showAdminIfNeeded();updatePassageCounter();
});
window.addEventListener("hashchange",()=>{
 if(location.hash==="#adminPanel"){
   const p=document.getElementById("adminPanel"); if(p)p.classList.remove("hidden");
   loadAdminPassages();
 }
 showAdminIfNeeded();
});
