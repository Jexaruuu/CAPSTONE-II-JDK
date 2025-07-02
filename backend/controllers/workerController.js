const workerModel = require('../models/workerModel');

// Controller to register a new worker
const registerWorker = async (req, res) => {
  const { first_name, last_name, sex, email_address, password } = req.body;

  console.log('📩 Incoming Data:', req.body); // <-- Add this

  try {
    const emailExists = await workerModel.checkEmailExistence(email_address);
    console.log('📌 Email Exists:', emailExists);

    if (emailExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const result = await workerModel.createWorker(first_name, last_name, sex, email_address, password);

    return res.status(201).json({
      message: 'Worker registered successfully',
      data: { first_name, last_name, sex },
    });
  } catch (error) {
    console.error('Error during worker registration:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

module.exports = {
  registerWorker,
};
