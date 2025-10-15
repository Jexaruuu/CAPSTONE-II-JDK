const { supabase, supabaseAdmin, ensureStorageBucket } = require("../supabaseClient");

const CLIENT_BUCKET="client-avatars";
const WORKER_BUCKET="worker-avatars";

function parseDataUrl(s){const m=/^data:(.+?);base64,(.*)$/i.exec(String(s||"").trim());if(!m)return null;return{contentType:m[1],buf:Buffer.from(m[2],"base64")};}
function extFrom(contentType){if(contentType==="image/png")return"png";if(contentType==="image/webp")return"webp";if(contentType==="image/jpeg"||contentType==="image/jpg")return"jpg";return"bin";}
function stripTrailingSlash(p){return p.endsWith("/")?p.slice(0,-1):p;}

function normalizeFacebook(url){
  try{
    const raw=String(url).trim();const src=/^https?:\/\//i.test(raw)?raw:"https://"+raw;
    const u=new URL(src);let host=u.hostname.toLowerCase();
    if(host==="m.facebook.com"||host==="www.facebook.com"||host==="fb.com"||"www.fb.com"===host)host="facebook.com";
    const isId=u.pathname==="/profile.php"&&u.searchParams.has("id");
    if(isId)return`https://${host}/profile.php?id=${u.searchParams.get("id")}`;
    const seg=u.pathname.split("/").filter(Boolean)[0]||"";
    if(!seg)return`https://${host}`;
    return`https://${host}/${stripTrailingSlash(seg)}`;
  }catch{return String(url||"").trim();}
}

function normalizeInstagram(url){
  try{
    const raw=String(url).trim();const src=/^https?:\/\//i.test(raw)?raw:"https://"+raw;
    const u=new URL(src);let host=u.hostname.toLowerCase();
    if(host==="www.instagram.com"||host==="m.instagram.com")host="instagram.com";
    const seg=u.pathname.split("/").filter(Boolean)[0]||"";
    if(!seg)return`https://${host}`;
    return`https://${host}/${stripTrailingSlash(seg)}`;
  }catch{return String(url||"").trim();}
}

function fbKey(url){
  try{
    const u=new URL(String(url).trim());
    if(u.hostname.includes("facebook")||u.hostname.includes("fb.com")){
      if(u.pathname==="/profile.php"&&u.searchParams.has("id"))return`id:${u.searchParams.get("id")}`;
      const seg=u.pathname.split("/").filter(Boolean)[0]||"";
      if(seg)return`user:${seg.toLowerCase()}`;
    }
  }catch{}
  return"";
}
function igKey(url){
  try{
    const u=new URL(String(url).trim());
    if(u.hostname.includes("instagram")){
      const seg=u.pathname.split("/").filter(Boolean)[0]||"";
      if(seg)return seg.toLowerCase();
    }
  }catch{}
  return"";
}

function computeAge(iso){
  if(!iso)return null;
  const d=new Date(String(iso));
  if(isNaN(d.getTime()))return null;
  const t=new Date();
  let a=t.getFullYear()-d.getFullYear();
  const m=t.getMonth()-d.getMonth();
  if(m<0||(m===0&&t.getDate()<d.getDate()))a--;
  return a>=0&&a<=120?a:null;
}

async function getClientByAuthOrEmail({auth_uid,email}){let q=supabaseAdmin.from("user_client").select("*").limit(1);if(auth_uid)q=q.eq("auth_uid",auth_uid);else if(email)q=q.eq("email_address",email);const{data,error}=await q;if(error)throw error;return data&&data[0]?data[0]:null;}
async function getWorkerByAuthOrEmail({auth_uid,email}){let q=supabaseAdmin.from("user_worker").select("*").limit(1);if(auth_uid)q=q.eq("auth_uid",auth_uid);else if(email)q=q.eq("email_address",email);const{data,error}=await q;if(error)throw error;return data&&data[0]?data[0]:null;}
async function getAuthUserById(auth_uid){if(!auth_uid)return null;const{data,error}=await supabaseAdmin.auth.admin.getUserById(auth_uid);if(error)return null;return data?.user||null;}

