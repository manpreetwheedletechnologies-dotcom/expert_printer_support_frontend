import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const services = [
    {
        title: "On-Site Repair",
        description: `Looking for printer help near me? Our technicians provide fast, reliable on-site repair services for printers, copiers, and scanners—minimizing downtime and ensuring smooth operations.`,
        image: "/onsite.webp",
        showPin: true,
    },
    {
        title: "Printer Setup & Connectivity",
        description: `Need help setting up your device? We offer complete HP support printer setup, resolving driver issues, Wi-Fi connectivity problems, and installation errors. Get step-by-step HP printer help for a hassle-free experience.`,
        image: "/printer_setup.webp",
        showPin: false,
    },
    {
        title: "System Speed & Health",
        description: `Slow printing or frequent errors? Our experts diagnose and optimize your system performance with advanced online printer support, ensuring your devices run efficiently without interruptions.`,
        image: "/system_speed.webp",
        showPin: false,
    },
    {
        title: "Security & Antivirus",
        description: `Protect your devices from threats while ensuring uninterrupted printing. Get secure assistance along with HP printer support, including safe configuration, updates, and guided access to HP printer support chat and customer service.`,
        image: "/s&a.webp",
        showPin: false,
    },
    {
        title: "Printer Setup & Installation",
        description: `Seamless installation and configuration of your printer for home or office use with reliable online printer support, ensuring optimal performance from day one.`,
        image: "/Printer_inst.jpg",
        showPin: false,
    },
    {
        title: "Wireless Connectivity Support",
        description: `Get your printer connected to Wi-Fi networks with ease through reliable online printer support. We help fix issues like printer not connecting to WiFi and enable smooth wireless printing across all devices.`,
        image: "/wifi_connect.webp",
        showPin: false,
    },
    {
        title: "Troubleshooting & Error Resolution",
        description: `Fast and effective online printer troubleshooting to fix common problems like printer offline issues, paper jams, spooler errors, and printing failures.`,
        image: "/tourbleshooting.webp",
        showPin: false,
    },
    {
        title: "Driver Installation & Updates",
        description: `Professional printer driver installation support to download, install, and update the latest drivers. We resolve driver compatibility issues and ensure your printer runs smoothly with all systems.`,
        image: "/update_printer.jpg",
        showPin: false,
    },
    {
        title: "Malware Prevention",
        description: `Protect your systems and printers from viruses, spyware, and cyber threats with advanced malware prevention solutions.`,
        image: "/malware_printer.png",
        showPin: false,
    },
    {
        title: "Identity Protection",
        description: `Secure your business data with trusted printer support to keep your devices and information safe from unauthorized access.`,
        image: "/safe_id.jpg",
        showPin: false,
    },
    {
        title: "Authorized Installation",
        description: `Get secure and compliant software installation with expert online printer support and professional printer help, ensuring all tools and applications are properly configured.`,
        image: "/ink.webp",
        showPin: false,
    },
    {
        title: "Real-Time Threat Detection",
        description: `Stay protected 24/7 with real-time monitoring that detects and blocks threats instantly.`,
        image: "/Real-Time Threat Detection.webp",
        showPin: false,
    },
];

const PinIcon = () => (
    <div
        style={{
            width: 40,
            height: 40,
            background: "#1a7fd4",
            borderRadius: "50% 50% 50% 0",
            transform: "rotate(-45deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        }}
    >
        <svg
            style={{ transform: "rotate(45deg)", width: 18, height: 18, fill: "white" }}
            viewBox="0 0 24 24"
        >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
        </svg>
    </div>
);

const ServiceCard = ({ title, description, image, showPin }) => {
    const [hovered, setHovered] = useState(false);

    return (
        <div
            className="relative rounded-2xl overflow-hidden cursor-pointer"
            style={{ height: 340 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Image */}
            <img
                src={image}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover"
                style={{
                    transition: "transform 0.4s ease",
                    transform: hovered ? "scale(1.05)" : "scale(1)",
                }}
            />

            {/* Gradient Overlay — grows on hover */}
            <div
                className="absolute bottom-0 left-0 right-0 text-white text-left"
                style={{
                    padding: "20px 18px 22px",
                    background: hovered
                        ? "linear-gradient(to top, rgba(10,50,90,0.95) 0%, rgba(10,50,90,0.6) 70%, transparent 100%)"
                        : "linear-gradient(to top, rgba(10,50,90,0.85) 0%, rgba(10,50,90,0.3) 50%, transparent 100%)",
                    transition: "background 0.4s ease",
                }}
            >
                <h3 className="font-bold text-sm uppercase tracking-wide leading-snug"
                    style={{ marginBottom: hovered ? "8px" : "0" }}
                >
                    {title}
                </h3>

                {/* Description — slides in on hover */}
                <div
                    style={{
                        maxHeight: hovered ? "120px" : "0px",
                        opacity: hovered ? 1 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.4s ease, opacity 0.3s ease",
                    }}
                >
                    <p className="text-xs leading-relaxed font-normal" style={{ opacity: 0.9 }}>
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function ServicesSection({ colorClass }) {
    const text = "Our Services";
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [index, setIndex] = useState(0);
    const location = useLocation();
    const isServicesPage = location.pathname === "/services";
const visibleServices = isServicesPage ? services : services.slice(0, 4);
    useEffect(() => {
        const typingSpeed = isDeleting ? 30 : 60;

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setDisplayText(text.slice(0, index + 1));
                setIndex(index + 1);
                if (index + 1 === text.length) setTimeout(() => setIsDeleting(true), 1000);
            } else {
                setDisplayText(text.slice(0, index - 1));
                setIndex(index - 1);
                if (index - 1 === 0) setIsDeleting(false);
            }
        }, typingSpeed);

        return () => clearTimeout(timeout);
    }, [index, isDeleting]);
    return (
        <section className={`w-full ${colorClass} py-16 px-10`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4"> {displayText} < span className="animate-pulse" >| </span></h2>
                    <p className="text-gray-500 text-base max-w-[80%] mx-auto leading-relaxed">
                        Get reliable online printer support and expert printer help for setup, troubleshooting, and
                        repairs. Whether you're facing printer status offline issues or need quick assistance, our
                        team ensures seamless performance for home and business printers.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    {visibleServices.map((service, index) => (
                        <ServiceCard key={index} {...service} />
                    ))}
                </div>

                {/* Button */}
                {( location.pathname === "/"  || location.pathname === "/support" )&& (
                    <div className="flex justify-center">
                        <NavLink to="/services">
                            <button
                                style={{ backgroundColor: "var(--bg-color)" }}
                                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-lg cursor-pointer px-6 font-medium text-white"
                            >
                                <span>View All Services</span>

                                <div className="w-0 translate-x-[100%] pl-0 opacity-0 transition-all duration-200 group-hover:w-5 group-hover:translate-x-0 group-hover:pl-1 group-hover:opacity-100">
                                    <svg
                                        width="15"
                                        height="15"
                                        viewBox="0 0 15 15"
                                        fill="none"
                                        className="h-5 w-5"
                                    >
                                        <path
                                            d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                                            fill="currentColor"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                            </button>
                        </NavLink>
                    </div>
                )}
            </div>
        </section>
    );
}