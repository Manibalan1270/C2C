import Nav from "../components/Nav";
import Hero from "../components/Hero";
import About from "../components/sections/About";
import Events from "../components/sections/Events";
import BlogPreview from "../components/sections/BlogPreview";
import BoardMembers from "../components/sections/BoardMembers";
import ContactFooter from "../components/sections/ContactFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Nav />
      <Hero />
      <main>
        <About />
        <Events />
        <BlogPreview />
        <BoardMembers />
      </main>
      <ContactFooter />
    </div>
  );
}
