import Head from "next/head";
import Image from "next/image";
import localFont from "next/font/local";
import styles from "@/styles/Home.module.css";
import { useState } from "react";

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
    title: "always up-to-date Run of Show tool for logistically intense events",
    links: [
      { label: "website", url: "https://www.always.sh/" },
      { label: "iOS app", url: "https://apps.apple.com/us/app/always-sh/id6737702662" },
      { label: "github", url: "https://github.com/SerenityUX/always-web" }
    ],
    image: "always.png"
  },
  {
    title: "7 day hike along the PCT for 30 teenagers to create custom PCBs",
    links: [
      { label: "website", url: "https://trail.hackclub.com/" },
      { label: "documentary", url: "https://youtu.be/ufMUJ9D1fi8?si=g-F3k-PmeQSjSikv" },
      { label: "projects", url: "https://www.youtube.com/watch?v=z1yQBWwmSkg&t=0s" }
    ],
    image: "trail.png"
  },
  {
    title: "SF hackathon for 50 Hack Club leaders from around the world",
    links: [
      { label: "website", url: "https://summit.hackclub.com/" },
      { label: "documentary", url: "https://youtu.be/UZEm5lONg7g?si=F2u4Nt1Ny9X5dAVK" }
    ],
    image: "summit.png"
  },
  {
    title: "AI anime story-board tool for anime enthusiasts to tell their stories",
    links: [
      { label: "website", url: "" },
      { label: "documentary", url: "https://youtu.be/H7rV9B03tiw?si=mg4mzYCELTnX8vnz" },
      { label: "launch", url: "https://www.producthunt.com/products/kodan#kodan" }

    ],
    image: "kodan.png"
  },
  {
    title: "creative workshop platform for teens to learn how to code with friends",
    links: [
      { label: "website", url: "https://jams.hackclub.com/" },
      { label: "github", url: "https://github.com/hackclub/jams" }
    ],
    image: "jams.png"
  },
  {
    title: "put on a VR headset, get on a bike, and go collect carrots with friends",
    links: [
      { label: "documentary", url: "https://youtu.be/Mcirws6Bh4A?si=Hv6PFB7pgHqu_mpJ" }
    ],
    image: "biking.png"
  },
  {
    title: "VR story game about a chai vendor and the rate at which time passes",
    links: [
      { label: "try game", url: "https://sidequestvr.com/app/27172/life-of-chai" },
      { label: "demo video", url: "https://youtu.be/FTNr_K-qD2A?si=y6fdPEskJ0HMpm_e" }
    ],
    image: "lifeofchai.png"
  },
  {
    title: "take photos of a capybara at a beach & have photos sent to your phone",
    links: [
      { label: "try game", url: "https://sidequestvr.com/app/31539/capybara-beach" },
      { label: "demo video", url: "https://youtu.be/sEhCdND3-Kc" }
    ],
    image: "capybara.png"
  },
  {
    title: "card-paring game with penguins, my first mobile app",
    links: [
      { label: "try game", url: "https://youtu.be/duMuCsHNlLA?si=Z_q8vusqxjSGFVnB" },
      { label: "demo video", url: "https://apps.apple.com/us/app/penguin-pair-cards/id6446442403" }
    ],
    image: "penguinpair.png"
  },
  {
    title: "grant to give teenagers free pizza to start hack clubs at their high school",
    links: [
      { label: "website", url: "https://pizza.hackclub.com/" },
    ],
    image: "pizza.png"
  }
];

export default function Home() {
  const [copyFeedback, setCopyFeedback] = useState(false);

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
      </Head>
      <div style={{
        display: "flex",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        justifyContent: "center",
        alignItems: "center",
        padding: "64px 16px"
      }}>
        <div style={{maxWidth: 700, width: "100%"}}>
          <img style={{width: "100%", marginBottom: 8, borderRadius: 8,}}src="./taco.jpeg"/>
          <h1 style={{ fontSize: '36px', fontWeight: 500, marginBottom: 32 }}>Hey, Thomas here! I'm a designer, developer, organizer, & hacker</h1>
          <p style={{marginBottom: 32}}>
            currently building <a href="https://www.always.sh/">Always</a>, prev Clubs Program Lead @ <a href="https://www.hackclub.com">Hack Club</a><br/><br/>
            <a href="mailto:thomas@serenidad.app">email me</a> (
            <a href="#" onClick={copyEmail} style={{ cursor: 'copy' }}>thomas@serenidad.app</a>
            {copyFeedback ? <span className={styles.copyFeedback}> • copied!</span> : ''}) (based in San Francisco)
          </p>
          
          <h2 style={{ fontSize: '28px', fontWeight: 500, marginBottom: 32 }}>past projects</h2>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 32,
            marginBottom: 32
          }}>
            {projects.map((project, index) => (
              <div key={index} style={{marginBottom: 32}}>
                <img 
                  src={project.image} 
                  alt={project.title}
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: 8,
                    marginBottom: 8
                  }}
                />
                
                <p style={{marginBottom: 8}}>{project.title}</p>
                <div style={{display: "flex", gap: 16}}>
                  {project.links.map((link, linkIndex) => (
                    <a 
                      key={linkIndex} 
                      href={link.url}
                      style={{
                        color: "#FF0000",
                        textDecoration: "none"
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <p style={{fontStyle: "italic"}}>~ Thomas<br/>in life we are always learning</p>
        </div>
      </div>
    </>
  );
}
