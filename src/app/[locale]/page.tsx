import Collaborators from "@/components/sections/collaborators";
import Contact from "@/components/sections/contact";
import About from "@/components/sections/home/about";
import Hero from "@/components/sections/home/hero";
import HowItWorks from "@/components/sections/home/how-it-works";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <div className="bg-background">
        <Collaborators />
        <About />
        <HowItWorks />
        <Contact />
      </div>
    </main>
  );
}
