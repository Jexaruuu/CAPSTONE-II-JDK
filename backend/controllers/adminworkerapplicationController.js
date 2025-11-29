const {
  listApplications,
  countAllStatuses,
  markStatus
} = require("../models/adminworkerapplicationModel");

function s(v){return String(v||"").trim()}
function n(v){const t=s(v).toLowerCase();const m={canceled:"cancelled"};const x=m[t]||t;const a=new Set(["pending","approved","declined","cancelled",""]);return a.has(x)?x:""}

exports.list = async (req,res)=>{
  try{
    const status=n(req.query.status||"");
    const q=s(req.query.q||"");
    const items=await listApplications({status,q,limit:500});
    return res.status(200).json({items});
  }catch(err){
    return res.status(500).json({message:err?.message||"Failed to load applications"});
  }
};

exports.count = async (_req,res)=>{
  try{
    const stats=await countAllStatuses();
    return res.status(200).json(stats);
  }catch(err){
    return res.status(500).json({message:err?.message||"Failed to load counts"});
  }
};

exports.approve = async (req,res)=>{
  try{
    const id=s(req.params.id||"");
    if(!id) return res.status(400).json({message:"Missing id"});
    const row=await markStatus(id,"approved",null);
    return res.status(200).json({id:row.id,status:row.status,decided_at:row.decided_at});
  }catch(err){
    return res.status(400).json({message:err?.message||"Failed to approve"});
  }
};

exports.decline = async (req,res)=>{
  try{
    const id=s(req.params.id||"");
    const reason=s(req.body?.reason||"")||null;
    if(!id) return res.status(400).json({message:"Missing id"});
    const row=await markStatus(id,"declined",reason);
    return res.status(200).json({id:row.id,status:row.status,decided_at:row.decided_at,decision_reason:row.decision_reason});
  }catch(err){
    return res.status(400).json({message:err?.message||"Failed to decline"});
  }
};
