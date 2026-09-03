import LandingNavbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorks from "@/components/landing/HowItWorks";
import EmergencyQR from "@/components/landing/EmergencyQR";
import UrduSection from "@/components/landing/UrduSection";
import TrustSection from "@/components/landing/TrustSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-vault-stoneWhite">
      <LandingNavbar />
      <main>
        <Hero />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorks />
        <EmergencyQR />
        <UrduSection />
        <TrustSection />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
