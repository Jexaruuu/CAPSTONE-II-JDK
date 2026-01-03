const clientModel = require("../models/clientModel");
const notifModel = require("../models/notificationsModel");
const { supabaseAdmin, createConfirmedUser, ensureStorageBucket } = require("../supabaseClient");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

function parseCookie(str){const out={};if(!str)return out;str.split(";").forEach(p=>{const i=p.indexOf("=");if(i>-1)out[p.slice(0,i).trim()]=p.slice(i+1).trim()});return out}
function readAppUHeader(req){const h=req.headers["x-app-u"];if(!h)return{};try{return JSON.parse(decodeURIComponent(h))}catch{return{}}}
function readAppUQuery(req){const q=req.query?.app_u;if(!q)return{};try{return JSON.parse(decodeURIComponent(q))}catch{return{}}}
function sess(req){const s=req.session?.user||{};let role=s.role;let email=s.email_address||null;let auth_uid=s.auth_uid||null;if(!role||(!email&&!auth_uid)){const c=parseCookie(req.headers.cookie||"");if(c.app_u){try{const j=JSON.parse(decodeURIComponent(c.app_u));role=role||j.r;email=email||j.e||null;auth_uid=auth_uid||j.au||null}catch{}}}if(!role||(!email&&!auth_uid)){const h=readAppUHeader(req);if(h&&(h.e||h.au)){role=role||h.r;email=email||h.e||null;auth_uid=auth_uid||h.au||null}}if(!role||(!email&&!auth_uid)){const q=readAppUQuery(req);if(q&&(q.e||q.au)){role=role||q.r;email=role==="client"?(q.e||email):email;auth_uid=role==="client"?(q.au||auth_uid):auth_uid}}return{role,email,auth_uid,id:s.id||null}}

function parseDobToDate(v){
  if(!v) return null;
  const s=String(v).trim();
  const m1=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if(m1){
    const y=+m1[1], mo=+m1[2], d=+m1[3];
    const dt=new Date(y,mo-1,d);
    if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d) return null;
    return dt;
  }
  const m2=/^(\d{2})\/(\d{2})\/(\d{2})$/.exec(s);
  if(m2){
    const mo=+m2[1], d=+m2[2], yy=+m2[3];
    const now=new Date();
    const curYY=now.getFullYear()%100;
    const y=(yy<=curYY)?(2000+yy):(1900+yy);
    const dt=new Date(y,mo-1,d);
    if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d) return null;
    return dt;
  }
  return null;
}
function toMDY2(dt){
  const mm=String(dt.getMonth()+1).padStart(2,"0");
  const dd=String(dt.getDate()).padStart(2,"0");
  const yy=String(dt.getFullYear()%100).padStart(2,"0");
  return `${mm}/${dd}/${yy}`;
}
function computeAge(v){
  const d=parseDobToDate(v);
  if(!d) return null;
  const t=new Date();
  let a=t.getFullYear()-d.getFullYear();
  const m=t.getMonth()-d.getMonth();
  if(m<0||(m===0&&t.getDate()<d.getDate())) a--;
  return a>=0&&a<=120?a:null;
}

function parseDataUrlToBuffer(dataUrl){
  if(typeof dataUrl!=="string") return null;
  const s=dataUrl.trim();
  const m=/^data:([^;]+);base64,(.+)$/i.exec(s);
  if(!m) return null;
  const mime=String(m[1]||"").toLowerCase();
  const b64=String(m[2]||"");
  let buf=null;
  try{ buf=Buffer.from(b64,"base64"); }catch{ return null; }
  if(!buf||!buf.length) return null;
  return { mime, buf, bytes: buf.length };
}

function storagePathFromPublicUrl(url,bucket){
  try{
    const u=new URL(String(url||""));
    const marker=`/storage/v1/object/public/${bucket}/`;
    const i=u.pathname.indexOf(marker);
    if(i===-1) return null;
    const p=u.pathname.slice(i+marker.length);
    return p?decodeURIComponent(p):null;
  }catch{
    return null;
  }
}

