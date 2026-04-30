function Footer() {
  return (
    <footer className="footer">
      <div className="footer-shell">
        <a className="brand-name" href="/" aria-label="RateMySite home">
          RateMySite
        </a>
        <nav className="footer-links" aria-label="Footer links">
          <a href="/?view=discover#gallery">Discover Sites</a>
          <a href="/?view=top-rated#gallery">Top Rated Websites</a>
          <a href="/?category=landing-page#gallery">Landing Page Reviews</a>
          <a href="/sitemap.xml">Sitemap</a>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
