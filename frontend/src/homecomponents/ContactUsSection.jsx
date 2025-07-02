import React, { useState } from "react";

const ContactUsSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic to send the email (e.g., using an email API like Nodemailer, or a backend function)
    console.log("Form submitted", formData);
    alert("Your message has been sent! We will get back to you shortly.");
    // You can replace the alert with actual email-sending functionality here
  };

  return (
    <section id="contact" className="py-16 -mt-10">
      <div className="max-w-[1555px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Section - Contact Us Card */}
          <div className="bg-[#008CFC] rounded-lg shadow-lg p-8 mx-4 flex-1 w-full max-w-[920px]">
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-semibold mb-4 text-white">
                Contact JDK HOMECARE for Your Home Service Needs
              </h2>
              <p className="text-lg text-white mb-6">
                Have questions or need assistance? We’re here to help! Whether you need home maintenance, repairs, or a new service, our team is ready to provide expert support and get the job done right.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Left Section of the form: Name and Email */}
                <div className="flex flex-col w-full md:w-1/2">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your Name"
                    className="px-4 py-2 rounded-md text-gray-800 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-[#0e375d]"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Your Email"
                    className="px-4 py-2 rounded-md text-gray-800 mb-4 w-full focus:outline-none focus:ring-2 focus:ring-[#0e375d]"
                    required
                  />
                </div>

                {/* Right Section: Message */}
                <div className="flex flex-col w-full md:w-1/2">
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Your Message"
                    className="px-4 py-2 rounded-md text-gray-800 mb-4 w-full h-[150px] focus:outline-none focus:ring-2 focus:ring-[#0e375d]"
                    required
                  />
                </div>
              </form>

              {/* Send Email Button */}
              <div className="flex justify-start -mt-14">
                <button
                  type="submit"
                  className="bg-white text-[#008CFC] hover:text-white hover:bg-blue-700 transition font-semibold py-2 px-6 rounded-md"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>

          {/* Right Section - Image Card with Multiple Logos Scrolling Vertically */}
          <div className="relative rounded-lg shadow-lg mx-4 flex-1 max-w-[500px] overflow-hidden">
            <img
              src="/Tools.jpg" // Replace with your actual image path
              alt="Contact Us"
              className="w-full h-[420px] object-cover"
            />
            {/* Logos moving vertically */}
            <div className="absolute inset-0 flex flex-col justify-start items-center p-4 overflow-hidden">
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactUsSection;
