const { supabase, supabaseAdmin } = require("../supabaseClient");

function stripTrailingSlash(p){return p.endsWith("/")?p.slice(0,-1):p}
function normalizeFacebook(url){try{const raw=String(url).trim();const src=/^https?:\/\//i.test(raw)?raw:"https://"+raw;const u=new URL(src);let host=u.hostname.toLowerCase();if(host==="m.facebook.com"||host==="www.facebook.com"||host==="fb.com"||"www.fb.com"===host)host="facebook.com";const isId=u.pathname==="/profile.php"&&u.searchParams.has("id");if(isId)return`https://${host}/profile.php?id=${u.searchParams.get("id")}`;const seg=u.pathname.split("/").filter(Boolean)[0]||"";if(!seg)return`https://${host}`;return`https://${host}/${stripTrailingSlash(seg)}`}catch{return String(url||"").trim()}}
function normalizeInstagram(url){try{const raw=String(url).trim();const src=/^https?:\/\//i.test(raw)?raw:"https://"+raw;const u=new URL(src);let host=u.hostname.toLowerCase();if(host==="www.instagram.com"||host==="m.instagram.com")host="instagram.com";const seg=u.pathname.split("/").filter(Boolean)[0]||"";if(!seg)return`https://${host}`;return`https://${host}/${stripTrailingSlash(seg)}`}catch{return String(url||"").trim()}}
function computeAge(iso){if(!iso)return null;const d=new Date(String(iso));if(isNaN(d.getTime()))return null;const t=new Date();let a=t.getFullYear()-d.getFullYear();const m=t.getMonth()-d.getMonth();if(m<0||(m===0&&t.getDate()<d.getDate()))a--;return a>=0&&a<=120?a:null}
async function getAuthUserById(auth_uid){if(!auth_uid)return null;const{data,error}=await supabaseAdmin.auth.admin.getUserById(auth_uid);if(error)return null;return data?.user||null}

const createClient=async(auth_uid,firstName,lastName,sex,email,password,isAgreedToTerms,agreedAt)=>{const{data,error}=await supabaseAdmin.from("user_client").insert([{auth_uid,first_name:firstName,last_name:lastName,sex,email_address:String(email||"").trim().toLowerCase(),password,is_agreed_to_terms:isAgreedToTerms,agreed_at:agreedAt,contact_number:null,social_facebook:null,social_instagram:null,profile_picture:null,created_at:new Date().toISOString()}]);if(error)throw error;return data};
const checkEmailExistence=async(email)=>{const e=String(email||"").trim().toLowerCase();const{data,error}=await supabaseAdmin.from("user_client").select("*").ilike("email_address",e);if(error)throw error;return data};
const checkEmailExistenceAcrossAllUsers=async(email)=>{const e=String(email||"").trim().toLowerCase();const{data:cd,error:ce}=await supabaseAdmin.from("user_client").select("*").ilike("email_address",e);if(ce)throw ce;const{data:wd,error:we}=await supabaseAdmin.from("user_worker").select("*").ilike("email_address",e);if(we)throw we;return[...(cd||[]),...(wd||[])]};
const getByAuthUid=async(auth_uid)=>{const{data,error}=await supabaseAdmin.from("user_client").select("*").eq("auth_uid",auth_uid).limit(1);if(error)throw error;return data&&data[0]?data[0]:null};
const getByEmail=async(email)=>{const e=String(email||"").trim().toLowerCase();if(!e)return null;const{data,error}=await supabaseAdmin.from("user_client").select("*").ilike("email_address",e).limit(1);if(error)throw error;return data&&data[0]?data[0]:null};

const getClientAccountProfile=async({auth_uid,email})=>{
  const row=auth_uid?await getByAuthUid(auth_uid):await getByEmail(email);
  const user=await getAuthUserById(row?.auth_uid||auth_uid);
  const created_at=row?.created_at||user?.created_at||null;
  const dob=row?.date_of_birth||user?.user_metadata?.date_of_birth||null;
  const age=row?.age!=null?row.age:computeAge(dob);
  return{
    first_name:row?.first_name||user?.user_metadata?.first_name||"",
    last_name:row?.last_name||user?.user_metadata?.last_name||"",
    email_address:row?.email_address||user?.email||email||"",
    sex:row?.sex||user?.user_metadata?.sex||"",
    phone:row?.contact_number??row?.phone??"",
    facebook:row?.social_facebook??row?.facebook??"",
    instagram:row?.social_instagram??row?.instagram??"",
    auth_uid:row?.auth_uid||(user?.id??""),
    created_at,
    date_of_birth:dob,
    age,
    profile_picture:row?.profile_picture||null
  }
};

const updatePassword=async(auth_uid,password)=>{const{error}=await supabaseAdmin.from("user_client").update({password}).eq("auth_uid",auth_uid);if(error)throw error;return true};
const updateAuthPassword=async(auth_uid,new_password)=>{const{error}=await supabaseAdmin.auth.admin.updateUserById(auth_uid,{password:new_password});if(error)throw error;return true};
const updateClientProfile=async(auth_uid,patch)=>{const{data,error}=await supabaseAdmin.from("user_client").update(patch).eq("auth_uid",auth_uid).select("*").limit(1);if(error)throw error;return data&&data[0]?data[0]:null};
const updateAuthUserMeta=async(auth_uid,patch)=>{const user=await getAuthUserById(auth_uid);const base=user?.user_metadata||{};const next={...base,...patch};const{error}=await supabaseAdmin.auth.admin.updateUserById(auth_uid,{user_metadata:next});if(error)throw error;return true};

async function isContactNumberTakenAcrossAll(phone,excludeAuthUid){const p=String(phone||"").trim();if(!p)return false;const q1=supabaseAdmin.from("user_client").select("auth_uid,contact_number");const q2=supabaseAdmin.from("user_worker").select("auth_uid,contact_number");const[{data:c,error:ec},{data:w,error:ew}]=await Promise.all([q1,q2]);if(ec)throw ec;if(ew)throw ew;const hits=[...(c||[]),...(w||[])].filter(r=>String(r.contact_number||"")===p).map(r=>r.auth_uid).filter(Boolean);if(!hits.length)return false;if(!excludeAuthUid)return true;return hits.some(uid=>uid!==excludeAuthUid)}
function buildVariants(kind,canon){try{const u=new URL(canon);const path=u.pathname+(u.search||"");if(kind==="facebook"){const hosts=["facebook.com","www.facebook.com","m.facebook.com","fb.com","www.fb.com"];return hosts.map(h=>`https://${h}${path}`).flatMap(x=>[x,x.endsWith("/")?x:x+"/"])}else{const hosts=["instagram.com","www.instagram.com","m.instagram.com"];return hosts.map(h=>`https://${h}${path}`).flatMap(x=>[x,x.endsWith("/")?x:x+"/"])}}catch{return[canon,canon.endsWith("/")?canon:canon+"/"]}}
async function isSocialLinkTakenAcrossAll(kind,value,excludeAuthUid){const raw=String(value||"").trim();if(!raw)return false;const canon=kind==="facebook"?normalizeFacebook(raw):normalizeInstagram(raw);const col1=kind==="facebook"?"social_facebook":"social_instagram";const legacy1=kind==="facebook"?"facebook":"instagram";function buildOr(cols,pats){const segs=[];for(const col of cols)for(const p of pats)segs.push(`${col}.ilike.*${p}*`);return segs.join(",")}let hitAuthUid=null;try{const variants=buildVariants(kind,canon);const orStr=buildOr([col1,legacy1],variants)||`${col1}.is.null`;const q1=supabaseAdmin.from("user_client").select(`auth_uid, ${col1}, ${legacy1}`).or(orStr);const q2=supabaseAdmin.from("user_worker").select(`auth_uid, ${col1}, ${legacy1}`).or(orStr);const[{data:c,error:ec},{data:w,error:ew}]=await Promise.all([q1,q2]);if(ec||ew)throw ec||ew;const all=[...(c||[]),...(w||[])];for(const r of all){const vals=[r[col1],r[legacy1]].filter(Boolean).map(String);if(vals.some(v=>(kind==="facebook"?normalizeFacebook(v):normalizeInstagram(v)).toLowerCase()===canon.toLowerCase())){hitAuthUid=r.auth_uid||null;break}}}catch{const q1=supabaseAdmin.from("user_client").select(`auth_uid, ${col1}, ${legacy1}`).limit(1000);const q2=supabaseAdmin.from("user_worker").select(`auth_uid, ${col1}, ${legacy1}`).limit(1000);const[{data:c2},{data:w2}]=await Promise.all([q1,q2]);const all=[...(c2||[]),...(w2||[])];for(const r of all){const vals=[r[col1],r[legacy1]].filter(Boolean).map(String);if(vals.some(v=>(kind==="facebook"?normalizeFacebook(v):normalizeInstagram(v)).toLowerCase()===canon.toLowerCase())){hitAuthUid=r.auth_uid||null;break}}}if(!hitAuthUid)return false;if(!excludeAuthUid)return true;return hitAuthUid!==excludeAuthUid}

module.exports={createClient,checkEmailExistence,checkEmailExistenceAcrossAllUsers,getByAuthUid,getByEmail,getClientAccountProfile,updatePassword,updateAuthPassword,updateClientProfile,updateAuthUserMeta,isContactNumberTakenAcrossAll,isSocialLinkTakenAcrossAll,normalizeFacebook,normalizeInstagram};
