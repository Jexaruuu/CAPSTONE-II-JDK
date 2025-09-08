// controllers/clientservicerequestController.js
const {
  uploadDataUrlToBucket,
  findClientByEmail,
  insertClientInformation,
  insertServiceRequestDetails,
  insertServiceRate,
  newGroupId
} = require('../models/clientservicerequestModel');

// ADD: import ensureStorageBucket (keep your existing imports)
const { ensureStorageBucket } = require('../supabaseClient');

const BUCKET_PROFILE = process.env.SB_BUCKET_PROFILE || 'client-profile-pictures';
const BUCKET_REQUEST = process.env.SB_BUCKET_REQUEST || 'service-request-images';

const submitFullRequest = async (req, res) => {
  try {
    const { info, details, rate } = req.body || {};
    if (!info || !details || !rate) {
      return res.status(400).json({ message: 'info, details, and rate are required' });
    }

    // ADD: make sure the buckets exist (idempotent)
    await Promise.all([
      ensureStorageBucket(BUCKET_PROFILE, true),
      ensureStorageBucket(BUCKET_REQUEST, true)
    ]);

    // Choose email from any section (your forms include it in Step 1)
    const email = (info.email || details.email || rate.email || '').trim();
    if (!email) {
      return res.status(400).json({ message: 'Email is required in the payload' });
    }

    // Try to link to user_client row if exists
    const clientRow = await findClientByEmail(email).catch(() => null);
    const client_id = clientRow?.id || null;
    const auth_uid = clientRow?.auth_uid || null;

    // One group id to tie the 3 rows
    const request_group_id = newGroupId();

    // Upload images, if present (data URLs)
    let profilePictureUrl = null;
    let profilePictureName = null;
    if (info.profilePicture) {
      const up = await uploadDataUrlToBucket(
        BUCKET_PROFILE,
        info.profilePicture,
        `profile_${request_group_id}`
      );
      profilePictureUrl = up.url;
      profilePictureName = info.profilePictureName || up.name || null;
    }

    let requestImageUrl = null;
    let requestImageName = null;
    if (details.image) {
      const up2 = await uploadDataUrlToBucket(
        BUCKET_REQUEST,
        details.image,
        `request_${request_group_id}`
      );
      requestImageUrl = up2.url;
      requestImageName = details.imageName || up2.name || null;
    }

    // Build rows
    const infoRow = {
      request_group_id,
      client_id,
      auth_uid,
      email_address: email,
      first_name: info.firstName,
      last_name: info.lastName,
      contact_number: info.contactNumber,
      street: info.street,
      barangay: info.barangay,
      additional_address: info.additionalAddress,
      facebook: info.facebook || null,
      instagram: info.instagram || null,
      linkedin: info.linkedin || null,
      profile_picture_url: profilePictureUrl,
      profile_picture_name: profilePictureName
    };

    const detailsRow = {
      request_group_id,
      client_id,
      auth_uid,
      email_address: email,
      service_type: details.serviceType,
      service_task: details.serviceTask,
      preferred_date: details.preferredDate, // YYYY-MM-DD
      preferred_time: details.preferredTime, // HH:MM
      is_urgent: details.isUrgent,
      tools_provided: details.toolsProvided,
      service_description: details.serviceDescription,
      image_url: requestImageUrl,
      image_name: requestImageName
    };

    const rateType = rate.rateType;
    const rateRow = {
      request_group_id,
      client_id,
      auth_uid,
      email_address: email,
      rate_type: rateType,
      rate_from: rateType === 'Hourly Rate' ? Number(rate.rateFrom) : null,
      rate_to: rateType === 'Hourly Rate' ? Number(rate.rateTo) : null,
      rate_value: rateType === 'By the Job Rate' ? Number(rate.rateValue) : null
    };

    // Insert all (not transactional; if you need strict atomicity use a Postgres function)
    const [infoRes, detailsRes, rateRes] = await Promise.all([
      insertClientInformation(infoRow),
      insertServiceRequestDetails(detailsRow),
      insertServiceRate(rateRow)
    ]);

    return res.status(201).json({
      message: 'Service request submitted',
      request_group_id,
      rows: {
        client_information_id: infoRes?.id,
        request_details_id: detailsRes?.id,
        rate_id: rateRes?.id
      },
      assets: {
        profile_picture_url: profilePictureUrl,
        request_image_url: requestImageUrl
      }
    });
  } catch (err) {
    console.error('submitFullRequest error:', err);
    const msg = err?.message || 'Failed to submit service request';
    return res.status(400).json({ message: msg });
  }
};

module.exports = { submitFullRequest };
