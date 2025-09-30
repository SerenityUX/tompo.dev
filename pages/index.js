import Head from "next/head";
import Image from "next/image";
import localFont from "next/font/local";
import styles from "@/styles/Home.module.css";
import { useState, useEffect } from "react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const projects = [
  {
    name: "Always",
    title: "always up-to-date Run of Show tool for logistically intense events",
    links: [
      { label: "website", url: "https://www.always.sh/" },
      { label: "iOS app", url: "https://apps.apple.com/us/app/always-sh/id6737702662" },
      { label: "github", url: "https://github.com/SerenityUX/always-web" }
    ],
    image: "always.png"
  },
  {
    name: "Trail",
    title: "7 day hike along the PCT for 30 teenagers to create custom PCBs",
    links: [
      { label: "website", url: "https://trail.hackclub.com/" },
      { label: "documentary", url: "https://youtu.be/ufMUJ9D1fi8?si=g-F3k-PmeQSjSikv" },
      { label: "projects", url: "https://www.youtube.com/watch?v=z1yQBWwmSkg&t=0s" }
    ],
    image: "trail.png"
  },
  {
    name: "Summit",
    title: "SF hackathon for 50 Hack Club leaders from around the world",
    links: [
      { label: "website", url: "https://summit.hackclub.com/" },
      { label: "documentary", url: "https://youtu.be/UZEm5lONg7g?si=F2u4Nt1Ny9X5dAVK" }
    ],
    image: "summit.png"
  },
  {
    name: "Kōdan",
    title: "AI anime story-board tool for anime enthusiasts to tell their stories",
    links: [
      { label: "website", url: "https://www.kodan.app/" },
      { label: "documentary", url: "https://youtu.be/H7rV9B03tiw?si=mg4mzYCELTnX8vnz" },
      { label: "launch", url: "https://www.producthunt.com/products/kodan#kodan" }

    ],
    image: "kodan.png"
  },
  {
    name: "Jams",
    title: "creative workshop platform for teens to learn how to code with friends",
    links: [
      { label: "website", url: "https://jams.hackclub.com/" },
      { label: "github", url: "https://github.com/hackclub/jams" }
    ],
    image: "jams.png"
  },
  {
    name: "Bikstar",
    title: "put on a VR headset, get on a bike, and go collect carrots with friends",
    links: [
      { label: "documentary", url: "https://youtu.be/Mcirws6Bh4A?si=Hv6PFB7pgHqu_mpJ" }
    ],
    image: "biking.png"
  },
  {
    name: "Life of Chai",
    title: "VR story game about a chai vendor and the rate at which time passes",
    links: [
      { label: "try game", url: "https://sidequestvr.com/app/27172/life-of-chai" },
      { label: "demo video", url: "https://youtu.be/FTNr_K-qD2A?si=y6fdPEskJ0HMpm_e" }
    ],
    image: "lifeOfChai.png"
  },
  {
    name: "Capybara Beach",
    title: "take photos of a capybara at a beach & have photos sent to your phone",
    links: [
      { label: "try game", url: "https://sidequestvr.com/app/31539/capybara-beach" },
      { label: "demo video", url: "https://youtu.be/sEhCdND3-Kc" }
    ],
    image: "capybara.png"
  },
  {
    name: "Penguin Pair",
    title: "card-paring game with penguins, my first mobile app",
    links: [
      { label: "try game", url: "https://youtu.be/duMuCsHNlLA?si=Z_q8vusqxjSGFVnB" },
      { label: "demo video", url: "https://apps.apple.com/us/app/penguin-pair-cards/id6446442403" }
    ],
    image: "penguinpair.png"
  },
  {
    name: "Pizza Grant",
    title: "grant to give teenagers free pizza to start hack clubs at their high school",
    links: [
      { label: "website", url: "https://pizza.hackclub.com/" },
    ],
    image: "pizza.png"
  }
];

