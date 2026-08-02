import Nav from "../components/marketing/Nav";
import Hero from "../components/marketing/Hero";
import About from "../components/marketing/About";
import Events from "../components/marketing/Events";
import BlogPreview from "../components/marketing/BlogPreview";
import BoardMembers from "../components/marketing/BoardMembers";
import ContactFooter from "../components/marketing/ContactFooter";

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
