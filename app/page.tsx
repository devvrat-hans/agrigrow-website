import { Navbar } from '@/components/common/Navbar';
import { HeroSection } from '@/components/sections/HeroSection';
import { FeaturesSection } from '@/components/sections/FeaturesSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  return (
    <main className="w-full">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <Footer />
    </main>
  );
}
