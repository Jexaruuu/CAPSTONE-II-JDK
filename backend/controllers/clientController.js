const clientModel = require("../models/clientModel");
const notifModel = require("../models/notificationsModel");
const { supabaseAdmin, createConfirmedUser } = require("../supabaseClient");
const bcrypt = require("bcryptjs");

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

const FALLBACK_POLICY=`JDK HOMECARE Client Policy Agreement

This Client Policy works together with the Worker Policy to keep services safe, trackable, and supported. By using JDK HOMECARE as a client, you agree to the rules below when interacting with workers on the platform.

1. Acceptable Use (Client)
- Provide accurate information when creating requests (service type, location details, and job expectations).
- Use the platform only for legitimate home service and maintenance needs.
- Communicate respectfully and do not abuse, harass, scam, or attempt to harm workers or other users.

2. Off-Platform Transactions Are Not Allowed (Client)
- You must not request, offer, or accept any payment arrangement outside JDK HOMECARE for services found, arranged, or coordinated through the platform.
- You must not use or request personal contact details for the purpose of moving bookings or payments off-platform.
- Keep bookings, agreements, and payments inside JDK HOMECARE so support can assist with records, disputes, and safety issues.

3. Account Responsibilities
- You are responsible for maintaining the confidentiality of your account.
- Do not share your login credentials.
- Notify us if you suspect unauthorized access to your account.

4. Platform Integrity
- No attempts to bypass security, disrupt services, or misuse platform features.
- No uploading of harmful or illegal content.
- We may suspend or terminate accounts that violate policies or threaten platform safety.
`;

const FALLBACK_NDA=`JDK HOMECARE Non-Disclosure Agreement (NDA)

This agreement protects confidential information shared through or related to the platform, including business, operational, and user-related information.

1. Confidential Information
- Non-public platform details, processes, pricing, and internal operations.
- Any non-public information disclosed by JDK HOMECARE or its users.
- Personal or sensitive information encountered during service coordination.

2. Obligations
- Do not disclose confidential information to any third party.
- Use confidential information only for platform-related purposes.
- Take reasonable steps to protect confidentiality.

3. Exceptions
- Information that is publicly available through no fault of your own.
- Information required to be disclosed by law or valid legal process.

4. Duration
Confidentiality obligations continue even after you stop using the platform, to the extent allowed by applicable law.
`;

const registerClient=async(req,res)=>{const{first_name,last_name,sex,email_address,password,is_agreed_to_terms,is_agreed_to_policy_nda,policy_agreement,nda_agreement}=req.body;try{const rawEmail=String(email_address||"").trim();const email=rawEmail.toLowerCase();if(!first_name||!last_name||!sex||!email||!password)return res.status(400).json({message:"Missing required fields"});const map=req.session?.verifiedEmails||{};let verified=false;for(const key of Object.keys(map)){if(String(key||"").trim().toLowerCase()===email&&map[key]===true){verified=true;break}}if(!verified)return res.status(400).json({message:"Please verify your email with the 6-digit code before creating an account."});const exists=await clientModel.checkEmailExistenceAcrossAllUsers(email);if(exists.length>0)return res.status(400).json({message:"Email already in use"});const agreed_at=is_agreed_to_terms?new Date().toISOString():null;const policy_nda_agreed_at=is_agreed_to_policy_nda?new Date().toISOString():null;let authUser=null;const{user:createdUser,error:authError}=await createConfirmedUser(email,password,{first_name,last_name,sex,role:"client",is_agreed_to_terms:!!is_agreed_to_terms,agreed_at,is_agreed_to_policy_nda:!!is_agreed_to_policy_nda,policy_nda_agreed_at});if(authError){if(authError.status===422||(authError.message&&authError.message.toLowerCase().includes("already"))){try{const{data,listError}=await supabaseAdmin.auth.admin.listUsers();if(!listError&&data&&Array.isArray(data.users)){const existing=data.users.find(u=>String(u.email||"").trim().toLowerCase()===email);if(existing)authUser=existing}}catch{}}if(!authUser)return res.status(authError.status||400).json({message:authError.message||"Signup failed",code:authError.code||undefined})}else{authUser=createdUser}const hashedPassword=await bcrypt.hash(String(password),12);await clientModel.createClient(authUser.id,first_name,last_name,sex,email,hashedPassword,!!is_agreed_to_terms,agreed_at);try{await clientModel.upsertClientAgreements(authUser.id,email,!!is_agreed_to_policy_nda,!!is_agreed_to_policy_nda,policy_nda_agreed_at,{db:req.supabaseUser})}catch{}if(req.session?.verifiedEmails){const src=req.session.verifiedEmails;const next={};Object.keys(src).forEach(k=>{if(String(k||"").trim().toLowerCase()!==email)next[k]=src[k]});req.session.verifiedEmails=next}return res.status(201).json({message:"Client registered successfully",data:{first_name,last_name,sex,is_agreed_to_terms:!!is_agreed_to_terms,agreed_at,auth_uid:authUser.id}})}catch(e){return res.status(400).json({message:e?.message||"Internal server error"})}};

