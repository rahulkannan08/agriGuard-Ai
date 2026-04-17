import React from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Sidebar from "../components/Sidebar";

const Support = ({ user, language }) => {
  const navigate = useNavigate();

  const supportItems = [
    {
      icon: "help",
      title: "About AgriGuard AI",
      description:
        "AgriGuard AI is an AI-powered agricultural intelligence platform designed to help farmers and agricultural officials detect crop diseases early, manage outbreaks, and make data-driven decisions for sustainable farming. Our platform leverages cutting-edge machine learning and computer vision technology to revolutionize agricultural disease management across India.",
    },
    {
      icon: "security",
      title: "Data Privacy & Security",
      description:
        "We prioritize your data security. All farmer data is encrypted and stored securely. We comply with international data protection standards and never share your personal information with third parties. Your location, health data, and farming information remain completely private.",
    },
    {
      icon: "language",
      title: "Multilingual Support",
      description:
        "AgriGuard AI supports English, Tamil, and Kannada to ensure accessibility for all farmers across different regions. Real-time translation and voice input available in all supported languages. We're continuously adding more regional languages.",
    },
    {
      icon: "psychology",
      title: "AI Technology",
      description:
        "Our AI models are trained on hundreds of thousands of crop images from across India. We use advanced computer vision and machine learning to provide 95%+ accurate disease detection. Our algorithms continuously improve with each new scan and farmer feedback.",
    },
    {
      icon: "speed",
      title: "Real-Time Diagnosis",
      description:
        "Get instant disease diagnosis and treatment recommendations. Our system processes leaf images in seconds and provides detailed protocols for organic and conventional treatments. Includes recommended pesticides, dosages, and application methods.",
    },
    {
      icon: "public",
      title: "Regional Disease Maps",
      description:
        "Access real-time disease spread maps for your region. Track disease outbreaks, view severity levels, and receive alerts when threats approach your area. View heatmaps of affected regions and historical disease trends.",
    },
    {
      icon: "phone",
      title: "Contact & Helpline",
      description:
        "Need help? Contact our support team: +91-9876543210 | Email: support@agriguard.ai | WhatsApp: +91-9876543210. Available 24/7 in English, Tamil, and Kannada. Our agricultural experts are ready to assist you.",
    },
    {
      icon: "info",
      title: "Platform Information",
      description:
        "Website: www.agriguard.ai | Version: 2.0.0 | Last Updated: April 2026. Platform: Web & Mobile (iOS/Android). Downloads: Over 500,000+ active farmers. Coverage: All major crop types across Indian regions.",
    },
    {
      icon: "school",
      title: "Learning Resources",
      description:
        "Access free educational materials, crop guides, farmer tutorials, and best practices for organic farming. Watch video guides on proper leaf scanning technique for accurate disease detection. Learn about integrated pest management strategies.",
    },
    {
      icon: "trending_up",
      title: "Seasonal Analytics",
      description:
        "Get crop-specific insights for each season. Track crop health trends over time. Receive personalized recommendations based on your historical scans. View comparative analytics with other farmers in your region.",
    },
    {
      icon: "handshake",
      title: "Community Support",
      description:
        "Connect with thousands of farmers in our community. Share experiences, tips, and best practices. Participate in farmer forums and discussion groups. Get advice from experienced agricultural experts and fellow farmers.",
    },
    {
      icon: "verified_user",
      title: "Accuracy Guarantee",
      description:
        "Our disease detection system is verified by agricultural experts and has 95%+ accuracy rate. Every diagnosis is cross-verified with expert knowledge bases. If you're unsure about a diagnosis, always consult with local agricultural officers.",
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} navigate={navigate} active="support" />
      <div className="flex-grow md:ml-64">
        <Navigation user={user} updateUserProfile={updateUserProfile} />
        <main className="p-4 md:p-8 pb-24 bg-surface">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero Section */}
            <section className="relative">
              <div className="bg-primary text-white rounded-xl p-8 md:p-12 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary-container rounded-full opacity-20 blur-2xl"></div>
                <div className="relative z-10">
                  <h1 className="text-4xl md:text-5xl font-black font-headline mb-4">
                    Help & Support Center
                  </h1>
                  <p className="text-lg opacity-90 max-w-2xl">
                    Learn more about AgriGuard AI, how it works, and how we can
                    help you grow healthier crops.
                  </p>
                </div>
              </div>
            </section>

            {/* Support Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supportItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-surface-container-lowest rounded-xl p-6 md:p-8 border border-outline-variant/10 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-primary mb-2 font-headline">
                        {item.title}
                      </h3>
                      <p className="text-on-surface-variant leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ Section */}
            <section className="bg-surface-container-low rounded-xl p-8">
              <h2 className="text-3xl font-bold font-headline text-primary mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                <details className="bg-surface-container-lowest rounded-lg p-6 open:bg-primary/5 cursor-pointer">
                  <summary className="flex items-center justify-between font-bold text-lg text-primary cursor-pointer">
                    How accurate is the disease detection?
                    <span className="material-symbols-outlined">
                      expand_more
                    </span>
                  </summary>
                  <p className="mt-4 text-on-surface-variant">
                    Our AI model achieves 95%+ accuracy in disease detection.
                    However, we always recommend consulting with local
                    agricultural experts for critical decisions. The system is
                    designed to provide early warnings and support
                    decision-making, not replace professional expertise.
                  </p>
                </details>

                <details className="bg-surface-container-lowest rounded-lg p-6 open:bg-primary/5 cursor-pointer">
                  <summary className="flex items-center justify-between font-bold text-lg text-primary cursor-pointer">
                    Can I use AgriGuard AI offline?
                    <span className="material-symbols-outlined">
                      expand_more
                    </span>
                  </summary>
                  <p className="mt-4 text-on-surface-variant">
                    AgriGuard AI currently requires an internet connection for
                    disease diagnosis. However, limited functionality is
                    available offline. Download our mobile app for improved
                    offline support in future versions.
                  </p>
                </details>

                <details className="bg-surface-container-lowest rounded-lg p-6 open:bg-primary/5 cursor-pointer">
                  <summary className="flex items-center justify-between font-bold text-lg text-primary cursor-pointer">
                    Is my data safe and private?
                    <span className="material-symbols-outlined">
                      expand_more
                    </span>
                  </summary>
                  <p className="mt-4 text-on-surface-variant">
                    Yes. All data is encrypted with industry-standard SSL/TLS
                    protocols. We comply with GDPR and Indian data protection
                    laws. Your personal information is never shared or sold.
                    Disease scan images are used only for improving our AI with
                    your consent.
                  </p>
                </details>

                <details className="bg-surface-container-lowest rounded-lg p-6 open:bg-primary/5 cursor-pointer">
                  <summary className="flex items-center justify-between font-bold text-lg text-primary cursor-pointer">
                    How do I report a problem or suggest a feature?
                    <span className="material-symbols-outlined">
                      expand_more
                    </span>
                  </summary>
                  <p className="mt-4 text-on-surface-variant">
                    We love feedback! Contact us at feedback@agriguard.ai or use
                    the feedback button in the app. Your suggestions help us
                    improve the platform for all users.
                  </p>
                </details>
              </div>
            </section>

            {/* Contact Section */}
            <section className="bg-gradient-to-r from-primary to-primary-container text-white rounded-xl p-8 md:p-12">
              <h2 className="text-3xl font-bold font-headline mb-6">
                Get in Touch
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-4">
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <p className="flex items-center gap-3">
                      <span className="material-symbols-outlined">phone</span>
                      +91-9876-543-210
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="material-symbols-outlined">email</span>
                      support@agriguard.ai
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="material-symbols-outlined">
                        location_on
                      </span>
                      Bangalore, Karnataka, India
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4">Business Hours</h3>
                  <div className="space-y-2 text-sm">
                    <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                    <p>Saturday: 9:00 AM - 2:00 PM IST</p>
                    <p>Sunday: Closed</p>
                    <p className="font-bold mt-4">
                      Emergency Support: Available 24/7
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Support;
