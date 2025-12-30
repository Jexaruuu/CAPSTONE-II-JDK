const { supabaseAdmin } = require("../supabaseClient");

const getClientByEmail = async (email) => {
  const e = String(email || "").trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("user_client")
    .select("*")
    .eq("email_address", e)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }
  return data || null;
};

const getWorkerByEmail = async (email) => {
  const e = String(email || "").trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("user_worker")
    .select("*")
    .eq("email_address", e)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }
  return data || null;
};

const updateClientPassword = async (auth_uid, password) => {
  const { error } = await supabaseAdmin.from("user_client").update({ password }).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
};

const updateWorkerPassword = async (auth_uid, password) => {
  const { error } = await supabaseAdmin.from("user_worker").update({ password }).eq("auth_uid", auth_uid);
  if (error) throw error;
  return true;
};

module.exports = {
  getClientByEmail,
  getWorkerByEmail,
  updateClientPassword,
  updateWorkerPassword,
};
