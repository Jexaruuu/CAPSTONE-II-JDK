const { supabaseAdmin } = require('../supabaseClient');

function toMapByGroup(rows){
  const m=new Map();
  for(const r of rows||[]){
    const g=r.request_group_id||r.requestGroupId||r.request_group||null;
    if(!g) continue;
    m.set(g,r);
  }
  return m;
}

function nonEmptyObject(o){
  const out={};
  for(const k of Object.keys(o||{})){
    const v=o[k];
    if(v===null||v===undefined||v==="") continue;
    out[k]=v;
  }
  return out;
}

async function listApplications({status,q,limit=200}){
  let base=supabaseAdmin
    .from('worker_application_status')
    .select('id,request_group_id,email_address,status,decision_reason,reason_choice,reason_other,decided_at,created_at')
    .order('created_at',{ascending:false})
    .limit(limit);

  if(status) base=base.eq('status',status);
  if(q&&q.trim()){
    const s=q.trim();
    base=base.or(`email_address.ilike.%${s}%,request_group_id.ilike.%${s}%`);
  }

  const { data: apps, error: appErr } = await base;
  if(appErr) throw appErr;
  if(!apps||!apps.length) return [];

  const gids=apps.map(r=>r.request_group_id).filter(Boolean);
  const uniqGids=[...new Set(gids)];

  const fetchInfo = supabaseAdmin.from('worker_information').select('*').in('request_group_id',uniqGids);
  const fetchWork = supabaseAdmin.from('worker_work_information').select('*').in('request_group_id',uniqGids);
  const fetchDocs = supabaseAdmin.from('worker_required_documents').select('*').in('request_group_id',uniqGids);

  const [{data:infoRows,error:infoErr},{data:workRows,error:workErr},{data:docRows,error:docErr}] =
    await Promise.all([fetchInfo,fetchWork,fetchDocs]);

  if(infoErr) throw infoErr;
  if(workErr) throw workErr;
  if(docErr) throw docErr;

  const infoMap=toMapByGroup(infoRows||[]);
  const workMap=toMapByGroup(workRows||[]);
  const docMap=toMapByGroup(docRows||[]);

  const merged=apps.map(a=>{
    const g=a.request_group_id;
    const i=infoMap.get(g)||{};
    const w=workMap.get(g)||{};
    const d=docMap.get(g)||{};
    const docs=nonEmptyObject({
      primary_id_front:d.primary_id_front||d.primaryIdFront||d.primary_front,
      primary_id_back:d.primary_id_back||d.primaryIdBack||d.primary_back,
      secondary_id:d.secondary_id||d.secondaryId,
      nbi_police_clearance:d.nbi_police_clearance||d.nbi||d.police||d.police_clearance,
      proof_of_address:d.proof_of_address||d.proofOfAddress||d.address_proof,
      medical_certificate:d.medical_certificate||d.med_cert,
      certificates:d.certificates||d.training_certificates||d.certs
    });

    return {
      id:a.id,
      request_group_id:g,
      email_address:a.email_address||i.email_address||w.email_address||null,
      status:a.status,
      decision_reason:a.decision_reason||null,
      reason_choice:a.reason_choice||null,
      reason_other:a.reason_other||null,
      decided_at:a.decided_at||null,
      created_at:a.created_at||null,
      info:i,
      work:w,
      rate:{},
      docs:docs
    };
  });

  if(q&&q.trim()){
    const s=q.trim().toLowerCase();
    return merged.filter(row=>{
      const name=[row.info?.first_name,row.info?.last_name].filter(Boolean).join(' ').toLowerCase();
      const email=String(row.email_address||'').toLowerCase();
      const svc=JSON.stringify(row.work?.service_types||'').toLowerCase();
      const br=String(row.info?.barangay||'').toLowerCase();
      return name.includes(s)||email.includes(s)||svc.includes(s)||br.includes(s)||String(row.request_group_id||'').toLowerCase().includes(s);
    });
  }

  return merged;
}

async function countAllStatuses(){
  const pending = await supabaseAdmin.from('worker_application_status').select('id',{count:'exact',head:true}).eq('status','pending');
  const approved = await supabaseAdmin.from('worker_application_status').select('id',{count:'exact',head:true}).eq('status','approved');
  const declined = await supabaseAdmin.from('worker_application_status').select('id',{count:'exact',head:true}).eq('status','declined');
  const p=pending.count||0;
  const a=approved.count||0;
  const d=declined.count||0;
  return { pending:p, approved:a, declined:d, total:p+a+d };
}

async function markStatus(id,status,decisionReason=null,reasonChoice=null,reasonOther=null){
  const { data, error } = await supabaseAdmin
    .from('worker_application_status')
    .update({
      status,
      decision_reason:decisionReason,
      reason_choice:reasonChoice,
      reason_other:reasonOther,
      decided_at:new Date().toISOString()
    })
    .eq('id',id)
    .select('id,status,decided_at,decision_reason,reason_choice,reason_other')
    .single();
  if(error) throw error;
  return data;
}

module.exports = {
  listApplications,
  countAllStatuses,
  markStatus
};