async function getClientAccountProfile({auth_uid,email}){
  const row=await getClientByAuthOrEmail({auth_uid,email});
  const user=await getAuthUserById(row?.auth_uid||auth_uid);
  const created_at=row?.created_at||user?.created_at||null;
  const dob=row?.date_of_birth||user?.user_metadata?.date_of_birth||null;
  const age=row?.age!=null?row.age:computeAge(dob);
  return{
    first_name:row?.first_name||user?.user_metadata?.first_name||"",
    last_name:row?.last_name||user?.user_metadata?.last_name||"",
    email_address:row?.email_address||user?.email||email||"",
    sex:row?.sex||user?.user_metadata?.sex||"",
    avatar_url:row?.client_avatar||row?.avatar_url||user?.user_metadata?.avatar_url||"",
    phone:row?.contact_number??row?.phone??"",
    facebook:row?.social_facebook??row?.facebook??"",
    instagram:row?.social_instagram??row?.instagram??"",
    auth_uid:row?.auth_uid||auth_uid||"",
    created_at,
    date_of_birth:dob,
    age
  };
}

async function getWorkerAccountProfile({auth_uid,email}){
  const row=await getWorkerByAuthOrEmail({auth_uid,email});
  const user=await getAuthUserById(row?.auth_uid||auth_uid);
  const created_at=row?.created_at||user?.created_at||null;
  const dob=row?.date_of_birth||user?.user_metadata?.date_of_birth||null;
  const age=row?.age!=null?row.age:computeAge(dob);
  return{
    first_name:row?.first_name||user?.user_metadata?.first_name||"",
    last_name:row?.last_name||user?.user_metadata?.last_name||"",
    email_address:row?.email_address||user?.email||email||"",
    sex:row?.sex||user?.user_metadata?.sex||"",
    avatar_url:row?.worker_avatar||row?.avatar_url||user?.user_metadata?.avatar_url||"",
    phone:row?.contact_number??row?.phone??"",
    facebook:row?.social_facebook??row?.facebook??"",
    instagram:row?.social_instagram??row?.instagram??"",
    auth_uid:row?.auth_uid||auth_uid||"",
    created_at,
    date_of_birth:dob,
    age
  };
}

async function uploadClientAvatarDataUrl(auth_uid,data_url){
  const parsed=parseDataUrl(data_url); if(!parsed) throw new Error("Invalid image");
  await ensureStorageBucket(CLIENT_BUCKET,true);
  const key=`clients/${auth_uid||"unknown"}/${Date.now()}.${extFrom(parsed.contentType)}`;
  const abuf=parsed.buf.buffer.slice(parsed.buf.byteOffset,parsed.buf.byteOffset+parsed.buf.byteLength);
  const{error:upErr}=await supabaseAdmin.storage.from(CLIENT_BUCKET).upload(key,abuf,{contentType:parsed.contentType,upsert:true});
  if(upErr)throw upErr;
  const { data:pub } = supabaseAdmin.storage.from(CLIENT_BUCKET).getPublicUrl(key);
  return pub?.publicUrl||"";
}

async function uploadWorkerAvatarDataUrl(auth_uid,data_url){
  const parsed=parseDataUrl(data_url); if(!parsed) throw new Error("Invalid image");
  await ensureStorageBucket(WORKER_BUCKET,true);
  const key=`workers/${auth_uid||"unknown"}/${Date.now()}.${extFrom(parsed.contentType)}`;
  const abuf=parsed.buf.buffer.slice(parsed.buf.byteOffset,parsed.buf.byteOffset+parsed.buf.byteLength);
  const{error:upErr}=await supabaseAdmin.storage.from(WORKER_BUCKET).upload(key,abuf,{contentType:parsed.contentType,upsert:true});
  if(upErr)throw upErr;
  const { data:pub } = supabaseAdmin.storage.from(WORKER_BUCKET).getPublicUrl(key);
  return pub?.publicUrl||"";
}