export default function Home() {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [hoveredProject, setHoveredProject] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [currentlyHovering, setCurrentlyHovering] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const calculateAge = () => {
    const birthDate = new Date(2004, 8, 28);
    const now = new Date();
    
    // Calculate whole years
    let years = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      years--;
    }
    
    // Calculate days in current year (accounting for leap years)
    const isLeapYear = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInYear = isLeapYear(now.getFullYear()) ? 366 : 365;
    
    // Calculate decimal portion
    const yearStart = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    const daysSinceYearStart = (now - yearStart) / (1000 * 60 * 60 * 24);
    const decimal = daysSinceYearStart / daysInYear;
    
    return (years + decimal).toFixed(2);
  };


  const copyEmail = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText('thomas@serenidad.app');
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 3000);
  };

  return (
    <>
      <Head>
        <title>Thomas Stubblefield</title>
        <meta name="description" content="indie hacker in SF" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        <meta property="og:image" content="https://tompo.dev/selfie.png" />
        <meta property="og:image:width" content="1480" />
        <meta property="og:image:height" content="932" />
        <meta property="og:title" content="Thomas Stubblefield" />
        <meta property="og:description" content="indie hacker in SF" />
        <meta property="og:type" content="website" />
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes popupHeightIn {
              from {
                height: 0;
                width: 0;
                opacity: 0;
                transform: translateX(-50%) translateY(-100%) scale(0);
                transform-origin: bottom center;
                overflow: hidden;
              }
              to {
                height: auto;
                width: 320px;
                opacity: 1;
                transform: translateX(-50%) translateY(-100%) scale(1);
                transform-origin: bottom center;
                overflow: visible;
              }
            }
            @keyframes popupHeightOut {
              from {
                height: auto;
                width: 320px;
                opacity: 1;
                transform: translateX(-50%) translateY(-100%) scale(1);
                transform-origin: bottom center;
                overflow: visible;
              }
              to {
                height: 0;
                width: 0;
                opacity: 0;
                transform: translateX(-50%) translateY(-100%) scale(0);
                transform-origin: bottom center;
                overflow: hidden;
              }
            }
            .popup-animate-in {
              animation: popupHeightIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            }
            .popup-animate-out {
              animation: popupHeightOut 0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards;
            }
          `
        }} />
      </Head>
      <div style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: "#fff"
      }}>
        <div style={{
          display: "flex",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          justifyContent: "center",
          alignItems: "center",
          padding: "64px 16px",
          position: "relative",
          zIndex: 1
        }}>
          <div style={{maxWidth: 700, width: "100%"}}>
            <a 
              href="https://github.com/serenityux" 
              target="_blank" 
              rel="noopener noreferrer"
              className="project-card"
              style={{
                width: 128,
                height: 128,
                marginBottom: 8,
                borderRadius: 16,
                display: 'block'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderRadius = '64px';  // Half of width/height for circle
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderRadius = '16px';
              }}
            >
              <img 
                src="./taco.jpeg" 
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: "cover",
                  borderRadius: 'inherit',
                  transition: 'border-radius 0.2s ease'
                }}
              />
            </a>
            <h1 style={{ fontSize: '36px', fontWeight: 500, marginBottom: 32 }}>Hey, welcome to my corner of the internet.</h1>
            <p style={{marginBottom: 32}}>
              Organizing adventures @ <a href="https://www.hackclub.com">Hack Club</a> (HQ-SF)<br/><br/>
              <a href="mailto:thomas@serenidad.app">email me</a> (
              <a href="#" onClick={copyEmail} style={{ cursor: 'copy' }}>thomas@serenidad.app</a>
              {copyFeedback ? <span className={styles.copyFeedback}> • copied!</span> : ''}) (based in San Francisco & {calculateAge()} years old as of today)
            </p>
                        
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 32
            }}>
              {projects.map((project, index) => (
                <a
                  key={index}
                  href={project.links[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: "#fff",
                    color: "#000000",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontWeight: 500,
                    border: "1px solid #000000",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    textDecoration: "none"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = "#D41B02";
                    e.currentTarget.style.borderColor = "#D41B02";
                    
                    // Clear any existing timeout
                    if (hoverTimeout) {
                      clearTimeout(hoverTimeout);
                      setHoverTimeout(null);
                    }
                    
                    setCurrentlyHovering(true);
                    setHoveredProject(project);
                    setIsAnimating(true);
                    setIsAnimatingOut(false);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPopupPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8
                    });
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = "#000000";
                    e.currentTarget.style.borderColor = "#000000";
                    
                    setCurrentlyHovering(false);
                    // Set timeout to hide popup after 1 second
                    const timeout = setTimeout(() => {
                      if (!currentlyHovering) {
                        setIsAnimating(false);
                        setIsAnimatingOut(true);
                        setTimeout(() => setHoveredProject(null), 250); // Wait for animation to complete
                      }
                    }, 1000);
                    setHoverTimeout(timeout);
                  }}
                >
                  {project.name}
                </a>
              ))}
            </div>
            
            {/* Project Popup */}
            {(hoveredProject && currentlyHovering) && (
              <div
                className={isAnimating ? "popup-animate-in" : isAnimatingOut ? "popup-animate-out" : ""}
                style={{
                  position: "fixed",
                  left: popupPosition.x,
                  top: popupPosition.y,
                  transform: "translateX(-50%) translateY(-100%)",
                  zIndex: 1000,
                  backgroundColor: "#fff",
                  border: "2px solid #000",
                  borderRadius: "6px",
                  padding: "12px",
                  maxWidth: "320px",
                  width: "320px",
                  fontSize: "13px",
                  lineHeight: "1.4"
                }}
                onMouseOver={() => {
                  // Clear timeout when hovering over popup
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    setHoverTimeout(null);
                  }
                  setCurrentlyHovering(true);
                  setIsAnimating(true);
                  setIsAnimatingOut(false);
                }}
                onMouseOut={() => {
                  setCurrentlyHovering(false);
                  // Set timeout to hide popup after 1 second
                  const timeout = setTimeout(() => {
                    if (!currentlyHovering) {
                      setIsAnimating(false);
                      setIsAnimatingOut(true);
                      setTimeout(() => setHoveredProject(null), 250); // Wait for animation to complete
                    }
                  }, 1000);
                  setHoverTimeout(timeout);
                }}
              >
                {/* Triangle pointer */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "0",
                    height: "0",
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: "6px solid #fff"
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "-7px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "0",
                    height: "0",
                    borderLeft: "7px solid transparent",
                    borderRight: "7px solid transparent",
                    borderTop: "7px solid #000"
                  }}
                />
                <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                  <img
                    src={hoveredProject.image}
                    alt={hoveredProject.title}
                    style={{
                      width: "120px",
                      height: "68px",
                      objectFit: "cover",
                      borderRadius: "4px",
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: "600",
                      fontSize: "14px",
                      color: "#000",
                      marginBottom: "4px"
                    }}>
                      {hoveredProject.name}
                    </div>
                    <div style={{
                      fontSize: "12px",
                      color: "#666",
                      lineHeight: "1.3"
                    }}>
                      {hoveredProject.title}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: "8px",
                  borderTop: "1px solid #eee",
                  paddingTop: "8px"
                }}>
                  {hoveredProject.links.map((link, linkIndex) => (
                    <a
                      key={linkIndex}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#D41B02",
                        textDecoration: "none",
                        fontSize: "12px",
                        padding: "2px 6px",
                        transition: "text-decoration 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
{/*             
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 32,
              marginBottom: 32
            }}>
              {projects.map((project, index) => (
                <div key={index} style={{marginBottom: 32}}>
                  <a 
                    href={project.links[0].url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      position: 'relative',
                      borderRadius: 24,
                      overflow: 'hidden',
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 0 0 rgba(212, 27, 2, 0)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#D41B02';
                      e.currentTarget.style.borderRadius = '32px';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(212, 27, 2, 0.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.borderRadius = '16px';
                      e.currentTarget.style.boxShadow = '0 0 0 rgba(212, 27, 2, 0)';
                    }}
                  >
                    <img 
                      src={project.image} 
                      alt={project.title}
                      style={{
                        width: "100%", 
                        height: "auto",
                        display: "block",
                        borderRadius: 'inherit',
                        transition: 'border-radius 0.2s ease'
                      }}
                    />
                  </a>
                  <p style={{marginTop: 12}}>{project.title}</p>
                  <div style={{display: "flex", gap: 16, flexWrap: "wrap"}}>
                    {project.links.map((link, linkIndex) => (
                      <a 
                        key={linkIndex} 
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#D41B02",
                          textDecoration: "none",
                          transition: "text-decoration 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div> */}
            
            <p style={{fontStyle: "italic"}}>~ Thomas<br/>in life we are always learning</p>
            
            <div style={{
              marginTop: 32,
              display: "flex",
              gap: 16,
              opacity: 0.5,
              fontSize: "14px"
            }}>
              <a 
                href="https://x.com/thomas_hacks" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                twitter
              </a>
              <span>•</span>
              <a 
                href="https://github.com/serenityux" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                github
              </a>
              <span>•</span>
              <a 
                href="mailto:thomas@serenidad.app"
              >
                email
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