const me=async(req,res)=>{try{const s=sess(req);if(s.role!=="client"||(!s.auth_uid&&!s.email))return res.status(401).json({message:"Unauthorized"});const payload=await clientModel.getClientAccountProfile({auth_uid:s.auth_uid,email:s.email},{db:req.supabaseUser});return res.status(200).json(payload)}catch{return res.status(400).json({message:"Failed to load profile"})}};

const password=async(req,res)=>{try{const s=sess(req);if(s.role!=="client"||(!s.auth_uid&&!s.email))return res.status(401).json({message:"Unauthorized"});const{current_password,new_password,confirm_password}=req.body||{};if(!current_password||!new_password||new_password!==confirm_password)return res.status(400).json({message:"Invalid request"});const row=await clientModel.getByAuthUid(s.auth_uid||null,{db:req.supabaseUser});const acctEmail=row?.email_address||s.email;const sign=await require("../supabaseClient").supabase.auth.signInWithPassword({email:acctEmail,password:current_password});if(sign.error)return res.status(400).json({message:"Current password is incorrect"});const uid=row?.auth_uid||s.auth_uid;await clientModel.updateAuthPassword(uid,new_password,{dbAuth:req.supabaseUser});const hashedNew=await bcrypt.hash(String(new_password),12);await clientModel.updatePassword(uid,hashedNew,{db:req.supabaseUser});return res.status(200).json({message:"Password updated"})}catch{return res.status(400).json({message:"Failed to update password"})}};

const updateProfile=async(req,res)=>{try{
  const s=sess(req);
  if(s.role!=="client"||(!s.auth_uid&&!s.email))return res.status(401).json({message:"Unauthorized"});

  const patch={};
  ["first_name","last_name","phone","facebook","instagram","date_of_birth"].forEach(k=>{if(k in req.body){const v=typeof req.body[k]==="string"?req.body[k].trim():req.body[k];patch[k]=v===""?null:v}});

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

    const title="Profile updated successfully";
    const message=changes.length?`Updated ${changes.join(", ")}.`:"Your details are now up to date.";
    await notifModel.create({auth_uid:uid,role:"client",title,message}).catch(()=>{});
  }

  const payload=await clientModel.getClientAccountProfile({auth_uid:uid,email:s.email},{db:req.supabaseUser});
  return res.status(200).json(payload);
}catch{return res.status(400).json({message:"Failed to update profile"})}};

const publicSex=async(req,res)=>{try{const email=String(req.query.email||"").trim();const auth_uid=String(req.query.auth_uid||req.query.authUid||"").trim();let row=null;if(auth_uid){try{row=await clientModel.getByAuthUid(auth_uid,{db:req.supabaseUser})}catch{}}if(!row&&email){try{row=await clientModel.getByEmail(email,{db:req.supabaseUser})}catch{}}if(!row)return res.status(404).json({message:"Not found"});return res.status(200).json({sex:row.sex||""})}catch{return res.status(400).json({message:"Failed"})}};

module.exports={registerClient,me,password,updateProfile,publicSex};
