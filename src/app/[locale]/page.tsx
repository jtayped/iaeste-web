import Collaborators from "@/components/sections/collaborators";
import About from "@/components/sections/home/about";
import Hero from "@/components/sections/home/hero";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <div className="bg-background">
        <Collaborators />
        <About />
      </div>
    </main>
  );
}