const registerClient=async(req,res)=>{const{first_name,last_name,sex,email_address,password,is_agreed_to_terms}=req.body;try{const rawEmail=String(email_address||"").trim();const email=rawEmail.toLowerCase();if(!first_name||!last_name||!sex||!email||!password)return res.status(400).json({message:"Missing required fields"});const map=req.session?.verifiedEmails||{};let verified=false;for(const key of Object.keys(map)){if(String(key||"").trim().toLowerCase()===email&&map[key]===true){verified=true;break}}if(!verified)return res.status(400).json({message:"Please verify your email with the 6-digit code before creating an account."});const exists=await clientModel.checkEmailExistenceAcrossAllUsers(email);if(exists.length>0)return res.status(400).json({message:"Email already in use"});const agreed_at=is_agreed_to_terms?new Date().toISOString():null;let authUser=null;const{user:createdUser,error:authError}=await createConfirmedUser(email,password,{first_name,last_name,sex,role:"client",is_agreed_to_terms:!!is_agreed_to_terms,agreed_at});if(authError){if(authError.status===422||(authError.message&&authError.message.toLowerCase().includes("already"))){try{const{data,listError}=await supabaseAdmin.auth.admin.listUsers();if(!listError&&data&&Array.isArray(data.users)){const existing=data.users.find(u=>String(u.email||"").trim().toLowerCase()===email);if(existing)authUser=existing}}catch{}}if(!authUser)return res.status(authError.status||400).json({message:authError.message||"Signup failed",code:authError.code||undefined})}else{authUser=createdUser}const hashedPassword=await bcrypt.hash(String(password),12);await clientModel.createClient(authUser.id,first_name,last_name,sex,email,hashedPassword,!!is_agreed_to_terms,agreed_at);if(req.session?.verifiedEmails){const src=req.session.verifiedEmails;const next={};Object.keys(src).forEach(k=>{if(String(k||"").trim().toLowerCase()!==email)next[k]=src[k]});req.session.verifiedEmails=next}return res.status(201).json({message:"Client registered successfully",data:{first_name,last_name,sex,is_agreed_to_terms:!!is_agreed_to_terms,agreed_at,auth_uid:authUser.id}})}catch(e){return res.status(400).json({message:e?.message||"Internal server error"})}};

const me=async(req,res)=>{try{const s=sess(req);if(s.role!=="client"||(!s.auth_uid&&!s.email))return res.status(401).json({message:"Unauthorized"});const payload=await clientModel.getClientAccountProfile({auth_uid:s.auth_uid,email:s.email},{db:req.supabaseUser});return res.status(200).json(payload)}catch{return res.status(400).json({message:"Failed to load profile"})}};

const password=async(req,res)=>{try{const s=sess(req);if(s.role!=="client"||(!s.auth_uid&&!s.email))return res.status(401).json({message:"Unauthorized"});const{current_password,new_password,confirm_password}=req.body||{};if(!current_password||!new_password||new_password!==confirm_password)return res.status(400).json({message:"Invalid request"});const row=await clientModel.getByAuthUid(s.auth_uid||null,{db:req.supabaseUser});const acctEmail=row?.email_address||s.email;const sign=await require("../supabaseClient").supabase.auth.signInWithPassword({email:acctEmail,password:current_password});if(sign.error)return res.status(400).json({message:"Current password is incorrect"});const uid=row?.auth_uid||s.auth_uid;await clientModel.updateAuthPassword(uid,new_password,{dbAuth:req.supabaseUser});const hashedNew=await bcrypt.hash(String(new_password),12);await clientModel.updatePassword(uid,hashedNew,{db:req.supabaseUser});return res.status(200).json({message:"Password updated"})}catch{return res.status(400).json({message:"Failed to update password"})}};

