import Head from "next/head";
import Link from "next/link";

const vvd = (
  <a href="https://vvd.world" style={{ textDecoration: "underline dotted" }}>
    vvd
  </a>
);

const cocreate = (
  <a href="https://cocreate.cafe" style={{ textDecoration: "underline dotted" }}>
    cocreate
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
        I came across {vvd} while I was building {cocreate}, searching for
        inspiration.
      </p>
      <p>
        I landed on the idea that almost every new interface is an old interface
        upgraded by today&apos;s technology. When it comes to storytelling (the
        focus of {cocreate}), there are few interfaces older than writing out the
        story that&apos;s in your mind—just words on a document. It&apos;s
        intuitive to most of us, and we&apos;ve been writing since we were young,
        so naturally it felt like a good interface for the storytelling tool I was
        building.
      </p>
      <p>
        I started studying {vvd}—notebook in hand, going through the experience
        of making my world and noting what felt good. As I was trying the tool, I
        started to feel it was something really special, so I reached out to the
        people building it.
      </p>
      <p>
        After meeting the team and working with them to build out a new feature on
        the product, I felt this was the product and the team where we can build
        technology that fundamentally changes the way we tell stories and what we
        can do with the stories we tell.
      </p>
      <p>
        Today {vvd} is used primarily by TTRPG players, small game studios, and
        authors as a world bible—storing all the artifacts visually and letting
        them draw relationships between them.
      </p>
      <p>
        One day, I envision {vvd} becoming a more powerful tool for these
        creatives, but also serving larger teams that produce films, games, and
        books. It will be easy to get your data out of your {vvd} world and into
        a product folks can actually use.
      </p>
      <p>
        {vvd} will be the surface where creatives can structure world data in a
        way that feels natural to their process and is easily ingested by both
        people they work with and the tools they use.
      </p>
      <p>
        I imagine this technology will listen to creatives as they express their
        ideas for narrative worlds (understanding timelines, characters, places,
        etc.) and output structured data they can use to develop these worlds into
        many different forms of interactive media.
      </p>
      <p>
        I look forward to making it happen and am extremely grateful to be doing
        it alongside creative, kind, and skilled folks: Zied (co-founder), Haseeb
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
