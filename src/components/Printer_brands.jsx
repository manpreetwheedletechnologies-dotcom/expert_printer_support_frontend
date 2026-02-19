import React, { useState, useEffect } from "react";
import { PrintersData } from "../jsondata/PrintersData";

const PrinterBrands = () => {
  const text = "Multi-Brand Printer Support Hub";

  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const typingSpeed = isDeleting ? 30 : 60;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing forward
        setDisplayText(text.slice(0, index + 1));
        setIndex(index + 1);

        if (index + 1 === text.length) {
          setTimeout(() => setIsDeleting(true), 1000); // pause before delete
        }
      } else {
        // Deleting
        setDisplayText(text.slice(0, index - 1));
        setIndex(index - 1);

        if (index - 1 === 0) {
          setIsDeleting(false);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [index, isDeleting]);

  return (
    <section className="w-full py-16 px-4 bg-white">
      <div className="w-full max-w-[94%] mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-24 text-center">
        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
          {displayText}
          <span className="animate-pulse">|</span>
        </h2>

        <p className="mt-3 text-gray-600 text-sm md:text-base">
         We provide professional troubleshooting services for top printer manufacturers and a wide range of additional brands.
        </p>

        {/* Brand Grid */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {PrintersData.map((brand, index) => (
            <img
              key={index}
              className="flex items-center justify-center bg-white border border-gray-200 rounded-2xl shadow-md cursor-pointer transform transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl"
              src={brand.logo}
              alt={brand.name}
             onClick={() => window.open(brand.link, "_blank", "noopener,noreferrer")}
              
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PrinterBrands;
