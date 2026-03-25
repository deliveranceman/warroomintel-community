export interface Plan {
  id: string
  tier: string
  price: number
  featured?: boolean
  stripeUrl: string
  features: string[]
}

export interface Feature {
  icon: string
  name: string
  description: string
}

export const plans: Plan[] = [
  {
    id: 'soldier',
    tier: 'Soldier',
    price: 19,
    stripeUrl: 'https://buy.stripe.com/aFabITdtW0Hr8BO7xC1RC00',
    features: [
      'Full demon database access',
      'Prayer arsenal library',
      'Article & guide archive',
      'FAQ library',
      'Community forum',
    ],
  },
  {
    id: 'commander',
    tier: 'Commander',
    price: 39,
    featured: true,
    stripeUrl: 'https://buy.stripe.com/28EbIT9dG2Pz6tGbNS1RC01',
    features: [
      'Everything in Soldier',
      'Monthly Zoom training calls',
      'Live Q&A sessions',
      'Downloadable protocols & PDFs',
      'Priority support',
    ],
  },
  {
    id: 'general',
    tier: 'General',
    price: 97,
    stripeUrl: 'https://buy.stripe.com/fZudR1fC4eyhdW87xC1RC02',
    features: [
      'Everything in Commander',
      'Weekly live calls',
      'Ministry consultation access',
      'Team / church sub-accounts',
      'Certification track access',
    ],
  },
]

export const features: Feature[] = [
  {
    icon: '⚔',
    name: 'Demon Database',
    description:
      'Searchable master list — names, functions, entry points, Scripture references, and full deliverance protocols for hundreds of spirits.',
  },
  {
    icon: '📖',
    name: 'Prayer Arsenal',
    description:
      'Targeted prayers, declarations, and decrees organized by category, spirit type, and ministry situation.',
  },
  {
    icon: '🎙',
    name: 'Live Zoom Calls',
    description:
      'Monthly training sessions, Q&A with ministry leaders, and live deliverance teaching you can attend from anywhere.',
  },
  {
    icon: '📝',
    name: 'Articles & Guides',
    description:
      'Deep-dive teaching articles, case studies, and step-by-step protocols for active deliverance ministers.',
  },
  {
    icon: '🔍',
    name: 'FAQ Library',
    description:
      'Curated answers to the most common questions ministers encounter in the field — built from real ministry experience.',
  },
  {
    icon: '🤝',
    name: 'Community Forum',
    description:
      'Connect with other deliverance workers, share case insights, and receive counsel from experienced ministers worldwide.',
  },
]

export const faqItems = [
  {
    q: 'How does the 30-day trial work?',
    a: "You get full access to all features at your chosen tier for 30 days at no charge. Your card is only charged after day 30. Cancel any time before then and you'll never be billed.",
  },
  {
    q: 'Who is this community for?',
    a: "The War Room Community is built for active deliverance ministers, prayer warriors, pastors, and serious believers who want structured, biblical resources for spiritual warfare — not just casual interest content.",
  },
  {
    q: 'How searchable is the demon database?',
    a: 'Every entry is indexed by name, type, also-known-as names, and function. You can search by symptom or name and get targeted results instantly.',
  },
  {
    q: 'When are the live Zoom calls?',
    a: 'Commander and General members get access to monthly group training calls and quarterly Q&A sessions. General members also have access to weekly calls. All calls are recorded and available in the member library afterward.',
  },
  {
    q: 'Can I get a church or team account?',
    a: 'Yes — the General tier includes team sub-accounts for your ministry staff or prayer team. For larger church licensing, contact us directly for a custom arrangement.',
  },
  {
    q: 'Is this theologically sound?',
    a: 'Every resource is Scripture-anchored and aligned with charismatic/Pentecostal orthodox theology. The database is built by a practicing pastor and deliverance minister. This is not New Age, occult, or speculative — it is warfare intelligence grounded in the Word.',
  },
]
