import {
  Button,
  IconButton,
  Eyebrow,
  Caption,
  ColorBlockSection,
  Card,
  TemplateCard,
  FeatureTile,
  TextInput,
  PricingTabs,
  PromoBanner,
  MarqueeStrip,
  CheckGlyph,
  TopNav,
  Footer,
} from "@/components/ui";

const marqueeItems = [
  "12,000+ leveled books",
  "Phonics to chapter books",
  "Reads aloud in 3 voices",
  "Tracks every word learned",
  "Parent dashboard",
  "Offline storytime",
];

const bookTiles = [
  { title: "The Sleepy Dragon", level: "Level A", color: "bg-block-lime" },
  { title: "Maya Builds a Robot", level: "Level C", color: "bg-block-lilac" },
  { title: "Tide Pool Friends", level: "Level B", color: "bg-block-mint" },
  { title: "The Lost Mitten", level: "Level A", color: "bg-block-pink" },
  { title: "Rocket to Recess", level: "Level D", color: "bg-block-coral" },
  { title: "Grandpa's Garden", level: "Level B", color: "bg-block-cream" },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    note: "For trying it out",
    features: ["50 starter books", "1 reader profile", "Read-aloud voices"],
    featured: false,
  },
  {
    name: "Family",
    price: "$9",
    note: "per month",
    features: [
      "Full 12,000-book library",
      "Up to 4 reader profiles",
      "Progress dashboard",
      "Offline downloads",
    ],
    featured: true,
  },
  {
    name: "Classroom",
    price: "$29",
    note: "per month",
    features: [
      "Everything in Family",
      "Up to 35 students",
      "Assignments & reports",
      "Roster sync",
    ],
    featured: false,
  },
];

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-content px-6 md:px-12">{children}</div>;
}

// Color blocks bleed to the edge on mobile, sit inside the container on desktop.
function BlockContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-content md:px-12">{children}</div>;
}

