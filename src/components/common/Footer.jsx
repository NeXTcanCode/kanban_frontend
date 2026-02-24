function Footer() {
  const currentYear = new Date().getFullYear();
  return <footer className="footer">NeXT 2026-{currentYear}</footer>;
}

export default Footer;
