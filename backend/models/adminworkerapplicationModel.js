const { getSupabaseAdmin } = require("../supabaseClient");

function s(v){return String(v||"").trim()}
function n(v){const t=s(v).toLowerCase();const m={canceled:"cancelled"};const x=m[t]||t;const a=new Set(["pending","approved","declined","cancelled","expired",""]);return a.has(x)?x:""}

async function listApplications({status="",q="",limit=500}){
  const db=getSupabaseAdmin();
  let query=db.from("wa_pending")
    .select("id,request_group_id,status,created_at,decided_at,email_address,info,work,rate,docs,reason_choice,reason_other,decision_reason")
    .order("created_at",{ascending:false})
    .limit(Math.min(Math.max(Number(limit)||1,1),1000));
  const st=n(status);
  if(st) query=query.eq("status",st);
  const term=s(q);
  if(term){
    if(term.includes("@")) query=query.ilike("email_address",`%${term}%`);
    else query=query.or(`request_group_id.ilike.%${term}%,decision_reason.ilike.%${term}%`);
  }
  const {data,error}=await query;
  if(error) throw error;
  return Array.isArray(data)?data:[];
}

async function countExact(where){
  const db=getSupabaseAdmin();
  const {count,error}=await db.from("wa_pending").select("*",{count:"exact",head:true}).match(where||{});
  if(error) throw error;
  return count||0;
}

async function countAllStatuses(){
  const all=await countExact({});
  const pending=await countExact({status:"pending"});
  const approved=await countExact({status:"approved"});
  const declined=await countExact({status:"declined"});
  const cancelled=await countExact({status:"cancelled"});
  const expired=await countExact({status:"expired"});
  return {all,pending,approved,declined,cancelled,expired};
}

async function findRow(idOrGroup){
  const db=getSupabaseAdmin();
  const key=s(idOrGroup);
  let {data,error}=await db.from("wa_pending").select("id,request_group_id,status,reason_choice,reason_other,decision_reason,decided_at").eq("id",key).maybeSingle();
  if((!data)||error){
    const r=await db.from("wa_pending").select("id,request_group_id,status,reason_choice,reason_other,decision_reason,decided_at").eq("request_group_id",key).maybeSingle();
    data=r.data; error=r.error;
  }
  if(error) throw error;
  if(!data) throw new Error("Not found");
  return data;
}

async function markStatus(idOrGroup,nextStatus,extras={}){
  const db=getSupabaseAdmin();
  const row=await findRow(idOrGroup);
  const status=n(nextStatus);
  if(!status) throw new Error("Invalid status");
  const nowIso=new Date().toISOString();
  const upd={status};
  if(status==="approved"){
    upd.decided_at=nowIso;
    upd.reason_choice=null;
    upd.reason_other=null;
    upd.decision_reason=null;
  }
  if(status==="declined"){
    upd.decided_at=extras.decided_at||nowIso;
    upd.reason_choice=s(extras.reason_choice||"")||null;
    upd.reason_other=s(extras.reason_other||"")||null;
    upd.decision_reason=s(extras.decision_reason||"")||null;
  }
  const {data,error}=await db.from("wa_pending").update(upd).eq("id",row.id)
    .select("id,request_group_id,status,reason_choice,reason_other,decision_reason,decided_at").maybeSingle();
  if(error) throw error;
  return data;
}

module.exports={listApplications,countAllStatuses,markStatus};