export default function Home() {
  return (
    <div id="top" className="flex min-h-full flex-col">
      <TopNav />
      <MarqueeStrip items={marqueeItems} />

      <main className="flex-1">
        {/* Hero — the most characteristic thing first: a kid's first sentence. */}
        <Container>
          <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
            <div>
              <Eyebrow>Reading app · ages 3–10</Eyebrow>
              <h1 className="mt-5 text-display-lg md:text-display-xl">
                Every kid&apos;s first &ldquo;I read it myself.&rdquo;
              </h1>
              <p className="mt-6 max-w-md text-body-lg text-ink/80">
                A library that meets your reader exactly where they are — then
                grows one book at a time, from first sounds to whole chapters.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button>Start free</Button>
                <Button variant="secondary">See a sample book</Button>
              </div>
              <p className="mt-4 text-body-sm text-ink/60">
                No card needed · cancel anytime
              </p>
            </div>

            {/* A single book "cover" reading aloud — the product's core moment. */}
            <FeatureTile className="aspect-[4/3] p-8">
              <div className="flex h-full flex-col justify-between">
                <Caption className="text-ink/50">Now reading</Caption>
                <div>
                  <div className="mb-5 inline-flex size-16 items-center justify-center rounded-md bg-block-lime text-display-lg">
                    🐉
                  </div>
                  <p className="text-headline">The Sleepy Dragon</p>
                  <p className="mt-1 text-body-sm text-ink/60">
                    Level A · 24 words
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <IconButton aria-label="Play read-aloud">▶</IconButton>
                  <div className="h-1 flex-1 rounded-full bg-hairline">
                    <div className="h-1 w-1/3 rounded-full bg-primary" />
                  </div>
                  <Caption className="text-ink/50">0:18</Caption>
                </div>
              </div>
            </FeatureTile>
          </section>
        </Container>

        {/* White feature row */}
        <Container>
          <section className="grid gap-4 py-8 md:grid-cols-3 md:py-12">
            {[
              {
                k: "Leveled",
                t: "Books that fit, not frustrate",
                b: "26 reading levels, matched to your child after a 2-minute story.",
              },
              {
                k: "Read-aloud",
                t: "Three voices, real expression",
                b: "Tap any word to hear it, or let the whole page read itself.",
              },
              {
                k: "For grown-ups",
                t: "See progress without quizzing",
                b: "Words learned, minutes read, and what to try next — at a glance.",
              },
            ].map((f) => (
              <FeatureTile key={f.k} className="flex flex-col gap-3 p-6">
                <Eyebrow className="text-ink/50">{f.k}</Eyebrow>
                <p className="text-card-title">{f.t}</p>
                <p className="text-body-sm text-ink/70">{f.b}</p>
              </FeatureTile>
            ))}
          </section>
        </Container>

        {/* Lime story block — the "systems" color in this palette */}
        <BlockContainer>
          <ColorBlockSection color="lime" className="my-12 md:my-24">
            <div className="max-w-2xl">
              <Eyebrow>How it grows</Eyebrow>
              <p className="mt-4 text-headline md:text-display-lg">
                The library learns your reader and moves the line forward.
              </p>
              <p className="mt-5 text-subhead">
                Finish a book and the next one nudges just slightly harder. Stuck
                on a page? It quietly drops back a notch. No tests, no pressure —
                just the right book, ready.
              </p>
              <div className="mt-8">
                <Button>Take the 2-minute placement</Button>
              </div>
            </div>
          </ColorBlockSection>
        </BlockContainer>

        {/* Navy story block — the only inverse surface above the footer */}
        <BlockContainer>
          <ColorBlockSection color="navy" className="my-12 md:my-24">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <Eyebrow className="text-inverse-ink/70">
                  Storytime, anywhere
                </Eyebrow>
                <p className="mt-4 text-headline md:text-display-lg">
                  Download tonight&apos;s books before the car ride.
                </p>
                <p className="mt-5 text-subhead text-inverse-ink/80">
                  Whole levels travel offline — airplane mode, basement
                  blanket-fort, or grandma&apos;s spotty Wi-Fi. The reading
                  doesn&apos;t stop.
                </p>
              </div>
              <div className="flex gap-3 md:justify-end">
                <IconButton variant="inverse" aria-label="Previous">
                  ‹
                </IconButton>
                <IconButton variant="inverse" aria-label="Next">
                  ›
                </IconButton>
              </div>
            </div>
          </ColorBlockSection>
        </BlockContainer>

        {/* Coral story block */}
        <BlockContainer>
          <ColorBlockSection color="coral" className="my-12 md:my-24">
            <div className="max-w-2xl">
              <Eyebrow>For teachers</Eyebrow>
              <p className="mt-4 text-headline md:text-display-lg">
                Assign a level, watch a whole class light up.
              </p>
              <p className="mt-5 text-subhead">
                Roster sync, per-student reports, and assignments that grade
                themselves. Bring Storyloft to your classroom in an afternoon.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button>For schools</Button>
                <Button variant="secondary">Book a walkthrough</Button>
              </div>
            </div>
          </ColorBlockSection>
        </BlockContainer>

        {/* Template / book grid */}
        <Container>
          <section id="library" className="py-12 md:py-24">
            <Eyebrow>Explore the shelves</Eyebrow>
            <h2 className="mt-4 text-display-lg">What kids are reading today</h2>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
              {bookTiles.map((book) => (
                <TemplateCard key={book.title} className="flex flex-col gap-4">
                  <div
                    className={`flex aspect-[3/2] items-center justify-center rounded-sm ${book.color} text-4xl`}
                  >
                    📖
                  </div>
                  <div>
                    <p className="text-card-title leading-tight">{book.title}</p>
                    <Caption className="mt-2 text-ink/50">{book.level}</Caption>
                  </div>
                </TemplateCard>
              ))}
            </div>
          </section>
        </Container>

        {/* Pricing */}
        <Container>
          <section id="pricing" className="py-12 md:py-24">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <Eyebrow>Pricing</Eyebrow>
                <h2 className="mt-4 text-display-lg">One plan per household.</h2>
              </div>
              <PricingTabs options={["Monthly", "Yearly"]} />
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {tiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={
                    tier.featured ? "border-2 border-primary" : undefined
                  }
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-card-title">{tier.name}</p>
                    {tier.featured && (
                      <Caption className="rounded-full bg-primary px-3 py-1 text-on-primary">
                        Popular
                      </Caption>
                    )}
                  </div>
                  <p className="mt-4 text-display-lg leading-none">
                    {tier.price}
                  </p>
                  <p className="mt-1 text-body-sm text-ink/60">{tier.note}</p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-body-sm"
                      >
                        <CheckGlyph className="mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button
                      variant={tier.featured ? "primary" : "secondary"}
                      className="w-full"
                    >
                      Choose {tier.name}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </Container>

        {/* Lilac promo banner with the single-shot magenta CTA */}
        <Container>
          <PromoBanner
            action={<Button variant="magenta">Save your spot</Button>}
          >
            <p className="text-card-title">New: read-along recordings</p>
            <p className="text-body-sm text-ink/70">
              Record yourself reading — your kid follows along when you&apos;re
              away.
            </p>
          </PromoBanner>
        </Container>

        {/* Lime FAQ + contact, closing the page on the signature color */}
        <BlockContainer>
          <ColorBlockSection color="lime" className="my-12 md:my-24">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <Eyebrow>Questions</Eyebrow>
                <p className="mt-4 text-headline">
                  Everything parents ask, before they ask.
                </p>
                <dl className="mt-8 flex flex-col gap-6">
                  {[
                    {
                      q: "What age is this for?",
                      a: "Pre-readers at 3 through confident readers at 10.",
                    },
                    {
                      q: "Is there any screen-time guilt?",
                      a: "Set daily limits and a bedtime cutoff per profile.",
                    },
                    {
                      q: "Can siblings share it?",
                      a: "Family includes up to 4 separate reader profiles.",
                    },
                  ].map((item) => (
                    <div key={item.q}>
                      <dt className="text-body-lg font-medium">{item.q}</dt>
                      <dd className="mt-1 text-body text-ink/70">{item.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-md bg-canvas/60 p-6 md:p-8">
                <p className="text-card-title">Get a free book every week</p>
                <p className="mt-2 text-body-sm text-ink/70">
                  We&apos;ll send one hand-picked read for your child&apos;s
                  level. Unsubscribe anytime.
                </p>
                <form className="mt-6 flex flex-col gap-4">
                  <TextInput
                    label="Your email"
                    type="email"
                    placeholder="you@home.com"
                  />
                  <TextInput
                    label="Child's reading level"
                    placeholder="Not sure? We'll help you find it"
                  />
                  <Button type="submit" className="w-full">
                    Send my first book
                  </Button>
                </form>
              </div>
            </div>
          </ColorBlockSection>
        </BlockContainer>
      </main>

      <Footer />
    </div>
  );
}
