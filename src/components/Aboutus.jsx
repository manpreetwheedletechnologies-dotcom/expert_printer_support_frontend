import React, { useEffect, useRef, useState } from "react";
import { AchievementsData } from "../jsondata/PrintersData";

// import { Printer, Award, ThumbsUp, Trophy } from "lucide-react";

function Aboutus() {
    const stats = AchievementsData.map((item) => ({
        ...item,
        icon: (
            <img
                src={item.icon}
                alt={item.label}
                loading="lazy"
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
            />
        ),
    }));

    const sectionRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [counts, setCounts] = useState(stats.map(() => 0));

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 },
        );

        if (sectionRef.current) observer.observe(sectionRef.current);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        stats.forEach((stat, index) => {
            let start = 0;
            const end = stat.value;
            const duration = 3000;
            const stepTime = Math.max(10, duration / end);

            const counter = setInterval(() => {
                start += Math.ceil(end / 60);
                if (start >= end) {
                    start = end;
                    clearInterval(counter);
                }

                setCounts((prev) => {
                    const updated = [...prev];
                    updated[index] = start;
                    return updated;
                });
            }, stepTime);
        });
    }, [isVisible]);

    return (
        <div
            ref={sectionRef}
            className="bg-[#007DBA0D] py-12 sm:py-16 lg:py-20 px-6 sm:px-10 lg:px-20"
        >
            <div className="max-w-7xl mx-auto w-full py-12 sm:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-28 items-center">
                    {/* Left Content */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3
                                style={{ color: "var(--bg-color)" }}
                                className="uppercase tracking-wider text-lg">
                                about us
                            </h3>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 leading-tight">
                                Effortless Printer Performance,
                                <br />
                                Backed by Experts
                            </h1>
                        </div>

                        <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                            At Printer Expert, we specialize in delivering reliable online printer support designed to keep
                            your workflow uninterrupted. Our team is committed to providing professional printer help
                            with a focus on speed, accuracy, and long-term performance.
                            Whether you're an individual
                            user or a business searching for printer help near me, we offer tailored solutions to meet
                            your specific needs.
                            <br />
                            From resolving common issues like printer status offline to handling
                            setup, connectivity, and performance challenges, we ensure your devices operate
                            seamlessly. With a service-first approach and technical expertise, we aim to be your trusted partner for
                            consistent, efficient, and hassle-free printing solutions.
                            <br /><br />
                            Contact Expert Printer Support at +1-702-555-0122 for dependable, straightforward
                            assistance whenever you need it.
                        </p>
                        <div style={{ backgroundColor: "var(--bg-color)" }} className="w-40 sm:w-60 lg:w-80 h-1"></div>
                    </div>


                    <div className="w-full overflow-hidden rounded-3xl h-full max-h-[550px]">
                        <img
                            src="/aboutus.webp"
                            alt="Printer Support"
                            loading="lazy"
                            className="w-full h-full object-cover hover:scale-110 transition"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Aboutus;
