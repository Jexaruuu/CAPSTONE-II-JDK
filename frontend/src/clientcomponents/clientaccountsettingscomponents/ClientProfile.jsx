import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const avatarFromName = (name) => `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name || "User")}`;

export default function ClientProfile() {
  const fileRef = useRef(null), btnRef = useRef(null), jdkRowRef = useRef(null), gridRef = useRef(null), dpRef = useRef(null);
  const [avatarFile, setAvatarFile] = useState(null), [avatarRemoved, setAvatarRemoved] = useState(false), [avatarBroken, setAvatarBroken] = useState(false);
  const [avatarSize, setAvatarSize] = useState(80), [alignOffset, setAlignOffset] = useState(0), [btnFixedWidth, setBtnFixedWidth] = useState(140);
  const [editingPhone, setEditingPhone] = useState(false), [phoneTaken, setPhoneTaken] = useState(false), [phoneEditCommitted, setPhoneEditCommitted] = useState(true), [phoneErrorAfterDone, setPhoneErrorAfterDone] = useState(false);
  const [form, setForm] = useState({ first_name:"", last_name:"", email:"", phone:"", facebook:"", instagram:"", date_of_birth:"" });
  const [base, setBase] = useState(null), [createdAt, setCreatedAt] = useState(""), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false), [savedProfile, setSavedProfile] = useState(false), [savingSocial, setSavingSocial] = useState(false), [savedSocial, setSavedSocial] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false), [confirmScope, setConfirmScope] = useState(null);
  const [socialTouched, setSocialTouched] = useState({ facebook:false, instagram:false }), [facebookTaken, setFacebookTaken] = useState(false), [instagramTaken, setInstagramTaken] = useState(false);
  const [editSocial, setEditSocial] = useState({ facebook:false, instagram:false });
  const [editingDob, setEditingDob] = useState(false), [dobError, setDobError] = useState(""), [dobEditCommitted, setDobEditCommitted] = useState(true);
  const [dpOpen, setDpOpen] = useState(false), [dpView, setDpView] = useState(new Date());

  const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const toMDY = (d) => `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`;
  const computeAge = (iso) => { if(!iso) return null; const d=new Date(iso); if(isNaN(d)) return null; const t=new Date(); let a=t.getFullYear()-d.getFullYear(); const m=t.getMonth()-d.getMonth(); if(m<0||(m===0&&t.getDate()<d.getDate())) a--; return a>=0&&a<=120?a:null; };

  const { minDOB, maxDOB, minDOBDate, maxDOBDate, minDOBLabel, maxDOBLabel } = useMemo(() => {
    const today=new Date(), max=new Date(today.getFullYear()-21,today.getMonth(),today.getDate()), min=new Date(today.getFullYear()-55,today.getMonth(),today.getDate());
    return { minDOB:toYMD(min), maxDOB:toYMD(max), minDOBDate:min, maxDOBDate:max, minDOBLabel:toMDY(min), maxDOBLabel:toMDY(max) };
  }, []);

  useEffect(() => {
    const update=()=>{ if(btnRef.current){ const w=Math.max(120,Math.round(btnRef.current.offsetWidth||0)); setBtnFixedWidth(w); setAvatarSize(w); }
      if(jdkRowRef.current&&gridRef.current){ const gTop=gridRef.current.getBoundingClientRect().top, jTop=jdkRowRef.current.getBoundingClientRect().top; setAlignOffset(Math.max(0,Math.round(jTop-gTop))); } };
    update(); window.addEventListener("resize",update); return()=>window.removeEventListener("resize",update);
  }, []);

  const appU = useMemo(() => { try{ const a=JSON.parse(localStorage.getItem("clientAuth")||"{}"); const au=a.auth_uid||a.authUid||a.uid||a.id||localStorage.getItem("auth_uid")||""; const e=a.email||localStorage.getItem("client_email")||localStorage.getItem("email_address")||localStorage.getItem("email")||""; return encodeURIComponent(JSON.stringify({ r:"client", e, au })); }catch{return"";} }, []);
  const headersWithU = useMemo(()=> appU?{ "x-app-u":appU }:{},[appU]);

  useEffect(() => {
    const init=async()=>{ try{ const {data}=await axios.get(`${API_BASE}/api/clients/me`,{withCredentials:true,headers:headersWithU});
        const dob=data?.date_of_birth?String(data.date_of_birth).slice(0,10):"", f={ first_name:data?.first_name||"", last_name:data?.last_name||"", email:data?.email_address||"", phone:data?.phone||"", facebook:data?.facebook||"", instagram:data?.instagram||"", date_of_birth:dob };
        setForm(f); setBase(f);
        localStorage.setItem("first_name",f.first_name); localStorage.setItem("last_name",f.last_name); if(data?.sex) localStorage.setItem("sex",data.sex);
        if(data?.avatar_url) localStorage.setItem("clientAvatarUrl",data.avatar_url);
        if(data?.created_at){ const t=new Date(data.created_at); setCreatedAt(t.toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"long",timeStyle:"short"})); }
        setAvatarBroken(!data?.avatar_url); setDpView(dob?new Date(dob):new Date(maxDOBDate));
      }catch{ const t=new Date(); setCreatedAt(t.toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"long",timeStyle:"short"})); setDpView(new Date(maxDOBDate)); } };
    init();
  }, [headersWithU, maxDOBDate]);

  useEffect(()=>{ document.body.style.overflow=confirmOpen?"hidden":""; return()=>{ document.body.style.overflow=""; }; },[confirmOpen]);
  useEffect(()=>{ const out=(e)=>{ if(dpRef.current&&!dpRef.current.contains(e.target)) setDpOpen(false); }; document.addEventListener("mousedown",out); return()=>document.removeEventListener("mousedown",out); },[]);

  const allowedPHPrefixes = useMemo(()=>new Set(["905","906","907","908","909","910","912","913","914","915","916","917","918","919","920","921","922","923","925","926","927","928","929","930","931","932","933","934","935","936","937","938","939","940","941","942","943","944","945","946","947","948","949","950","951","952","953","954","955","956","957","958","959","960","961","962","963","964","965","966","967","968","969","970","971","972","973","974","975","976","977","978","979","980","981","982","983","984","985","986","987","988","989","990","991","992","993","994","995","996","997","998","999"]),[]);
  const isTriviallyFake=(d)=>/^(\d)\1{9}$/.test(d)||("9"+d).includes("0123456789")||("9"+d).includes("9876543210")||new Set(d.split("")).size<4;
  const isValidPHMobile=(d)=>d.length===10&&d[0]==="9"&&!isTriviallyFake(d)&&allowedPHPrefixes.has(d.slice(0,3));
  const isPhoneValid=!form.phone||isValidPHMobile(form.phone), showPhoneError=editingPhone&&phoneErrorAfterDone&&!isPhoneValid&&form.phone.length>0;

  const storedAvatar=typeof window!=="undefined"?localStorage.getItem("clientAvatarUrl"):"";
  const fullName=`${form.first_name} ${form.last_name}`.trim();
  const avatarUrl=useMemo(()=> avatarFile?URL.createObjectURL(avatarFile):avatarRemoved?"/Clienticon.png":storedAvatar?storedAvatar:!avatarBroken?"/Clienticon.png":"/Clienticon.png",[avatarFile,avatarRemoved,avatarBroken,fullName,storedAvatar]);

  const createImage=(src)=>new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=src; });
  const fileToDataUrl=async(file)=>{ try{ const url=URL.createObjectURL(file); try{ const img=await createImage(url), max=800, w0=img.naturalWidth||img.width||1, h0=img.naturalHeight||img.height||1, sc=Math.min(1,max/Math.max(w0,h0)), w=Math.max(1,Math.round(w0*sc)), h=Math.max(1,Math.round(h0*sc)); const c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(img,0,0,w,h); return c.toDataURL("image/png",0.9); } finally{ URL.revokeObjectURL(url); } }catch{ return await new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); } };

  const isValidFacebookUrl=(url)=>{ if(!url)return true; try{ const u=new URL(url), host=u.hostname.toLowerCase(), ok=host==="facebook.com"||host==="www.facebook.com"||host==="m.facebook.com"||host==="fb.com"||host==="www.fb.com"; if(!ok) return false; if(!u.pathname||u.pathname==="/") return false; if(u.pathname==="/profile.php") return u.searchParams.has("id")&&/^\d+$/.test(u.searchParams.get("id")); return /^\/[A-Za-z0-9.]+\/?$/.test(u.pathname); }catch{return false;} };
  const isValidInstagramUrl=(url)=>{ if(!url)return true; try{ const u=new URL(url), host=u.hostname.toLowerCase(), ok=host==="instagram.com"||host==="www.instagram.com"||host==="m.instagram.com"; if(!ok) return false; if(!u.pathname||u.pathname==="/") return false; return /^\/[A-Za-z0-9._]+\/?$/.test(u.pathname); }catch{return false;} };
  const normalizeSocialUrl=(u)=>{ if(!u)return null; const s=String(u).trim(); if(!s)return null; const w=/^https?:\/\//i.test(s)?s:`https://${s}`; try{ const url=new URL(w); url.hostname=url.hostname.toLowerCase(); if(url.pathname!=="/"&&url.pathname.endsWith("/")) url.pathname=url.pathname.slice(0, -1); url.hash=""; return url.toString(); }catch{return null;} };
  const softValidFacebook=(x)=>{ if(!x)return true; const n=normalizeSocialUrl(x); return !!n&&isValidFacebookUrl(n); };
  const softValidInstagram=(x)=>{ if(!x)return true; const n=normalizeSocialUrl(x); return !!n&&isValidInstagramUrl(n); };

  const facebookValid=softValidFacebook(form.facebook), instagramValid=softValidInstagram(form.instagram);
  const phoneDirty=useMemo(()=>!!base&&String(base.phone||"")!==String(form.phone||""),[base,form.phone]);
  const facebookDirty=useMemo(()=>!!base&&String(base.facebook||"")!==String(form.facebook||""),[base,form.facebook]);
  const instagramDirty=useMemo(()=>!!base&&String(base.instagram||"")!==String(form.instagram||""),[base,form.instagram]);
  const dobDirty=useMemo(()=>!!base&&String(base.date_of_birth||"")!==String(form.date_of_birth||""),[base,form.date_of_birth]);
  const socialDirty=facebookDirty||instagramDirty, avatarDirty=!!avatarFile||avatarRemoved;

  const canSaveProfile=(avatarDirty||phoneDirty||dobDirty)&&!savingProfile&&(!phoneDirty||(isPhoneValid&&!phoneTaken&&phoneEditCommitted))&&(!dobDirty||(((form.date_of_birth===""||(form.date_of_birth&&form.date_of_birth>=minDOB&&form.date_of_birth<=maxDOB))&&dobEditCommitted)));
  const canSaveSocial=socialDirty&&!savingSocial&&facebookValid&&instagramValid&&!facebookTaken&&!instagramTaken;

  const age=useMemo(()=>computeAge(form.date_of_birth),[form.date_of_birth]);

  const validateDob=(iso)=>{ if(!iso)return ""; const d=new Date(iso); if(isNaN(d)) return "Invalid date"; if(d>new Date()) return "Date cannot be in the future"; const a=computeAge(iso); return a==null?"Invalid age":""; };

  const monthName=(d)=>d.toLocaleString("default",{month:"long"})+" "+d.getFullYear(), startOfMonth=(d)=>new Date(d.getFullYear(),d.getMonth(),1), endOfMonth=(d)=>new Date(d.getFullYear(),d.getMonth()+1,0), addMonths=(d,n)=>new Date(d.getFullYear(),d.getMonth()+n,1), isSameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const canGoPrev=()=>addMonths(startOfMonth(dpView),-1)>=startOfMonth(minDOBDate), canGoNext=()=>addMonths(startOfMonth(dpView),1)<=startOfMonth(maxDOBDate), inRange=(date)=>date>=minDOBDate&&date<=maxDOBDate;
  const openCalendar=()=>{ if(!editingDob) setEditingDob(true); setDpView(form.date_of_birth?new Date(form.date_of_birth):new Date(maxDOBDate)); setDobEditCommitted(false); setDpOpen(true); };
  const isBirthdateValid=useMemo(()=>{ if(!form.date_of_birth) return false; const d=new Date(form.date_of_birth); if(isNaN(d)) return false; return form.date_of_birth>=minDOB&&form.date_of_birth<=maxDOB; },[form.date_of_birth,minDOB,maxDOB]);
  const monthsList=useMemo(()=>["January","February","March","April","May","June","July","August","September","October","November","December"],[]);
  const yearsList=useMemo(()=>{ const ys=[]; for(let y=minDOBDate.getFullYear(); y<=maxDOBDate.getFullYear(); y++) ys.push(y); return ys; },[minDOBDate,maxDOBDate]);
  const setMonthYear=(m,y)=>{ const next=new Date(y,m,1), minStart=startOfMonth(minDOBDate), maxStart=startOfMonth(maxDOBDate); setDpView(next<minStart?minStart:next>maxStart?maxStart:next); };

  const dataUrlToBlob=(du)=>{ const [h,b]=du.split(","), mime=/data:(.*?);base64/.exec(h)?.[1]||"application/octet-stream", bin=atob(b||""), arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return new Blob([arr],{type:mime}); };

  const hasAvatar=useMemo(()=>((!!storedAvatar&&!avatarRemoved)||!!avatarFile),[storedAvatar,avatarRemoved,avatarFile]);

  const uploadAvatar=async(file)=>{ try{ const fd=new FormData(); fd.append("file",file,file.name||`avatar_${Date.now()}.png`); const {data}=await axios.post(`${API_BASE}/api/clients/avatar`,fd,{withCredentials:true,headers:{...headersWithU}}); const url=data?.avatar_url??data?.url??""; if(url||url===""){ if(url) localStorage.setItem("clientAvatarUrl",url); else localStorage.removeItem("clientAvatarUrl"); window.dispatchEvent(new CustomEvent("client-avatar-updated",{detail:{url}})); } return url; }catch{ try{ const dataUrl=await fileToDataUrl(file); const {data}=await axios.post(`${API_BASE}/api/clients/avatar`,{data_url:dataUrl,file_name:`avatar_${Date.now()}.png`,mime:"image/png"},{withCredentials:true,headers:{ "Content-Type":"application/json",Accept:"application/json",...headersWithU },maxBodyLength:Infinity}); const url=data?.avatar_url??data?.url??""; if(url||url===""){ if(url) localStorage.setItem("clientAvatarUrl",url); else localStorage.removeItem("clientAvatarUrl"); window.dispatchEvent(new CustomEvent("client-avatar-updated",{detail:{url}})); } return url; }catch{ return ""; } } };

  const removeAvatarServer=async()=>{ try{ const {data}=await axios.delete(`${API_BASE}/api/clients/avatar`,{withCredentials:true,headers:headersWithU}); const url=data?.avatar_url||""; if(url===""||url==null){ localStorage.removeItem("clientAvatarUrl"); window.dispatchEvent(new CustomEvent("client-avatar-updated",{detail:{url:""}})); } return true; }catch{ return false; } };

  const postNotification=async(payload)=>{ try{ await axios.post(`${API_BASE}/api/notifications`,payload,{withCredentials:true,headers:headersWithU}); localStorage.setItem("client_has_unread","1"); window.dispatchEvent(new Event("client-notifications-refresh")); }catch{ localStorage.setItem("client_has_unread","1"); window.dispatchEvent(new Event("client-notifications-refresh")); } };
  const createNotification=async(p)=>postNotification({ title:p.title||"Notification", message:p.message||"", type:"Profile" });
  const flash=()=>{ setSaved(true); setSavedProfile(true); setTimeout(()=>{ setSaved(false); setSavedProfile(false); },1500); };
  const flashSocial=()=>{ setSaved(true); setSavedSocial(true); setTimeout(()=>{ setSaved(false); setSavedSocial(false); },1500); };

  const onSaveProfile=async()=>{ if(!canSaveProfile) return; setSavingProfile(true); setSaving(true); setSaved(false);
    let didAvatarUpload=false, didAvatarRemove=false, didPhoneChange=false, didDobChange=false;
    try{
      if(avatarFile){ const u=await uploadAvatar(avatarFile); if(!u) setAvatarBroken(true); setAvatarFile(null); setAvatarRemoved(false); didAvatarUpload=!!u; }
      else if(avatarRemoved){ const ok=await removeAvatarServer(); setAvatarRemoved(false); setAvatarBroken(true); if(ok) didAvatarRemove=true; }
      if(phoneDirty||dobDirty){
        const payload={}; if(phoneDirty) payload.phone=form.phone||""; if(dobDirty) payload.date_of_birth=form.date_of_birth||null;
        const {data}=await axios.post(`${API_BASE}/api/clients/profile`,payload,{withCredentials:true,headers:{ "Content-Type":"application/json",...headersWithU }});
        setBase((b)=>({ ...(b||{}), first_name:data?.first_name||form.first_name, last_name:data?.last_name||form.last_name, email:data?.email_address||form.email, phone:phoneDirty?(data?.phone??payload.phone??""):(b?.phone??form.phone), facebook:b?.facebook??form.facebook, instagram:b?.instagram??form.instagram, date_of_birth:dobDirty?(data?.date_of_birth?String(data.date_of_birth).slice(0,10):payload.date_of_birth||""):(b?.date_of_birth??form.date_of_birth) }));
        setPhoneTaken(false); didPhoneChange=phoneDirty; didDobChange=dobDirty;
      }
      if(didAvatarUpload) await createNotification({ title:"Profile picture updated", message:"You changed your profile picture." });
      if(didAvatarRemove) await createNotification({ title:"Profile picture removed", message:"Your profile picture was removed." });
      if(didPhoneChange&&form.phone) await createNotification({ title:"Contact number updated", message:"Your contact number has been updated." });
      if(didPhoneChange&&!form.phone) await createNotification({ title:"Contact number removed", message:"Your contact number has been removed." });
      if(didDobChange) await createNotification({ title:"Birthdate updated", message:"Your birthdate has been updated." });
      flash();
    }catch(e){ const msg=(e?.response?.data?.message||e?.message||"").toLowerCase(); if(msg.includes("contact number already in use")){ setPhoneTaken(true); setEditingPhone(true); setPhoneEditCommitted(false); } }
    setSavingProfile(false); setSaving(false);
  };

  const onSaveSocial=async()=>{ if(!socialDirty) return;
    setSocialTouched((t)=>({ facebook:t.facebook||facebookDirty, instagram:t.instagram||instagramDirty }));
    const payload={};
    if(facebookDirty){ const nfb=normalizeSocialUrl(form.facebook); if(form.facebook&&!nfb){ setSocialTouched((t)=>({ ...t, facebook:true })); return; } payload.facebook=nfb; }
    if(instagramDirty){ const nig=normalizeSocialUrl(form.instagram); if(form.instagram&&!nig){ setSocialTouched((t)=>({ ...t, instagram:true })); return; } payload.instagram=nig; }
    const fbReady=!("facebook" in payload)||payload.facebook==null||isValidFacebookUrl(payload.facebook), igReady=!("instagram" in payload)||payload.instagram==null||isValidInstagramUrl(payload.instagram);
    if(!fbReady||!igReady||savingSocial||facebookTaken||instagramTaken) return;
    setSavingSocial(true); setSaving(true); setSaved(false);
    try{
      const {data}=await axios.post(`${API_BASE}/api/clients/profile`,payload,{withCredentials:true,headers:{ "Content-Type":"application/json",Accept:"application/json",...headersWithU }});
      const prevFb=base?.facebook||"", prevIg=base?.instagram||"", nextFb=data?.facebook??payload.facebook??form.facebook, nextIg=data?.instagram??payload.instagram??form.instagram;
      setBase((b)=>({ ...(b||{}), first_name:data?.first_name||form.first_name, last_name:data?.last_name||form.last_name, email:data?.email_address||form.email, phone:b?.phone??form.phone, facebook:nextFb, instagram:nextIg, date_of_birth:b?.date_of_birth??form.date_of_birth }));
      setFacebookTaken(false); setInstagramTaken(false); setEditSocial({ facebook:false, instagram:false }); flashSocial();
      if(facebookDirty){ if(prevFb&&!nextFb) await createNotification({ title:"Facebook link removed", message:"Your Facebook link has been removed." });
        else if(!prevFb&&nextFb) await createNotification({ title:"Facebook link added", message:"Your Facebook link has been added." });
        else await createNotification({ title:"Facebook link updated", message:"Your Facebook link has been updated." }); }
      if(instagramDirty){ if(prevIg&&!nextIg) await createNotification({ title:"Instagram link removed", message:"Your Instagram link has been removed." });
        else if(!prevIg&&nextIg) await createNotification({ title:"Instagram link added", message:"Your Instagram link has been added." });
        else await createNotification({ title:"Instagram link updated", message:"Your Instagram link has been updated." }); }
    }catch(e){ const msg=(e?.response?.data?.message||e?.message||"").toLowerCase(); if(msg.includes("facebook")) setFacebookTaken(true); if(msg.includes("instagram")) setInstagramTaken(true);
      setSocialTouched((t)=>({ facebook:t.facebook||!!payload.facebook, instagram:t.instagram||!!payload.instagram })); }
    setSavingSocial(false); setSaving(false);
  };

  const openConfirm=(scope)=>{ setConfirmScope(scope); setConfirmOpen(true); };
  const confirmSave=async()=>{ if(confirmScope==="profile") await onSaveProfile(); else if(confirmScope==="social") await onSaveSocial(); setConfirmOpen(false); };
  const canModalSave=confirmScope==="profile"?canSaveProfile:confirmScope==="social"?canSaveSocial:false;

  const fbErr=(!facebookValid||facebookTaken)&&socialTouched.facebook, igErr=(!instagramValid||instagramTaken)&&socialTouched.instagram;

  return (
    <main className="min-h-[65vh] pb-24 md:pb-10">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div><h2 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">Profile</h2><p className="mt-1 text-sm text-gray-600">Manage your personal details and social links</p></div>
          <div className="text-right"><div className="text-xs uppercase tracking-wide text-gray-500">Account Created</div>
            <div ref={jdkRowRef} className="mt-1 flex items-center justify-end gap-2"><p className="text-sm text-gray-700">{createdAt||"—"}</p><span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Active</span></div>
          </div>
        </div>
      </div>

      <section className="w-full rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-6 md:p-8 mb-6 shadow-sm">
        <div ref={gridRef} className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          <div className="md:col-span-1">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center"><p className="text-sm font-semibold text-gray-900">Profile Picture</p></div>
              <div className="relative">
                <div className="rounded-full ring-2 ring-gray-200 bg-gray-100 overflow-hidden shadow-sm" style={{ width:avatarSize, height:avatarSize }}>
                  <img src={avatarUrl} alt="Avatar" onError={()=>setAvatarBroken(true)} className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col items-center gap-2">
              {!hasAvatar ? <>
                <button ref={btnRef} type="button" onClick={()=>fileRef.current?.click()} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-4 py-2.5 text-sm font-medium hover:bg-blue-50 active:bg-blue-100 transition shadow-sm" style={{width:btnFixedWidth}}>Upload Photo</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]||null; if(!f||f.size===0) return; setAvatarFile(f); setAvatarRemoved(false); setAvatarBroken(false); }} />
              </> : <>
                <button ref={btnRef} type="button" onClick={()=>fileRef.current?.click()} className="inline-flex items-center justify-center rounded-xl border border-[#008cfc] text-[#008cfc] px-4 py-2.5 text-sm font-medium hover:bg-blue-50 active:bg-blue-100 transition shadow-sm" style={{width:btnFixedWidth}}>Change</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]||null; if(!f||f.size===0) return; setAvatarFile(f); setAvatarRemoved(false); setAvatarBroken(false); }} />
                <button type="button" onClick={()=>{ setAvatarFile(null); setAvatarRemoved(true); setAvatarBroken(true); }} className="inline-flex items-center justify-center rounded-xl border border-red-500 text-red-600 px-4 py-2.5 text-sm font-medium hover:bg-red-50 active:bg-red-100 transition shadow-sm" style={{width:btnFixedWidth}}>Remove</button>
              </>}
            </div>
          </div>

          <div className="md:col-span-1" style={{ marginTop:alignOffset }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="w-full">
                <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs uppercase tracking-wide font-semibold text-gray-600">First Name</p><p className="mt-1 text-base text-gray-900">{form.first_name||"—"}</p></div>
                <div className="mt-4 rounded-xl border border-gray-200 p-4 min-h-[170px]">
                  <p className="text-xs uppercase tracking-wide font-semibold text-gray-600">Contact Number</p>
                  {!editingPhone && (<div className="mt-2">{form.phone&&!phoneTaken?
                    <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 border border-gray-200"><img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm object-cover"/><span className="text-gray-700 text-sm">+63</span><span className="text-base text-gray-900 tracking-wide">{form.phone}</span></div>:
                    <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-gray-300 text-gray-400"><span className="text-sm">+63</span><span className="text-sm">mm/dd/yyyy</span></div>}</div>)}
                  {(!form.phone||phoneTaken)&&!editingPhone && (<div className="mt-3 flex items-center gap-3">
                    <button type="button" onClick={()=>{ setEditingPhone(true); setPhoneEditCommitted(false); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-lg border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">+ Add contact number</button>
                  </div>)}
                  {form.phone&&!phoneTaken&&!editingPhone && (<div className="mt-3 flex items-center gap-3">
                    <button type="button" onClick={()=>{ setEditingPhone(true); setPhoneEditCommitted(false); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-lg border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                    <button type="button" onClick={()=>{ setForm({...form,phone:""}); setPhoneTaken(false); setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-3.5 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                  </div>)}
                  {(editingPhone||!!form.phone)&&editingPhone && (<div className="mt-3 w-full max-w=[280px]">
                    <div className={`flex items-center rounded-lg border ${showPhoneError||phoneTaken?"border-red-500":"border-gray-300"} overflow-hidden pl-3 pr-3 h-11 focus-within:ring-2 ${showPhoneError||phoneTaken?"focus-within:ring-red-500":"focus-within:ring-blue-500"}`}>
                      <img src="philippines.png" alt="PH" className="h-5 w-7 rounded-sm mr-2 object-cover"/><span className="text-gray-700 text-sm mr-3">+63</span><span className="h-6 w-px bg-gray-200 mr-3"/><input type="tel" value={form.phone} onChange={(e)=>{ setForm({...form,phone:e.target.value.replace(/\D/g,"").slice(0,10)}); setPhoneTaken(false); }} placeholder="9XXXXXXXXX" className="w-full outline-none text-sm placeholder:text-gray-400 h-full bg-transparent"/>
                    </div>
                    {showPhoneError && <div className="mt-2 text-xs text-red-600">Enter a valid PH mobile number with a real prefix.</div>}
                    {phoneTaken && <div className="mt-2 text-xs text-red-600">Contact number already in use.</div>}
                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" onClick={()=>{ if(!isPhoneValid||phoneTaken){ setPhoneErrorAfterDone(true); return; } setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); }} className={`rounded-lg px-4 text-sm font-medium transition h-10 ${!isPhoneValid||phoneTaken?"bg-[#008cfc] text-white opacity-50 cursor-not-allowed":"bg-[#008cfc] text-white hover:bg-blue-700"}`}>Done</button>
                      <button type="button" onClick={()=>{ setForm({...form,phone:base?.phone||""}); setEditingPhone(false); setPhoneEditCommitted(true); setPhoneErrorAfterDone(false); setPhoneTaken(false); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                    </div>
                  </div>)}
                </div>
              </div>

              <div className="w-full">
                <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs uppercase tracking-wide font-semibold text-gray-600">Last Name</p><p className="mt-1 text-base text-gray-900">{form.last_name||"—"}</p></div>
                <div className="mt-4 rounded-xl border border-gray-200 p-4 relative min-h-[170px]" ref={dpRef}>
                  <p className="text-xs uppercase tracking-wide font-semibold text-gray-600">Date of Birth</p>
                  {!editingDob && (<>
                    <div className="mt-2">{form.date_of_birth?
                      <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 border border-gray-200"><span className="text-base text-gray-900 tracking-wide">{toMDY(new Date(form.date_of_birth))}</span></div>:
                      <div className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-gray-300 text-gray-400"><span className="text-sm">mm/dd/yyyy</span></div>}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      {!form.date_of_birth?
                        <button type="button" onClick={()=>{ setEditingDob(true); openCalendar(); }} className="inline-flex items-center justify-center rounded-lg border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">+ Add date of birth</button>:
                        <>
                          <button type="button" onClick={()=>{ setEditingDob(true); openCalendar(); }} className="inline-flex items-center justify-center rounded-lg border border-[#008cfc] text-[#008cfc] px-3.5 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                          <button type="button" onClick={()=>{ setForm((f)=>({ ...f, date_of_birth:"" })); setDobError(""); setEditingDob(false); setDobEditCommitted(true); setDpOpen(false); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-3.5 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                        </>}
                    </div>
                  </>)}

                  {editingDob && (<>
                    <div className="mt-2 flex items-center rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 h-11">
                      <input type="text" value={form.date_of_birth?toMDY(new Date(form.date_of_birth)):""} onFocus={openCalendar} readOnly placeholder="mm/dd/yyyy" title={`Allowed: ${minDOBLabel} to ${maxDOBLabel} (21–55 years old)`} className="w-full px-4 rounded-l-lg focus:outline-none bg-white" inputMode="none"/>
                      <button type="button" onClick={openCalendar} className="px-3 pr-4 text-gray-600 hover:text-gray-800" aria-label="Open calendar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" /><path d="M18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z" /></svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Must be between <span className="font-medium">{minDOBLabel}</span> and <span className="font-medium">{maxDOBLabel}</span> (21–55 yrs).</p>
                    {form.date_of_birth&&!isBirthdateValid && <p className="text-xs text-red-600 mt-1">Birthdate must make you between 21 and 55 years old.</p>}

                    {dpOpen && (<div className="absolute z-50 mt-2 w=[300px] w-[300px] rounded-xl border border-gray-200 bg-white shadow-2xl p-3">
                      <div className="flex items-center justify-between px-2 pb-2">
                        <button type="button" onClick={()=>canGoPrev()&&setDpView(addMonths(dpView,-1))} className={`p-2 rounded-lg hover:bg-gray-100 ${canGoPrev()?"text-gray-700":"text-gray-300 cursor-not-allowed"}`} aria-label="Previous month">‹</button>
                        <div className="flex items中心 gap-2">
                          <select className="border border-gray-300 rounded-md px-2 py-1 text-sm" value={dpView.getMonth()} onChange={(e)=>setMonthYear(parseInt(e.target.value,10),dpView.getFullYear())}>{monthsList.map((m,i)=>(<option key={m} value={i}>{m}</option>))}</select>
                          <select className="border border-gray-300 rounded-md px-2 py-1 text-sm" value={dpView.getFullYear()} onChange={(e)=>setMonthYear(dpView.getMonth(),parseInt(e.target.value,10))}>{yearsList.map((y)=>(<option key={y} value={y}>{y}</option>))}</select>
                        </div>
                        <button type="button" onClick={()=>canGoNext()&&setDpView(addMonths(dpView,1))} className={`p-2 rounded-lg hover:bg-gray-100 ${canGoNext()?"text-gray-700":"text-gray-300 cursor-not-allowed"}`} aria-label="Next month">›</button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 px-2">{["Su","Mo","Tu","We","Th","Fr","Sa"].map((d)=>(<div key={d} className="py-1">{d}</div>))}</div>

                      {(()=>{ const first=startOfMonth(dpView), last=endOfMonth(dpView), offset=first.getDay(), total=offset+last.getDate(), rows=Math.ceil(total/7), selected=form.date_of_birth?new Date(form.date_of_birth):null, cells=[];
                        for(let r=0;r<rows;r++){ const row=[]; for(let c=0;c<7;c++){ const idx=r*7+c, day=idx-offset+1;
                          if(day<1||day>last.getDate()) row.push(<div key={`x-${r}-${c}`} className="py-2" />); else { const d=new Date(dpView.getFullYear(),dpView.getMonth(),day), dis=!inRange(d), sel=selected&&isSameDay(selected,d);
                            row.push(<button key={`d-${day}`} type="button" disabled={dis} onClick={()=>{ const ymd=toYMD(d); setForm((f)=>({ ...f, date_of_birth:ymd })); setDobError(validateDob(ymd)); setDpOpen(false); }} className={["py-2 rounded-lg transition text-sm w-9 h-9 mx-auto", dis?"text-gray-300 cursor-not-allowed":"hover:bg-blue-50 text-gray-700", sel&&!dis?"bg-blue-600 text-white hover:bg-blue-600":""].join(" ")}>{day}</button>); } }
                          cells.push(<div key={`r-${r}`} className="grid grid-cols-7 gap-1 px-2">{row}</div>); }
                        return <div className="mt-1">{cells}</div>; })()}

                      <div className="flex items-center justify-between mt-3 px-2">
                        <button type="button" onClick={()=>{ setForm((f)=>({ ...f, date_of_birth:"" })); setDobError(""); setDpOpen(false); }} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                        <button type="button" onClick={()=>{ setDpView(new Date(maxDOBDate)); }} className="text-xs text-blue-600 hover:text-blue-700">Jump to latest allowed</button>
                      </div>
                    </div>)}

                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" onClick={()=>{ if(form.date_of_birth&&!isBirthdateValid) return; setEditingDob(false); setDobEditCommitted(true); setDpOpen(false); }} className={`rounded-lg px-4 text-sm font-medium transition h-10 ${form.date_of_birth&&!isBirthdateValid?"bg-[#008cfc] text-white opacity-50 cursor-not-allowed":"bg-[#008cfc] text-white hover:bg-blue-700"}`}>Done</button>
                      <button type="button" onClick={()=>{ setForm((f)=>({ ...f, date_of_birth:base?.date_of_birth||"" })); setDobError(""); setEditingDob(false); setDobEditCommitted(true); setDpOpen(false); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>
                    </div>
                  </>)}
                </div>
              </div>

              <div className="w-full">
                <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs uppercase tracking-wide font-semibold text-gray-600">Email</p><p className="mt-1 text-base text-gray-900 break-all">{form.email||"—"}</p></div>
                <div className="mt-4 rounded-xl border border-gray-200 p-4"><p className="text-xs uppercase tracking-wide font-semibold text-gray-600">Age</p><p className="mt-1 text-base text-gray-900">{age!=null?`${age}`:"—"}</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {savedProfile ? <span className="text-sm text-blue-700">Saved</span> : null}
          <button type="button" disabled={!canSaveProfile} onClick={()=>openConfirm("profile")} className={`rounded-lg px-5 py-2.5 text-sm font-medium transition shadow-sm ${canSaveProfile?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>{savingProfile?"Saving...":"Confirm"}</button>
        </div>
      </section>

      <section className="w-full rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-6 md:p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-semibold text-gray-900 tracking-tight">Social Media</h3>{savedSocial?<span className="text-sm text-blue-700">Saved</span>:null}</div>

        <div className="grid grid-cols-[220px_1fr_220px] gap-6">
          <div className="col-span-3 grid grid-cols-subgrid items-start">
            <div className="flex items-center gap-2"><FaFacebookF className="text-blue-600"/><span className="text-xs uppercase tracking-wide font-semibold text-gray-600">Facebook</span></div>
            <div>
              {!base?.facebook||editSocial.facebook ? <>
                <input type="url" placeholder="https://facebook.com/username" value={form.facebook} onChange={(e)=>{ setForm({...form,facebook:e.target.value}); setFacebookTaken(false); }} onBlur={()=>setSocialTouched((s)=>({ ...s, facebook:true }))} className={`w-full px-4 py-2.5 h-11 border rounded-xl focus:outline-none focus:ring-2 ${(!facebookValid||facebookTaken)&&socialTouched.facebook?"border-red-500 focus:ring-red-500":"border-gray-300 focus:ring-blue-500"}`}/>
                {(!facebookValid||facebookTaken)&&socialTouched.facebook && <div className="mt-1 text-xs text-red-600">Enter a valid Facebook profile URL.</div>}
              </> : <a href={base.facebook} target="_blank" rel="noreferrer" className="text-md text-blue-700 break-all hover:underline">{base.facebook}</a>}
            </div>
            <div className="flex items-center gap-3 justify-end">
              {!base?.facebook||editSocial.facebook ? (base?.facebook?
                <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, facebook:false })); setForm((f)=>({ ...f, facebook:base.facebook })); setFacebookTaken(false); setSocialTouched((t)=>({ ...t, facebook:false })); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>:null)
                : <>
                    <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, facebook:true })); setSocialTouched((t)=>({ ...t, facebook:false })); }} className="inline-flex items-center justify-center rounded-lg border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                    <button type="button" onClick={()=>{ setForm((f)=>({ ...f, facebook:"" })); setEditSocial((s)=>({ ...s, facebook:true })); setSocialTouched((t)=>({ ...t, facebook:true })); setFacebookTaken(false); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                  </>}
            </div>
          </div>

          <div className="col-span-3 h-px bg-gray-200" />

          <div className="col-span-3 grid grid-cols-subgrid items-start">
            <div className="flex items-center gap-2"><FaInstagram className="text-pink-500"/><span className="text-xs uppercase tracking-wide font-semibold text-gray-600">Instagram</span></div>
            <div>
              {!base?.instagram||editSocial.instagram ? <>
                <input type="url" placeholder="https://instagram.com/username" value={form.instagram} onChange={(e)=>{ setForm({...form,instagram:e.target.value}); setInstagramTaken(false); }} onBlur={()=>setSocialTouched((s)=>({ ...s, instagram:true }))} className={`w-full px-4 py-2.5 h-11 border rounded-xl focus:outline-none focus:ring-2 ${(!instagramValid||instagramTaken)&&socialTouched.instagram?"border-red-500 focus:ring-red-500":"border-gray-300 focus:ring-blue-500"}`}/>
                {(!instagramValid||instagramTaken)&&socialTouched.instagram && <div className="mt-1 text-xs text-red-600">Enter a valid Instagram profile URL.</div>}
              </> : <a href={base.instagram} target="_blank" rel="noreferrer" className="text-md text-blue-700 break-all hover:underline">{base.instagram}</a>}
            </div>
            <div className="flex items-center gap-3 justify-end">
              {!base?.instagram||editSocial.instagram ? (base?.instagram?
                <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, instagram:false })); setForm((f)=>({ ...f, instagram:base.instagram })); setInstagramTaken(false); setSocialTouched((t)=>({ ...t, instagram:false })); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Cancel</button>:null)
                : <>
                    <button type="button" onClick={()=>{ setEditSocial((s)=>({ ...s, instagram:true })); setSocialTouched((t)=>({ ...t, instagram:false })); }} className="inline-flex items-center justify-center rounded-lg border border-[#008cfc] text-[#008cfc] px-4 py-2 text-sm font-medium hover:bg-blue-50">Change</button>
                    <button type="button" onClick={()=>{ setForm((f)=>({ ...f, instagram:"" })); setEditSocial((s)=>({ ...s, instagram:true })); setSocialTouched((t)=>({ ...t, instagram:true })); setInstagramTaken(false); }} className="inline-flex items-center justify-center rounded-lg border border-red-500 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50">Remove</button>
                  </>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" disabled={!canSaveSocial} onClick={()=>openConfirm("social")} className={`rounded-lg px-5 py-2.5 text-sm font-medium transition shadow-sm ${canSaveSocial?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>{savingSocial?"Saving...":"Confirm"}</button>
        </div>
      </section>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setConfirmOpen(false)} />
          <div className="relative z-[101] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">Save changes?</h4>
            <p className="mt-1 text-sm text-gray-600">Are you sure saving these changes?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={()=>setConfirmOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={!canModalSave} onClick={()=>{ if(canModalSave) confirmSave(); }} className={`rounded-lg px-5 py-2 text-sm font-medium transition ${canModalSave?"bg-[#008cfc] text-white hover:bg-blue-700":"bg-[#008cfc] text-white opacity-60 cursor-not-allowed"}`}>
                {confirmScope==="profile"?(savingProfile?"Saving...":"Save"):(savingSocial?"Saving...":"Save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
