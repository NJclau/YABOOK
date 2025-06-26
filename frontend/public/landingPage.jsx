import React from "react";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <>
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#" className="logo">
            <i className="fas fa-book-open"></i>
            YABOOK
          </a>
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#demo">Demo</a></li>
            <li><a href="#testimonials">Schools</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
          <a href="#cta" className="cta-nav">Start Free Trial</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content fade-in">
            <h1>Create Yearbooks That Bring Your School Together</h1>
            <p>AI-powered collaborative yearbook creation with smart photo search, real-time editing, and seamless compliance. Never lose a memory again.</p>
            <div className="hero-cta">
              <a href="#demo" className="btn-primary">
                <i className="fas fa-play"></i>
                Watch Demo
              </a>
              <a href="#features" className="btn-secondary">
                <i className="fas fa-rocket"></i>
                Explore Features
              </a>
            </div>
          </div>
          <div className="hero-visual fade-in stagger-2">
            <div className="mockup-container">
              <div className="mockup-screen">
                <div className="mockup-content">
                  {[...Array(6)].map((_, i) => (
                    <div className="photo-placeholder" key={i}></div>
                  ))}
                </div>
                <div className="ai-badge">AI Powered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="features-container">
          <div className="section-header fade-in">
            <h2>Everything You Need for Modern Yearbook Creation</h2>
            <p>From AI-powered photo organization to real-time collaboration, YABOOK transforms how schools create memorable yearbooks.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon">
                <i className="fas fa-brain"></i>
              </div>
              <h3>Smart Photo Discovery</h3>
              <p>AI automatically tags, categorizes, and helps you find the perfect photos. Search by faces, events, or even emotions to ensure every memory is captured.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Real-Time Collaboration</h3>
              <p>Students and staff work together seamlessly with live editing, comment threads, and role-based permissions. See changes as they happen.</p>
            </div>
            <div className="feature-card fade-in stagger-3">
              <div className="feature-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Privacy & Compliance</h3>
              <p>FERPA-compliant with automated consent management, secure data handling, and audit trails. Student privacy is always protected.</p>
            </div>
            <div className="feature-card fade-in stagger-4">
              <div className="feature-icon">
                <i className="fas fa-palette"></i>
              </div>
              <h3>Professional Templates</h3>
              <p>Beautiful, customizable layouts designed specifically for schools. From traditional to modern styles, create yearbooks that reflect your school's personality.</p>
            </div>
            <div className="feature-card fade-in stagger-1">
              <div className="feature-icon">
                <i className="fas fa-cloud"></i>
              </div>
              <h3>Cloud-Based Security</h3>
              <p>Enterprise-grade security with automatic backups, version control, and 99.9% uptime. Your yearbook data is always safe and accessible.</p>
            </div>
            <div className="feature-card fade-in stagger-2">
              <div className="feature-icon">
                <i className="fas fa-print"></i>
              </div>
              <h3>Seamless Publishing</h3>
              <p>From digital previews to high-quality print files, export your finished yearbook in any format. Integration with major printing services included.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="demo" id="demo">
        <div className="demo-container">
          <div className="demo-content fade-in">
            <h2>See AI Photo Search in Action</h2>
            <p>Watch how our intelligent photo management system helps you find exactly what you need, when you need it.</p>
            <ul className="demo-features">
              <li><i className="fas fa-check"></i> Search by faces, objects, and events</li>
              <li><i className="fas fa-check"></i> Automatic duplicate detection</li>
              <li><i className="fas fa-check"></i> Smart grouping and suggestions</li>
              <li><i className="fas fa-check"></i> GDPR and FERPA compliant processing</li>
            </ul>
            <a href="#cta" className="btn-primary">
              <i className="fas fa-rocket"></i>
              Try It Free
            </a>
          </div>
          <div className="demo-visual fade-in stagger-2">
            <div className="demo-interface">
              <div className="demo-header">
                <input type="text" className="search-bar" placeholder="Search for 'graduation ceremony' or 'Sarah Johnson'..." />
              </div>
              <div className="demo-results">
                {["Graduation", "Sports", "Class Photo", "Theater", "Science Fair", "Art Show", "Prom", "Club Meeting"].map((label, i) => (
                  <div className="result-item" data-label={label} key={i}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials" id="testimonials">
        <div className="testimonials-container">
          <div className="section-header fade-in">
            <h2>Trusted by Schools Nationwide</h2>
            <p>See how educators are transforming their yearbook creation process with YABOOK.</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card fade-in stagger-1">
              <div className="testimonial-quote">
                "YABOOK revolutionized our yearbook process. The AI photo search saved us countless hours, and the collaboration features let our entire yearbook committee work together seamlessly."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">MJ</div>
                <div className="author-info">
                  <h4>Maria Johnson</h4>
                  <p>Yearbook Advisor, Lincoln High School</p>
                </div>
              </div>
            </div>
            {/* Add more testimonial cards as needed */}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta">
        <div className="cta-container">
          <h2>Get Started with YABOOK Today</h2>
          <p>Transform your school's yearbook creation process. Try YABOOK free or book a personalized demo.</p>
          <div className="cta-buttons">
            <a href="#" className="btn-white"><i className="fas fa-user-plus"></i> Start Free Trial</a>
            <a href="#" className="btn-outline"><i className="fas fa-calendar"></i> Book a Demo</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>YABOOK</h4>
            <a href="#features">Features</a>
            <a href="#demo">Demo</a>
            <a href="#testimonials">Schools</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <a href="#">Help Center</a>
            <a href="#">API Docs</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <a href="mailto:support@yabook.app">support@yabook.app</a>
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2025 YABOOK. All rights reserved.
        </div>
      </footer>
    </>
  );
}