async function updateClientAvatarUrl(auth_uid,avatar_url){
  const { error } = await supabaseAdmin.from("user_client").update({client_avatar:avatar_url,avatar_url:avatar_url}).eq("auth_uid",auth_uid);
  if(error)throw error;return true;
}
async function updateWorkerAvatarUrl(auth_uid,avatar_url){
  const { error } = await supabaseAdmin.from("user_worker").update({worker_avatar:avatar_url,avatar_url:avatar_url}).eq("auth_uid",auth_uid);
  if(error)throw error;return true;
}
async function clearClientAvatar(auth_uid){
  const { error } = await supabaseAdmin.from("user_client").update({client_avatar:null,avatar_url:null}).eq("auth_uid",auth_uid);
  if(error)throw error;return true;
}
async function clearWorkerAvatar(auth_uid){
  const { error } = await supabaseAdmin.from("user_worker").update({worker_avatar:null,avatar_url:null}).eq("auth_uid",auth_uid);
  if(error)throw error;return true;
}
async function updateAuthUserAvatarMeta(auth_uid,avatar_url){
  const user=await getAuthUserById(auth_uid);
  const currentMeta=user?.user_metadata||{};
  const nextMeta={...currentMeta,avatar_url:avatar_url||null};
  const{error}=await supabaseAdmin.auth.admin.updateUserById(auth_uid,{user_metadata:nextMeta});
  if(error)throw error;return true;
}

async function verifyCurrentPassword(email,password){const{data,error}=await supabase.auth.signInWithPassword({email,password});return{ok:!error,data,error};}
async function updateAuthPassword(auth_uid,new_password){const{error}=await supabaseAdmin.auth.admin.updateUserById(auth_uid,{password:new_password});if(error)throw error;return true;}
async function updateClientPassword(auth_uid,new_password){const{error}=await supabaseAdmin.from("user_client").update({password:new_password}).eq("auth_uid",auth_uid);if(error)throw error;return true;}
async function updateWorkerPassword(auth_uid,new_password){const{error}=await supabaseAdmin.from("user_worker").update({password:new_password}).eq("auth_uid",auth_uid);if(error)throw error;return true;}

async function updateClientProfile(auth_uid,patch){const{data,error}=await supabaseAdmin.from("user_client").update(patch).eq("auth_uid",auth_uid).select("*").limit(1);if(error)throw error;return data&&data[0]?data[0]:null;}
async function updateWorkerProfile(auth_uid,patch){const{data,error}=await supabaseAdmin.from("user_worker").update(patch).eq("auth_uid",auth_uid).select("*").limit(1);if(error)throw error;return data&&data[0]?data[0]:null;}
async function updateAuthUserMeta(auth_uid,patch){
  const user=await getAuthUserById(auth_uid);
  const base=user?.user_metadata||{};
  const next={...base,...patch};
  const{error}=await supabaseAdmin.auth.admin.updateUserById(auth_uid,{user_metadata:next});
  if(error)throw error;return true;
}

async function isContactNumberTakenAcrossAll(phone,excludeAuthUid){
  const p=String(phone||"").trim();
  if(!p)return false;
  const q1=supabaseAdmin.from("user_client").select("auth_uid,contact_number");
  const q2=supabaseAdmin.from("user_worker").select("auth_uid,contact_number");
  const[{data:c,error:ec},{data:w,error:ew}]=await Promise.all([q1,q2]);
  if(ec)throw ec; if(ew)throw ew;
  const hits=[...(c||[]),...(w||[])].filter(r=>String(r.contact_number||"")===p).map(r=>r.auth_uid).filter(Boolean);
  if(!hits.length)return false;
  if(!excludeAuthUid)return true;
  return hits.some(uid=>uid!==excludeAuthUid);
}

