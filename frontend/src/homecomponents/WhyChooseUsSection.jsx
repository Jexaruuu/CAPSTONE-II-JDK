import React from "react";

const features = [
  {
    icon: "/Trust.png",
    title: "Trusted Service",
    description:
      "We provide dependable services with regular updates, so you’re always in the loop and confident that the job is getting done right.",
  },
  {
    icon: "/Clients.png",
    title: "For Our Valued Clients",
    description:
      "We focus on your needs, offering personalized service and clear communication every step of the way. Your satisfaction is our priority.",
  },
  {
    icon: "/Workers.png",
    title: "Trusted Workers",
    description:
      "Our workers are trusted workers who are passionate about delivering quality service you can count on, every time.",
  },
];

const WhyChooseUsSection = () => (
  <section id="why-jdk" className="relative bg-white py-0 -mt-5">
    <div className="absolute inset-x-0 -top-10 pointer-events-none select-none">
      <div className="mx-auto h-40 w-11/12 rounded-full bg-blue-100 opacity-20 blur-3xl" />
    </div>

    <div className="relative z-10 max-w-[1525px] mx-auto px-6">
      <header className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-left">
          Why Choose <span className="text-[#008cfc]">JDK HOMECARE</span>
        </h2>
        <p className="mt-4 max-w-2xl text-gray-600 text-left text-lg">
          Home services and maintenance to keep your home in top shape. Whether it’s routine upkeep or unexpected repairs, our expert team is here to deliver fast, trusted solutions for all your needs.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        {features.map(({ icon, title, description }, i) => (
          <article
            key={i}
            tabIndex={0}
            className="relative group rounded-md p-6 text-left border border-gray-300 transition-all duration-300 focus:outline-none
                      hover:border-[#008cfc] hover:ring-2 hover:ring-[#008cfc] hover:shadow-xl focus:border-[#008cfc] focus:ring-2 focus:ring-[#008cfc]"
          >
          
            <div className="absolute top-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-transparent border-4 border-[#008cfc] text-gray-700 group-hover:bg-[#008cfc] group-hover:border-[#008cfc] group-hover:text-white transition-all duration-300">
              <span className="text-xl">✔</span>
            </div>

            <img
              src={icon}
              alt={title}
              className="w-16 h-16 mb-5 object-contain select-none"
              draggable={false}
            />

            <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

            <p className="text-sm leading-relaxed text-gray-600">{description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default WhyChooseUsSection;
