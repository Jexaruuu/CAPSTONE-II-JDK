const clientModel = require('../models/clientModel'); // Adjust the path if necessary

// Controller to register a new client
const registerClient = async (req, res) => {
  const { first_name, last_name, email_address, password } = req.body;

  try {
    // Check if the email already exists
    const emailExists = await clientModel.checkEmailExistence(email_address);
    if (emailExists.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Register the new client
    const result = await clientModel.createClient(first_name, last_name, email_address, password);
    return res.status(201).json({
      message: 'Client registered successfully',
      data: { first_name, last_name },  // Send first and last name back in response
    });
  } catch (error) {
    console.error('Error during client registration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  registerClient,
};