function buildVariants(kind, canon){
  try{
    const u=new URL(canon);
    const path=u.pathname+ (u.search||"");
    if(kind==="facebook"){
      const hosts=["facebook.com","www.facebook.com","m.facebook.com","fb.com","www.fb.com"];
      return hosts.map(h=>`https://${h}${path}`).flatMap(x=>[x, x.endsWith("/")?x:x+"/"]);
    }else{
      const hosts=["instagram.com","www.instagram.com","m.instagram.com"];
      return hosts.map(h=>`https://${h}${path}`).flatMap(x=>[x, x.endsWith("/")?x:x+"/"]);
    }
  }catch{
    return [canon, canon.endsWith("/")?canon:canon+"/"];
  }
}

async function isSocialLinkTakenAcrossAll(kind,value,excludeAuthUid){
  const raw=String(value||"").trim();
  if(!raw)return false;
  const canon=kind==="facebook"?normalizeFacebook(raw):normalizeInstagram(raw);
  const col1=kind==="facebook"?"social_facebook":"social_instagram";
  const legacy1=kind==="facebook"?"facebook":"instagram";
  const variants=buildVariants(kind,canon);
  function buildOr(cols,pats){const segs=[];for(const col of cols)for(const p of pats)segs.push(`${col}.ilike.*${p}*`);return segs.join(",");}
  let hitAuthUid=null;
  try{
    const orStr=buildOr([col1,legacy1],variants)||`${col1}.is.null`;
    const q1=supabaseAdmin.from("user_client").select(`auth_uid, ${col1}, ${legacy1}`).or(orStr);
    const q2=supabaseAdmin.from("user_worker").select(`auth_uid, ${col1}, ${legacy1}`).or(orStr);
    const[{data:c,error:ec},{data:w,error:ew}]=await Promise.all([q1,q2]);
    if(ec||ew)throw ec||ew;
    const all=[...(c||[]),...(w||[])];
    for(const r of all){
      const vals=[r[col1],r[legacy1]].filter(Boolean).map(String);
      if(vals.some(v=> (kind==="facebook"?normalizeFacebook(v):normalizeInstagram(v)).toLowerCase()===canon.toLowerCase())){hitAuthUid=r.auth_uid||null;break;}
    }
  }catch{
    const q1=supabaseAdmin.from("user_client").select(`auth_uid, ${col1}, ${legacy1}`).limit(1000);
    const q2=supabaseAdmin.from("user_worker").select(`auth_uid, ${col1}, ${legacy1}`).limit(1000);
    const[{data:c2},{data:w2}]=await Promise.all([q1,q2]);
    const all=[...(c2||[]),...(w2||[])]
    for(const r of all){
      const vals=[r[col1],r[legacy1]].filter(Boolean).map(String);
      if(vals.some(v=> (kind==="facebook"?normalizeFacebook(v):normalizeInstagram(v)).toLowerCase()===canon.toLowerCase())){hitAuthUid=r.auth_uid||null;break;}
    }
  }
  if(!hitAuthUid)return false;
  if(!excludeAuthUid)return true;
  return hitAuthUid!==excludeAuthUid;
}

module.exports={
  getClientByAuthOrEmail,
  getWorkerByAuthOrEmail,
  getAuthUserById,
  getClientAccountProfile,
  getWorkerAccountProfile,
  uploadClientAvatarDataUrl,
  uploadWorkerAvatarDataUrl,
  updateClientAvatarUrl,
  updateWorkerAvatarUrl,
  clearClientAvatar,
  clearWorkerAvatar,
  updateAuthUserAvatarMeta,
  verifyCurrentPassword,
  updateAuthPassword,
  updateClientPassword,
  updateWorkerPassword,
  updateClientProfile,
  updateWorkerProfile,
  updateAuthUserMeta,
  isContactNumberTakenAcrossAll,
  isSocialLinkTakenAcrossAll,
  normalizeFacebook,
  normalizeInstagram
};
