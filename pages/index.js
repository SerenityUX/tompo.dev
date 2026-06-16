import Head from "next/head";
import Link from "next/link";

const readings = [
  { href: "/next-adventure-vvd", title: "next adventure vvd" },
  {
    href: "https://cocreateblog.vercel.app/stories/30%20Days%20in%20China's%20California",
    title: "dalifornia",
    external: true,
  },
  {
    href: "https://serenityux.github.io/japan-journey/",
    title: "japan journey",
    external: true,
  },
  {
    href: "https://serenityux.github.io/hc-journey/",
    title: "gap year journey",
    external: true,
  },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Thomas Stubblefield</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <p>
        <img src="/thomasImage.jpg" alt="Thomas Stubblefield" width="120" />
      </p>
      <p>Thomas Stubblefield</p>
      <p>
        Building products and spaces that bring creative people together through
        playful design, contagious energy, and co-creation.
      </p>
      <p>
        Building Worlds @ <a href="https://vvd.world">vvd.world</a>
        <br />
        Prev: Led Clubs &amp; Adventures Program @{" "}
        <a href="https://hackclub.com">Hack Club</a>, Made{" "}
        <a href="https://always.sh">Always</a> /{" "}
        <a href="https://www.producthunt.com/products/kodan">Kodan</a> (now{" "}
        <a href="https://cocreate.cafe">cocreate.cafe</a>)
      </p>
      <p>Readings</p>
      <p>
        {readings.map((r) => (
          <span key={r.href}>
            -{" "}
            {r.external ? (
              <a href={r.href}>{r.title}</a>
            ) : (
              <Link href={r.href}>{r.title}</Link>
            )}
            <br />
          </span>
        ))}
      </p>
      <p>
        email me @ <a href="mailto:thomas@serenidad.app">thomas@serenidad.app</a>
      </p>
    </>
  );
}
