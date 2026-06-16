import Head from "next/head";
import Link from "next/link";

const vvd = (
  <a href="https://vvd.world" style={{ textDecoration: "underline dotted" }}>
    vvd
  </a>
);

export default function NextAdventure() {
  return (
    <>
      <Head>
        <title>Next Adventure</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <p>
        <Link href="/">&larr; Readings</Link>
      </p>
      <p>Hey, Thomas here.</p>
      <p>
        Today I am embarking on a new journey. I&apos;m joining {vvd} as Founding
        Engineer.
      </p>
      <p>
        I imagine technology that listens to our narrative worlds (understands
        timelines, characters, places, etc.) and gives us structured data we can
        use to develop these worlds into many different forms of interactive
        media.
      </p>
      <p>
        Today, {vvd} is home to thousands of TTRPG storytellers, indie game
        developers, and authors.
      </p>
      <p>
        One day, I envision {vvd} becoming a more powerful tool for these
        creatives, but also serving millions of teams that produce films, novels,
        and games. {vvd} will be the surface where creatives can nautrally structure world
        data and have that data easily ingested
        by both people and the tools they use.
      </p>
      <p>
        I look forward to making it happen and grateful to be doing it alongside
        creative, kind, and skilled folks: Zied (co-founder), Haseeb
        (co-founder), and Felicia (Head of Growth).
      </p>
      <p>Let&apos;s see where this adventure leads.</p>
      <p>
        ~Thomas
        <br />
        <i>In life, we are always learning</i>
      </p>
      <p>
        <img src="/wave.jpg" alt="" width="180" />
      </p>
      <p style={{ opacity: 0.3, fontSize: "0.75em" }}>
        June 16 2026 1:30PM PST
      </p>
    </>
  );
}
