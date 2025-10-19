import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function WorkerProfile() {
  const dpRef = useRef(null);
  const dobInputRef = useRef(null);
  const dpPortalRef = useRef(null);
  const [editingPhone, setEditingPhone] = useState(false), [phoneTaken, setPhoneTaken] = useState(false), [phoneEditCommitted, setPhoneEditCommitted] = useState(true), [phoneErrorAfterDone, setPhoneErrorAfterDone] = useState(false);
  const [form, setForm] = useState({ first_name:"", last_name:"", email:"", phone:"", facebook:"", instagram:"", date_of_birth:"" });
  const [base, setBase] = useState(null), [createdAt, setCreatedAt] = useState(""), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false), [savedProfile, setSavedProfile] = useState(false), [savingSocial, setSavingSocial] = useState(false), [savedSocial, setSavedSocial] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false), [confirmScope, setConfirmScope] = useState(null);
  const [socialTouched, setSocialTouched] = useState({ facebook:false, instagram:false }), [facebookTaken, setFacebookTaken] = useState(false), [instagramTaken, setInstagramTaken] = useState(false);
  const [editSocial, setEditSocial] = useState({ facebook:false, instagram:false });
  const [editingDob, setEditingDob] = useState(false), [dobError, setDobError] = useState(""), [dobEditCommitted, setDobEditCommitted] = useState(true);
  const [dpOpen, setDpOpen] = useState(false), [dpView, setDpView] = useState(new Date());
  const [dpCoords, setDpCoords] = useState({ top: 0, left: 0, width: 300 });
  const [monthOpen, setMonthOpen] = useState(false), [yearOpen, setYearOpen] = useState(false);

  const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const toMDY = (d) => `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;
  const computeAge = (iso) => { if(!iso) return null; const d=new Date(iso); if(isNaN(d)) return null; const t=new Date(); let a=t.getFullYear()-d.getFullYear(); const m=t.getMonth()-d.getMonth(); if(m<0||(m===0&&t.getDate()<d.getDate())) a--; return a>=0&&a<=120?a:null; };

  const { minDOB, maxDOB, minDOBDate, maxDOBDate, minDOBLabel, maxDOBLabel } = useMemo(() => {
    const today=new Date(), max=new Date(today.getFullYear()-21,today.getMonth(),today.getDate()), min=new Date(today.getFullYear()-55,today.getMonth(),today.getDate());
    return { minDOB:toYMD(min), maxDOB:toYMD(max), minDOBDate:min, maxDOBDate:max, minDOBLabel:toMDY(min), maxDOBLabel:toMDY(max) };
  }, []);

  const appU = useMemo(() => { try{ const a=JSON.parse(localStorage.getItem("workerAuth")||"{}"); const au=a.auth_uid||a.authUid||a.uid||a.id||localStorage.getItem("auth_uid")||""; const e=a.email||localStorage.getItem("worker_email")||localStorage.getItem("email_address")||localStorage.getItem("email")||""; return encodeURIComponent(JSON.stringify({ r:"worker", e, au })); }catch{return"";} }, []);
  const headersWithU = useMemo(()=> appU?{ "x-app-u":appU }:{},[appU]);
  const urlQS = useMemo(()=> appU?`?app_u=${appU}`:"",[appU]);

  useEffect(() => {
    const init=async()=>{ try{ const {data}=await axios.get(`${API_BASE}/api/workers/me`,{withCredentials:true,headers:headersWithU});
        const dob=data?.date_of_birth?String(data.date_of_birth).slice(0,10):"", f={ first_name:data?.first_name||"", last_name:data?.last_name||"", email: data?.email_address || "", phone: data?.phone || "", facebook: data?.facebook || "", instagram: data?.instagram || "", date_of_birth:dob };
        setForm(f); setBase(f);
        localStorage.setItem("first_name",f.first_name); localStorage.setItem("last_name",f.last_name); if(data?.sex) localStorage.setItem("sex",data.sex);
        if(data?.created_at){ const t=new Date(data.created_at); setCreatedAt(t.toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"long",timeStyle:"short"})); }
        setDpView(dob?new Date(dob):new Date(maxDOBDate));
      }catch{ const t=new Date(); setCreatedAt(t.toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"long",timeStyle:"short"})); setDpView(new Date(maxDOBDate)); } };
    init();
  }, [headersWithU, maxDOBDate]);

  useEffect(()=>{ document.body.style.overflow=confirmOpen?"hidden":""; return()=>{ document.body.style.overflow=""; }; },[confirmOpen]);

  useEffect(()=>{ const out=(e)=>{ const panel=dpPortalRef.current; if(dpRef.current&&panel){ if(!dpRef.current.contains(e.target)&&!panel.contains(e.target)) setDpOpen(false); } else if(dpRef.current&&!dpRef.current.contains(e.target)) setDpOpen(false); }; document.addEventListener("mousedown",out); return()=>document.removeEventListener("mousedown",out); },[]);

  useEffect(()=>{ const onScrollOrResize=()=>{ if(!dpOpen||!dobInputRef.current) return; const r=dobInputRef.current.getBoundingClientRect(); setDpCoords({ top: r.bottom+8, left: Math.max(8, r.left), width: 300 }); }; if(dpOpen){ onScrollOrResize(); window.addEventListener("scroll",onScrollOrResize,true); window.addEventListener("resize",onScrollOrResize); } return()=>{ window.removeEventListener("scroll",onScrollOrResize,true); window.removeEventListener("resize",onScrollOrResize); }; },[dpOpen]);

  const allowedPHPrefixes = useMemo(()=>new Set(["905","906","907","908","909","910","912","913","914","915","916","917","918","919","920","921","922","923","925","926","927","928","929","930","931","932","933","934","935","936","937","938","939","940","941","942","943","944","945","946","947","948","949","950","951","952","953","954","955","956","957","958","959","960","961","962","963","964","965","966","967","968","969","970","971","972","973","974","975","976","977","978","979","980","981","982","983","984","985","986","987","988","989","990","991","992","993","994","995","996","997","998","999"]),[]);
  const isTriviallyFake=(d)=>/^(\d)\1{9}$/.test(d)||("9"+d).includes("0123456789")||("9"+d).includes("9876543210")||new Set(d.split("")).size<4;
  const isValidPHMobile=(d)=>d.length===10&&d[0]==="9"&&!isTriviallyFake(d)&&allowedPHPrefixes.has(d.slice(0,3));
  const isPhoneValid=!form.phone||isValidPHMobile(form.phone), showPhoneError=editingPhone&&phoneErrorAfterDone&&!isPhoneValid&&form.phone.length>0;

  const facebookValid=useMemo(()=>{ if(!form.facebook)return true; try{ const u=new URL(/^https?:\/\//i.test(form.facebook)?form.facebook:`https://${form.facebook}`); const h=u.hostname.toLowerCase(); const ok=h==="facebook.com"||h==="www.facebook.com"||h==="m.facebook.com"||h==="fb.com"||h==="www.fb.com"; if(!ok) return false; if(u.pathname==="/")return false; if(u.pathname==="/profile.php")return u.searchParams.has("id")&&/^\d+$/.test(u.searchParams.get("id")); return /^\/[A-Za-z0-9.]+\/?$/.test(u.pathname); }catch{return false;} },[form.facebook]);
  const instagramValid=useMemo(()=>{ if(!form.instagram)return true; try{ const u=new URL(/^https?:\/\//i.test(form.instagram)?form.instagram:`https://${form.instagram}`); const h=u.hostname.toLowerCase(); const ok=h==="instagram.com"||h==="www.instagram.com"||h==="m.instagram.com"; if(!ok) return false; if(u.pathname==="/")return false; return /^\/[A-Za-z0-9._]+\/?$/.test(u.pathname); }catch{return false;} },[form.instagram]);

  const phoneDirty=useMemo(()=>!!base&&String(base.phone||"")!==String(form.phone||""),[base,form.phone]);
  const facebookDirty=useMemo(()=>!!base&&String(base.facebook||"")!==String(form.facebook||""),[base,form.facebook]);
  const instagramDirty=useMemo(()=>!!base&&String(base.instagram||"")!==String(form.instagram||""),[base,form.instagram]);
  const dobDirty=useMemo(()=>!!base&&String(base.date_of_birth||"")!==String(form.date_of_birth||""),[base,form.date_of_birth]);
  const socialDirty=facebookDirty||instagramDirty;

  const canSaveProfile=(phoneDirty||dobDirty)&&!savingProfile&&(!phoneDirty||(isPhoneValid&&!phoneTaken&&phoneEditCommitted))&&(!dobDirty||(((form.date_of_birth===""||(form.date_of_birth&&form.date_of_birth>=minDOB&&form.date_of_birth<=maxDOB))&&dobEditCommitted)));
  const canSaveSocial=socialDirty&&!savingSocial&&facebookValid&&instagramValid&&!facebookTaken&&!instagramTaken;

  const age=useMemo(()=>computeAge(form.date_of_birth),[form.date_of_birth]);
  const validateDob=(iso)=>{ if(!iso)return ""; const d=new Date(iso); if(isNaN(d)) return "Invalid date"; if(d>new Date()) return "Date cannot be in the future"; const a=computeAge(iso); return a==null?"Invalid age":""; };

  const monthsList=useMemo(()=>["January","February","March","April","May","June","July","August","September","October","November","December"],[]);
  const yearsList=useMemo(()=>{ const ys=[]; for(let y=minDOBDate.getFullYear(); y<=maxDOBDate.getFullYear(); y++) ys.push(y); return ys; },[minDOBDate,maxDOBDate]);
  const setMonthYear=(m,y)=>{ const next=new Date(y,m,1), minStart=new Date(minDOBDate.getFullYear(),minDOBDate.getMonth(),1), maxStart=new Date(maxDOBDate.getFullYear(),maxDOBDate.getMonth(),1); setDpView(next<minStart?minStart:next>maxStart?maxStart:next); };

  const onSaveProfile=async()=>{ if(!canSaveProfile) return; setSavingProfile(true); setSaving(true); setSaved(false);
    try{
      if(phoneDirty||dobDirty){
        const payload={}; if(phoneDirty) payload.phone=form.phone||""; if(dobDirty) payload.date_of_birth=form.date_of_birth||null;
        const {data}=await axios.post(`${API_BASE}/api/workers/profile${urlQS}`,payload,{withCredentials:true,headers:{ "Content-Type":"application/json",...headersWithU }});
        setBase((b)=>({ ...(b||{}), first_name:data?.first_name||form.first_name, last_name:data?.last_name||form.last_name, email:data?.email_address||form.email, phone:phoneDirty?(data?.phone??payload.phone??""):(b?.phone??form.phone), facebook:b?.facebook??form.facebook, instagram:b?.instagram??form.instagram, date_of_birth:dobDirty?(data?.date_of_birth?String(data.date_of_birth).slice(0,10):payload.date_of_birth||""):(b?.date_of_birth??form.date_of_birth) }));
        setPhoneTaken(false);
        if(phoneDirty&&form.phone) await axios.post(`${API_BASE}/api/notifications`,{title:"Contact number updated",message:"Your contact number has been updated.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{});
        if(phoneDirty&&!form.phone) await axios.post(`${API_BASE}/api/notifications`,{title:"Contact number removed",message:"Your contact number has been removed.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{});
        if(dobDirty) await axios.post(`${API_BASE}/api/notifications`,{title:"Birthdate updated",message:"Your birthdate has been updated.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{});
      }
      setSaved(true); setSavedProfile(true); setTimeout(()=>{ setSaved(false); setSavedProfile(false); },1500);
    }catch(e){ const msg=(e?.response?.data?.message||e?.message||"").toLowerCase(); if(msg.includes("contact number already in use")){ setPhoneTaken(true); setEditingPhone(true); setPhoneEditCommitted(false); } }
    setSavingProfile(false); setSaving(false);
  };

  const onSaveSocial=async()=>{ if(!socialDirty) return;
    setSocialTouched((t)=>({ facebook:t.facebook||facebookDirty, instagram:t.instagram||instagramDirty }));
    const payload={};
    if(facebookDirty){ const v=form.facebook?(/^https?:\/\//i.test(form.facebook)?form.facebook:`https://${form.facebook}`):null; payload.facebook=v; }
    if(instagramDirty){ const v=form.instagram?(/^https?:\/\//i.test(form.instagram)?form.instagram:`https://${form.instagram}`):null; payload.instagram=v; }
    const fbReady=!("facebook" in payload)||payload.facebook==null||facebookValid, igReady=!("instagram" in payload)||payload.instagram==null||instagramValid;
    if(!fbReady||!igReady||savingSocial||facebookTaken||instagramTaken) return;
    setSavingSocial(true); setSaving(true); setSaved(false);
    try{
      const {data}=await axios.post(`${API_BASE}/api/workers/profile${urlQS}`,payload,{withCredentials:true,headers:{ "Content-Type":"application/json",Accept:"application/json",...headersWithU }});
      const prevFb=base?.facebook||"", prevIg=base?.instagram||"", nextFb=data?.facebook??payload.facebook??form.facebook, nextIg=data?.instagram??payload.instagram??form.instagram;
      setBase((b)=>({ ...(b||{}), first_name:data?.first_name||form.first_name, last_name:data?.last_name||form.last_name, email: data?.email_address || form.email, phone:b?.phone??form.phone, facebook:nextFb, instagram:nextIg, date_of_birth:b?.date_of_birth??form.date_of_birth }));
      setFacebookTaken(false); setInstagramTaken(false); setEditSocial({ facebook:false, instagram:false });
      setSaved(true); setSavedSocial(true); setTimeout(()=>{ setSaved(false); setSavedSocial(false); },1500);
      if(facebookDirty){ if(prevFb&&!nextFb) await axios.post(`${API_BASE}/api/notifications`,{title:"Facebook link removed",message:"Your Facebook link has been removed.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{});
        else if(!prevFb&&nextFb) await axios.post(`${API_BASE}/api/notifications`,{title:"Facebook link added",message:"Your Facebook link has been added.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{});
        else await axios.post(`${API_BASE}/api/notifications`,{title:"Facebook link updated",message:"Your Facebook link has been updated.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{}); }
      if(instagramDirty){ if(prevIg&&!nextIg) await axios.post(`${API_BASE}/api/notifications`,{title:"Instagram link removed",message:"Your Instagram link has been removed.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{});
        else if(!prevIg&&nextIg) await axios.post(`${API_BASE}/api/notifications`,{title:"Instagram link added",message:"Your Instagram link has been added.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{});
        else await axios.post(`${API_BASE}/api/notifications`,{title:"Instagram link updated",message:"Your Instagram link has been updated.",type:"Profile"},{withCredentials:true,headers:headersWithU}).catch(()=>{}); }
    }catch(e){ const msg=(e?.response?.data?.message||e?.message||"").toLowerCase(); if(msg.includes("facebook")) setFacebookTaken(true); if(msg.includes("instagram")) setInstagramTaken(true);
      setSocialTouched((t)=>({ facebook:t.facebook||!!payload.facebook, instagram:t.instagram||!!payload.instagram })); }
    setSavingSocial(false); setSaving(false);
  };

  const openCalendar=()=>{ if(!editingDob) setEditingDob(true); setDpView(form.date_of_birth?new Date(form.date_of_birth):new Date(maxDOBDate)); setDobEditCommitted(false); if(dobInputRef.current){ const r=dobInputRef.current.getBoundingClientRect(); setDpCoords({ top:r.bottom+8, left:Math.max(8, r.left), width:300 }); } setDpOpen(true); setMonthOpen(false); setYearOpen(false); };

  const CalendarPopover = dpOpen ? createPortal(
    <div ref={dpPortalRef} className="z-[1000] fixed" style={{ top: dpCoords.top, left: dpCoords.left, width: dpCoords.width }}>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl p-3">
        <div className="flex items-center justify-between px-2 pb-2">
          <button type="button" onClick={()=>{const d=new Date(dpView);d.setMonth(d.getMonth()-1);setDpView(d)}} className="p-2 rounded-lg hover:bg-gray-100">‹</button>
          <div className="relative flex items-center gap-2">
            <div className="relative">
              <button type="button" onClick={()=>{ setMonthOpen((v)=>!v); setYearOpen(false); }} className="min-w-[120px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50">
                {["January","February","March","April","May","June","July","August","September","October","November","December"][dpView.getMonth()]}
                <span className="ml-2">▾</span>
              </button>
              {monthOpen ? (
                <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=>(
                    <button key={m} type="button" onClick={()=>{ setMonthYear(i,dpView.getFullYear()); setMonthOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${i===dpView.getMonth()?"bg-blue-100":""}`}>{m}</button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button type="button" onClick={()=>{ setYearOpen((v)=>!v); setMonthOpen(false); }} className="min-w-[90px] justify-between inline-flex items-center border border-gray-300 rounded-md px-2 py-1 text-sm hover:bg-gray-50">
                {dpView.getFullYear()}
                <span className="ml-2">▾</span>
              </button>
              {yearOpen ? (
                <div className="absolute z-[1010] mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {(()=>{const ys=[];for(let y=minDOBDate.getFullYear();y<=maxDOBDate.getFullYear();y++)ys.push(y);return ys})().map((y)=>(
                    <button key={y} type="button" onClick={()=>{ setMonthYear(dpView.getMonth(),y); setYearOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${y===dpView.getFullYear()?"bg-blue-100":""}`}>{y}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={()=>{const d=new Date(dpView);d.setMonth(d.getMonth()+1);setDpView(d)}} className="p-2 rounded-lg hover:bg-gray-100">›</button>
          </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 px-2">{["Su","Mo","Tu","We","Th","Fr","Sa"].map((d)=>(<div key={d} className="py-1">{d}</div>))}</div>
        {(()=>{ const first=new Date(dpView.getFullYear(),dpView.getMonth(),1), last=new Date(dpView.getFullYear(),dpView.getMonth()+1,0), offset=first.getDay(), total=offset+last.getDate(), rows=Math.ceil(total/7), selected=form.date_of_birth?new Date(form.date_of_birth):null, cells=[];
          for(let r=0;r<rows;r++){ const row=[]; for(let c=0;c<7;c++){ const idx=r*7+c, day=idx-offset+1;
            if(day<1||day>last.getDate()) row.push(<div key={`x-${r}-${c}`} className="py-2" />); else { const d=new Date(dpView.getFullYear(),dpView.getMonth(),day), dis=d<minDOBDate||d>maxDOBDate, sel=selected&&d.getFullYear()===selected.getFullYear()&&d.getMonth()===selected.getMonth()&&d.getDate()===selected.getDate();
              row.push(<button key={`d-${day}`} type="button" disabled={dis} onClick={()=>{ const ymd=toYMD(d); setForm((f)=>({ ...f, date_of_birth:ymd })); setDobError(validateDob(ymd)); setDpOpen(false); setMonthOpen(false); setYearOpen(false); }} className={["py-2 rounded-lg transition text-sm w-9 h-9 mx-auto", dis?"text-gray-300 cursor-not-allowed":"hover:bg-blue-50 text-gray-700", sel&&!dis?"bg-blue-600 text-white hover:bg-blue-600":""].join(" ")}>{day}</button>); } }
            cells.push(<div key={`r-${r}`} className="grid grid-cols-7 gap-1 px-2">{row}</div>); }
          return <div className="mt-1">{cells}</div>; })()}
        <div className="flex items-center justify-between mt-3 px-2">
          <button type="button" onClick={()=>{ setForm((f)=>({ ...f, date_of_birth:"" })); setDobError(""); setDpOpen(false); setMonthOpen(false); setYearOpen(false); }} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
          <button type="button" onClick={()=>{ setDpView(new Date(maxDOBDate)); }} className="text-xs text-blue-600 hover:text-blue-700">Jump to latest allowed</button>
        </div>
      </div>
    </div>
  , document.body) : null;

  return (
    <main className="min-h-[65vh] pb-24 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-2xl border border-gray-100 p-6 md:p-7 bg-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div><h2 className="text-[22px] md:text-3xl font-semibold text-gray-900 tracking-tight">Profile</h2><p className="mt-1 text-sm text-gray-600">Manage your personal details and social links</p></div>
            <div className="text-right"><div className="text-[11px] uppercase tracking-wide text-gray-500">Account Created</div>
              <div className="mt-1 flex items-center justify-end gap-2"><p className="text-sm text-gray-700">{createdAt||"—"}</p><span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium border-emerald-200 text-emerald-700 bg-emerald-50"><span className="h-3 w-3 rounded-full bg-current opacity-30" />Active</span></div>
            </div>
          </div>
        </div>

        <section className="w-full rounded-2xl border border-gray-100 bg-white p-6 md:p-7 mb-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="w-full">
              <div className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm"><p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">First Name</p><p className="mt-1 text-base text-gray-900">{form.first_name||"—"}</p></div>
              <div className="mt-4 rounded-2xl border border-gray-100 p-4 bg-white shadow-sm min-h-[150px]">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">Contact Number</p>
                {!editingPhone && (<div className="mt-2">{form.phone&&!phoneTaken?
                  <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 border border-gray-100"><img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover"/><span className="text-gray-700 text-sm">+63</span><span className="text-base text-gray-900 tracking-wide">{form.phone}</span></div>:
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-gray-200 text-gray-400"><img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover"/><span className="text-sm">+63</span><span className="text-sm">9XXXXXXXXX</span></div>}</div>)}
                {(!form.phone||phoneTaken)&&!editingPhone && (<div className="mt-3 flex items-center gap-3">
                  <button type="button" onClick={()=>{ setEditingPhone(true); setPhoneEditCommitted(false); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">+ Add contact number</button>
                </div>)}
                {form.phone&&!phoneTaken&&!editingPhone && (<div className="mt-3 flex items-center gap-3">
                  <button type="button" onClick={()=>{ setEditingPhone(true); setPhoneEditCommitted(false); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                  <button type="button" onClick={()=>{ setForm({...form,phone:""}); setPhoneTaken(false); setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-3.5 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                </div>)}
                {(editingPhone||!!form.phone)&&editingPhone && (<div className="mt-3 w-full max-w=[280px]">
                  <div className={`flex items-center rounded-xl border ${showPhoneError||phoneTaken?"border-red-500":"border-gray-200"} overflow-hidden pl-3 pr-3 h-11 focus-within:ring-2 ${showPhoneError||phoneTaken?"focus-within:ring-red-500":"focus-within:ring-blue-500"}`}>
                    <img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm mr-2 object-cover"/><span className="text-gray-700 text-sm mr-3">+63</span><span className="h-6 w-px bg-gray-200 mr-3"/><input type="tel" value={form.phone} onChange={(e)=>{ setForm({...form,phone:e.target.value.replace(/\D/g,"").slice(0,10)}); setPhoneTaken(false); }} placeholder="9XXXXXXXXX" className="w-full outline-none text-sm placeholder:text-gray-400 h-full bg-transparent"/>
                  </div>
                  {showPhoneError && <div className="mt-2 text-xs text-red-600">Enter a valid PH mobile number with a real prefix.</div>}
                  {phoneTaken && <div className="mt-2 text-xs text-red-600">Contact number already in use.</div>}
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={()=>{ if(!isPhoneValid||phoneTaken){ setPhoneErrorAfterDone(true); return; } setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); }} className={`rounded-xl px-4 text-sm font-medium transition h-10 ${!isPhoneValid||phoneTaken?"bg-[#008cfc] text-white opacity-50 cursor-not-allowed":"bg-[#008cfc] text-white hover:bg-blue-700"}`}>Done</button>
                    <button type="button" onClick={()=>{ setForm({...form,phone:base?.phone||""}); setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); setPhoneTaken(false); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                  </div>
                </div>)}
              </div>
            </div>

            <div className="w-full">
              <div className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm"><p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">Last Name</p><p className="mt-1 text-base text-gray-900">{form.last_name||"—"}</p></div>
              <div className="mt-4 rounded-2xl border border-gray-100 p-4 bg-white relative min-h-[150px]" ref={dpRef}>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">Date of Birth</p>
                {!editingDob && (<>
                  <div className="mt-2">{form.date_of_birth?
                    <div className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 border border-gray-100"><span className="text-base text-gray-900 tracking-wide">{toMDY(new Date(form.date_of_birth))}</span></div>:
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-gray-200 text-gray-400"><span className="text-sm">mm/dd/yyyy</span></div>}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {!form.date_of_birth?
                      <button type="button" onClick={()=>{ setEditingDob(true); openCalendar(); }} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">+ Add date of birth</button>:
                      <>
                        <button type="button" onClick={()=>{ setEditingDob(true); openCalendar(); }} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                        <button type="button" onClick={()=>{ setForm((f)=>({ ...f, date_of_birth:"" })); setDobError(""); setEditingDob(false); setDobEditCommitted(true); setDpOpen(false); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-3.5 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                      </>}
                  </div>
                </>)}

                {editingDob && (<>
                  <div ref={dobInputRef} className="mt-2 flex items-center rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 h-11">
                    <input type="text" value={form.date_of_birth?toMDY(new Date(form.date_of_birth)):""} onFocus={openCalendar} readOnly placeholder="mm/dd/yyyy" title={`Allowed: ${minDOBLabel} to ${maxDOBLabel} (21–55 years old)`} className="w-full px-4 rounded-l-xl focus:outline-none bg-white" inputMode="none"/>
                    <button type="button" onClick={openCalendar} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open calendar">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" /><path d="M18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Must be between <span className="font-medium">{minDOBLabel}</span> and <span className="font-medium">{maxDOBLabel}</span> (21–55 yrs).</p>
                  {form.date_of_birth&&!(form.date_of_birth>=minDOB&&form.date_of_birth<=maxDOB) && <p className="text-xs text-red-600 mt-1">Birthdate must make you between 21 and 55 years old.</p>}
                  {CalendarPopover}
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={()=>{ if(form.date_of_birth&&!(form.date_of_birth>=minDOB&&form.date_of_birth<=maxDOB)) return; setEditingDob(false); setDobEditCommitted(true); setDpOpen(false); setMonthOpen(false); setYearOpen(false); }} className={`rounded-xl px-4 text-sm font-medium transition h-10 ${form.date_of_birth&&!(form.date_of_birth>=minDOB&&form.date_of_birth<=maxDOB)?"bg-[#008cfc] text-white opacity-50 cursor-not-allowed":"bg-[#008cfc] text-white hover:bg-blue-700"}`}>Done</button>
                    <button type="button" onClick={()=>{ setForm((f)=>({ ...f, date_of_birth:base?.date_of_birth||"" })); setDobError(""); setEditingDob(false); setDobEditCommitted(true); setDpOpen(false); setMonthOpen(false); setYearOpen(false); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                  </div>
                </>)}
              </div>
            </div>

            <div className="w-full">
              <div className="rounded-2xl border border-gray-100 p-4 bg-white shadow-sm"><p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">Email</p><p className="mt-1 text-base text-gray-900 break-all">{form.email||"—"}</p></div>
              <div className="mt-4 rounded-2xl border border-gray-100 p-4 bg-white shadow-sm"><p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">Age</p><p className="mt-1 text-base text-gray-900">{age!=null?`${age}`:"—"}</p></div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            {savedProfile ? <span className="text-sm text-blue-700">Saved</span> : null}
            <button type="button" disabled={!canSaveProfile} onClick={()=>{ setConfirmScope("profile"); setConfirmOpen(true); }} className={`rounded-xl px-5 py-2.5 text-sm font-medium transition shadow-sm ${canSaveProfile?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>{savingProfile?"Saving...":"Confirm"}</button>
          </div>
        </section>

        <section className="w-full rounded-2xl border border-gray-100 bg-white p-6 md:p-7 shadow-sm">
          <div className="mb-6 flex items-center justify-between"><h3 className="text-lg font-semibold tracking-tight text-gray-900">Social Media</h3>{savedSocial?<span className="text-sm text-blue-700">Saved</span>:null}</div>

          <div className="grid grid-cols-[220px_1fr_220px] gap-6">
            <div className="col-span-3 grid grid-cols-subgrid items-start">
              <div className="flex items-center gap-2"><FaFacebookF className="text-blue-600"/><span className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">Facebook</span></div>
              <div>
                {!base?.facebook||editSocial.facebook ? <>
                  <input type="url" placeholder="https://facebook.com/username" value={form.facebook} onChange={(e)=>{ setForm({...form,facebook:e.target.value}); setFacebookTaken(false); }} onBlur={()=>setSocialTouched((s)=>({ ...s, facebook:true }))} className={`w-full px-4 py-2.5 h-11 border rounded-xl focus:outline-none focus:ring-2 ${(!facebookValid||facebookTaken)&&socialTouched.facebook?"border-red-500 focus:ring-red-500":"border-gray-200 focus:ring-blue-500"}`}/>
                  {(!facebookValid||facebookTaken)&&socialTouched.facebook && <div className="mt-1 text-xs text-red-600">Enter a valid Facebook profile URL.</div>}
                </> : <a href={base.facebook} target="_blank" rel="noreferrer" className="text-md text-blue-700 break-all hover:underline">{base.facebook}</a>}
              </div>
              <div className="flex items-center gap-3 justify-end">
                {!base?.facebook||editSocial.facebook ? (base?.facebook?
                  <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, facebook:false })); setForm((f)=>({ ...f, facebook:base.facebook })); setFacebookTaken(false); setSocialTouched((t)=>({ ...t, facebook:false })); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>:null)
                  : <>
                      <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, facebook:true })); setSocialTouched((t)=>({ ...t, facebook:false })); }} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                      <button type="button" onClick={()=>{ setForm((f)=>({ ...f, facebook:"" })); setEditSocial((s)=>({ ...s, facebook:true })); setSocialTouched((t)=>({ ...t, facebook:true })); setFacebookTaken(false); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                    </>}
              </div>
            </div>

            <div className="col-span-3 h-px bg-gray-100" />

            <div className="col-span-3 grid grid-cols-subgrid items-start">
              <div className="flex items-center gap-2"><FaInstagram className="text-pink-500"/><span className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">Instagram</span></div>
              <div>
                {!base?.instagram||editSocial.instagram ? <>
                  <input type="url" placeholder="https://instagram.com/username" value={form.instagram} onChange={(e)=>{ setForm({...form,instagram:e.target.value}); setInstagramTaken(false); }} onBlur={()=>setSocialTouched((s)=>({ ...s, instagram:true }))} className={`w-full px-4 py-2.5 h-11 border rounded-xl focus:outline-none focus:ring-2 ${(!instagramValid||instagramTaken)&&socialTouched.instagram?"border-red-500 focus:ring-red-500":"border-gray-200 focus:ring-blue-500"}`}/>
                  {(!instagramValid||instagramTaken)&&socialTouched.instagram && <div className="mt-1 text-xs text-red-600">Enter a valid Instagram profile URL.</div>}
                </> : <a href={base.instagram} target="_blank" rel="noreferrer" className="text-md text-blue-700 break-all hover:underline">{base.instagram}</a>}
              </div>
              <div className="flex items-center gap-3 justify-end">
                {!base?.instagram||editSocial.instagram ? (base?.instagram?
                  <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, instagram:false })); setForm((f)=>({ ...f, instagram:base.instagram })); setInstagramTaken(false); setSocialTouched((t)=>({ ...t, instagram:false })); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>:null)
                  : <>
                      <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, instagram:true })); setSocialTouched((t)=>({ ...t, instagram:false })); }} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                      <button type="button" onClick={()=>{ setForm((f)=>({ ...f, instagram:"" })); setEditSocial((s)=>({ ...s, instagram:true })); setSocialTouched((t)=>({ ...t, instagram:true })); setInstagramTaken(false); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                    </>}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button type="button" disabled={!canSaveSocial} onClick={()=>{ setConfirmScope("social"); setConfirmOpen(true); }} className={`rounded-xl px-5 py-2.5 text-sm font-medium transition shadow-sm ${canSaveSocial?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>{savingSocial?"Saving...":"Confirm"}</button>
          </div>
        </section>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setConfirmOpen(false)} />
          <div className="relative z-[101] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900">Save changes?</h4>
            <p className="mt-1 text-sm text-gray-600">Are you sure saving these changes?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={()=>setConfirmOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={confirmScope==="profile"?(!canSaveProfile):(!canSaveSocial)} onClick={()=>{ if(confirmScope==="profile") onSaveProfile(); else if(confirmScope==="social") onSaveSocial(); setConfirmOpen(false); }} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${confirmScope==="profile"?(canSaveProfile?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed"):(canSaveSocial?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed")}`}>
                {confirmScope==="profile"?(savingProfile?"Saving...":"Save"):(savingSocial?"Saving...":"Save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