const updateProfile=async(req,res)=>{try{
  const s=sess(req);
  if(s.role!=="client"||(!s.auth_uid&&!s.email))return res.status(401).json({message:"Unauthorized"});

  const patch={};
  ["first_name","last_name","phone","facebook","instagram","date_of_birth"].forEach(k=>{if(k in req.body){const v=typeof req.body[k]==="string"?req.body[k].trim():req.body[k];patch[k]=v===""?null:v}});

  const hasAvatarField=("profile_picture_data_url" in (req.body||{}))||("profile_picture_remove" in (req.body||{}))||("profile_picture" in (req.body||{}));
  const avatarRemove=!!(req.body||{}).profile_picture_remove || (hasAvatarField && ((req.body||{}).profile_picture_data_url===null || (typeof (req.body||{}).profile_picture_data_url==="string" && String((req.body||{}).profile_picture_data_url).trim()==="")));
  const avatarDataUrlRaw=(req.body||{}).profile_picture_data_url ?? (req.body||{}).profile_picture ?? null;

  const dbPatch={};
  if("first_name"in patch)dbPatch.first_name=patch.first_name;
  if("last_name"in patch)dbPatch.last_name=patch.last_name;

  if("phone"in patch){
    if(patch.phone){
      const stored=clientModel.normalizePHContactForStore(patch.phone);
      dbPatch.contact_number=stored;
    }else{
      dbPatch.contact_number=null;
    }
  }
  if("facebook"in patch)dbPatch.social_facebook=patch.facebook?clientModel.normalizeFacebook(patch.facebook):null;
  if("instagram"in patch)dbPatch.social_instagram=patch.instagram?clientModel.normalizeInstagram(patch.instagram):null;
  if("date_of_birth"in patch){
    if(patch.date_of_birth){
      const dt=parseDobToDate(patch.date_of_birth);
      dbPatch.date_of_birth=dt?toMDY2(dt):null;
      const a=computeAge(patch.date_of_birth);
      dbPatch.age=a==null?null:a;
    }else{
      dbPatch.date_of_birth=null;
      dbPatch.age=null;
    }
  }

  if("phone"in patch&&patch.phone){const taken=await clientModel.isContactNumberTakenAcrossAll(patch.phone,s.auth_uid);if(taken)return res.status(400).json({message:"Contact number already in use"})}
  if("facebook"in patch&&patch.facebook){const takenFb=await clientModel.isSocialLinkTakenAcrossAll("facebook",patch.facebook,s.auth_uid);if(takenFb)return res.status(400).json({message:"Facebook already in use"})}
  if("instagram"in patch&&patch.instagram){const takenIg=await clientModel.isSocialLinkTakenAcrossAll("instagram",patch.instagram,s.auth_uid);if(takenIg)return res.status(400).json({message:"Instagram already in use"})}

  let before=null;
  try{before=await clientModel.getByAuthUid(s.auth_uid||null,{db:req.supabaseUser})}catch{}
  if(!before&&s.email){try{before=await clientModel.getByEmail(s.email,{db:req.supabaseUser})}catch{}}
  const uid=before?.auth_uid||s.auth_uid;
  if(!uid) return res.status(401).json({message:"Unauthorized"});

  const bucket=process.env.SUPABASE_BUCKET_CLIENT_PROFILE_PICTURES || "client-profile-pictures";
  const prevUrl=before?.client_profile_picture||before?.profile_picture_url||null;
  const prevPath=prevUrl?storagePathFromPublicUrl(prevUrl,bucket):null;

  let avatarDidChange=false;
  let avatarNewUrl=null;
  let avatarRemoved=false;

  if(hasAvatarField){
    await ensureStorageBucket(bucket,true).catch(()=>{});
    if(avatarRemove){
      dbPatch.client_profile_picture=null;
      avatarDidChange=true;
      avatarRemoved=true;
      if(prevPath){
        try{await supabaseAdmin.storage.from(bucket).remove([prevPath])}catch{}
      }
    }else{
      const parsed=parseDataUrlToBuffer(avatarDataUrlRaw);
      if(!parsed) return res.status(400).json({message:"Invalid profile picture data"});
      const allowed=new Set(["image/jpeg","image/png","image/webp"]);
      if(!allowed.has(parsed.mime)) return res.status(400).json({message:"Unsupported profile picture type"});
      const maxBytes=5*1024*1024;
      if(parsed.bytes>maxBytes) return res.status(400).json({message:"Profile picture is too large"});
      const ext=parsed.mime==="image/png"?"png":parsed.mime==="image/webp"?"webp":"jpg";
      const name=`clients/${uid}/${Date.now()}-${crypto.randomBytes(10).toString("hex")}.${ext}`;
      const up=await supabaseAdmin.storage.from(bucket).upload(name,parsed.buf,{contentType:parsed.mime,upsert:true});
      if(up?.error) return res.status(400).json({message:up.error.message||"Failed to upload profile picture"});
      const pub=supabaseAdmin.storage.from(bucket).getPublicUrl(name);
      const url=pub?.data?.publicUrl||"";
      if(!url) return res.status(400).json({message:"Failed to generate profile picture URL"});
      dbPatch.client_profile_picture=url;
      avatarDidChange=true;
      avatarNewUrl=url;
      if(prevPath){
        try{await supabaseAdmin.storage.from(bucket).remove([prevPath])}catch{}
      }
    }
  }

  const hasAny=Object.keys(dbPatch).length>0;
  if(hasAny){
    await clientModel.updateClientProfile(uid,dbPatch,{db:req.supabaseUser});
    if("first_name"in patch||"last_name"in patch){
      const meta={};
      if("first_name"in patch)meta.first_name=patch.first_name||"";
      if("last_name"in patch)meta.last_name=patch.last_name||"";
      await clientModel.updateAuthUserMeta(uid,meta,{dbAuth:req.supabaseUser})
    }

    const changes=[];
    if(("first_name"in patch)||("last_name"in patch))changes.push("name");
    if("phone"in patch)changes.push("contact number");
    if("facebook"in patch)changes.push("facebook");
    if("instagram"in patch)changes.push("instagram");
    if("date_of_birth"in patch)changes.push("date of birth");
    if(avatarDidChange)changes.push("profile picture");

    const title="Profile updated successfully";
    const message=changes.length?`Updated ${changes.join(", ")}.`:"Your details are now up to date.";
    await notifModel.create({auth_uid:uid,role:"client",title,message}).catch(()=>{});

    if(avatarDidChange){
      if(avatarRemoved) await notifModel.create({auth_uid:uid,role:"client",title:"Profile picture removed",message:"Your profile picture has been removed."}).catch(()=>{});
      else await notifModel.create({auth_uid:uid,role:"client",title:"Profile picture updated",message:"Your profile picture has been updated."}).catch(()=>{});
    }
  }

  const payload=await clientModel.getClientAccountProfile({auth_uid:uid,email:s.email},{db:req.supabaseUser});
  if(avatarDidChange){
    payload.profile_picture_url=avatarRemoved?null:(avatarNewUrl||payload.profile_picture_url||null);
  }
  return res.status(200).json(payload);
}catch{return res.status(400).json({message:"Failed to update profile"})}};

const publicSex=async(req,res)=>{try{const email=String(req.query.email||"").trim();const auth_uid=String(req.query.auth_uid||req.query.authUid||"").trim();let row=null;if(auth_uid){try{row=await clientModel.getByAuthUid(auth_uid,{db:req.supabaseUser})}catch{}}if(!row&&email){try{row=await clientModel.getByEmail(email,{db:req.supabaseUser})}catch{}}if(!row)return res.status(404).json({message:"Not found"});return res.status(200).json({sex:row.sex||""})}catch{return res.status(400).json({message:"Failed"})}};

module.exports={registerClient,me,password,updateProfile,publicSex};
