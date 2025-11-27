const {
  listApplications,
  countAllStatuses,
  markStatus
} = require("../models/adminworkerapplicationModel");

function s(v){return String(v||"").trim()}
function n(v){const t=s(v).toLowerCase();const m={canceled:"cancelled"};const x=m[t]||t;const a=new Set(["pending","approved","declined","cancelled","expired",""]);return a.has(x)?x:""}

async function list(req,res){
  try{
    const status=n(req.query.status||"");
    const q=s(req.query.q||"");
    const items=await listApplications({status,q,limit:500});
    return res.status(200).json({items});
  }catch(err){
    return res.status(500).json({message:err?.message||"Failed to load applications"});
  }
}

async function count(_req,res){
  try{
    const c=await countAllStatuses();
    return res.status(200).json(c);
  }catch(err){
    return res.status(500).json({message:err?.message||"Failed to load counts"});
  }
}

async function approve(req,res){
  try{
    const id=req.params.id;
    if(!id) return res.status(400).json({message:"Missing id"});
    const row=await markStatus(id,"approved");
    return res.status(200).json({id:row.id,status:row.status,request_group_id:row.request_group_id});
  }catch(err){
    const code=err?.status||400;
    return res.status(code).json({message:err?.message||"Failed to approve"});
  }
}

async function decline(req,res){
  try{
    const id=req.params.id;
    if(!id) return res.status(400).json({message:"Missing id"});
    const body=req.body||{};
    const reason_choice=s(body.reason_choice||"")||null;
    const reason_other=s(body.reason_other||"")||null;
    const decided_at=new Date().toISOString();
    const decision_reason=[reason_choice,reason_other].filter(Boolean).join(" — ")||null;
    const row=await markStatus(id,"declined",{reason_choice,reason_other,decision_reason,decided_at});
    return res.status(200).json({
      id:row.id,
      status:row.status,
      request_group_id:row.request_group_id,
      reason_choice:row.reason_choice||null,
      reason_other:row.reason_other||null,
      decision_reason:row.decision_reason||null,
      decided_at:row.decided_at||decided_at
    });
  }catch(err){
    const code=err?.status||400;
    return res.status(code).json({message:err?.message||"Failed to decline"});
  }
}

module.exports={list,count,approve,decline};
