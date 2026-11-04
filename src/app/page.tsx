import Link from 'next/link';
import { BrandLogo } from '@/components/ui';
import { PublicFooter, ArrowLink } from '@/components/public-shell';
import {
  ArrowRightIcon,
  BuildingIcon,
  CheckCircleIcon,
  CheckIcon,
  EyeIcon,
  FileTextIcon,
  HandIcon,
  LockIcon,
  MapPinIcon,
  ScanIcon,
  ShieldIcon,
  SparklesIcon,
  TagIcon,
} from '@/components/icons';
import { getUser, roleHome } from '@/lib/auth';
import { qrPngDataUrl } from '@/lib/qr';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    icon: TagIcon,
    title: 'Register',
    body: 'Add a laptop, phone or instrument to your account and print its QR label. The code holds a random token — never your name or ID.',
  },
  {
    icon: FileTextIcon,
    title: 'Report',
    body: 'When something goes missing, file one report. Security and the lost-property desk see it immediately, instead of hearing about it days later.',
  },
  {
    icon: ScanIcon,
    title: 'Recover',
    body: 'Anyone who finds a labelled device can scan it. They see “please hand it in” — without ever seeing your contact details.',
  },
];

const STORY = [
  { title: 'A laptop goes missing', body: 'Abel’s laptop disappears from the library. He reports it in CampusGuard with the last place he saw it.' },
  { title: 'The record updates instantly', body: 'The device is flagged as reported missing and the security office is notified.' },
  { title: 'Someone finds it', body: 'Hana finds it an hour later and scans the label with her phone camera.' },
  { title: 'Privacy holds', body: 'She is told to hand it in — and never sees Abel’s name, phone number or email.' },
  { title: 'The desk closes the loop', body: 'The hand-in is logged. Abel gets a notification telling him where to collect it.' },
];

const LIMITS = [
  {
    icon: ShieldIcon,
    title: 'No theft prevention',
    body: 'A determined thief ignores the sticker. CampusGuard creates the record that makes recovery possible.',
  },
  {
    icon: MapPinIcon,
    title: 'No device tracking',
    body: 'There is no GPS in the system. Manufacturer tools do tracking better — this does something else.',
  },
  {
    icon: EyeIcon,
    title: 'A scan is not a verdict',
    body: 'No one is detained or accused on the basis of a screen. A result is a prompt for a conversation.',
  },
  {
    icon: HandIcon,
    title: 'Registration is voluntary',
    body: 'An unregistered device is not a suspicious device. Absence of a label proves nothing.',
  },
];

const TRUST = [
  {
    icon: LockIcon,
    title: 'Privacy by design',
    body: 'QR codes contain an opaque token. Strangers who scan a label learn nothing about the owner.',
  },
  {
    icon: BuildingIcon,
    title: 'One platform, many organisations',
    body: 'Every university, college or company gets its own tenant, domains, administrators and rules.',
  },
  {
    icon: MapPinIcon,
    title: 'Hosted in Ethiopia',
    body: 'Data stays in-country, in line with the Personal Data Protection Proclamation No. 1321/2024.',
  },
];

export default async function HomePage() {
  const session = await getUser();
  // A real, working QR on the mock label — scanning it opens the found page.
  const qr = await qrPngDataUrl(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/found`, 320, 1);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------------------------ header + hero ---- */}
      <header className="bg-ink-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link href="/" aria-label="CampusGuard home">
            <BrandLogo onDark />
          </Link>
          <nav aria-label="Public" className="flex items-center gap-2">
            <Link href="/found" className="hidden text-sm font-medium text-slate-300 transition-colors hover:text-white sm:inline-block sm:px-2">
              I found a device
            </Link>
            {session ? (
              <Link href={roleHome(session.role)} className="btn-primary btn-sm">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-on-ink btn-sm">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary btn-sm">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div aria-hidden="true" className="ink-grid absolute inset-0" />
        <div aria-hidden="true" className="ink-glow absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-slate-200">
              <SparklesIcon className="h-4 w-4 text-brand-300" />
              Register. Report. Recover.
            </p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[54px]">
              Lost on campus.
              <br />
              <span className="text-gradient">Found on record.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              Thousands of laptops, phones and instruments move through shared spaces every day. CampusGuard connects
              the student, the device, the report and the person who finds it — so missing things come back.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn-primary">
                Register a device
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/found" className="btn-on-ink">
                I found a device
              </Link>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
              {['No personal data in the QR', 'No location tracking', 'Voluntary registration'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Product mock — decorative */}
          <div aria-hidden="true" className="relative mx-auto mt-16 h-[380px] w-full max-w-[420px] animate-fade-up sm:h-[420px] lg:mt-0">
            <div className="absolute left-2 top-2 w-[240px] -rotate-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-glow sm:left-6 sm:w-[260px]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-800 text-white">
                  <ShieldIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AASTU · CampusGuard</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="" className="mx-auto mt-4 h-40 w-40 rounded-lg" />
              <p className="mt-3 text-center text-sm font-semibold text-slate-900">Dell Latitude 5420</p>
              <p className="mt-1 text-center">
                <span className="code-chip">LAPTOP · CG-7K2M-9Q4X</span>
              </p>
            </div>

            <div className="absolute -bottom-2 right-0 w-[260px] rotate-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-glow sm:right-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircleIcon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-900">Registered</span>
                </div>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">LIVE</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">No active reports · carrier matches owner</p>
              <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">What to do</p>
                <p className="mt-0.5 text-xs text-slate-700">Allow the student to proceed.</p>
              </div>
            </div>

            <div className="absolute right-6 top-0 animate-float rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur sm:right-12">
              ✓ Recovered in 2 h 14 m
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ trust strip ------ */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {TRUST.map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ how it works ----- */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Three steps between lost and found
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            The failure is rarely technical — it is that nobody holds a record connecting the owner, the device, the
            report and the finder. CampusGuard is that record.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card relative p-6 transition-shadow hover:shadow-lift">
              <span className="absolute right-6 top-6 font-display text-xs font-semibold tracking-[0.18em] text-slate-500">
                0{index + 1}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ recovery story --- */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">Anatomy of a recovery</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              How Abel’s laptop came home
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              No GPS. No accusations. No strangers with your phone number. Just a record everyone can trust, and a
              five-step loop that closes itself.
            </p>
            <div className="mt-6">
              <ArrowLink href="/register">Start your registry</ArrowLink>
            </div>
          </div>
          <ol className="card space-y-0 p-6 sm:p-8">
            {STORY.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
                {index < STORY.length - 1 ? (
                  <span aria-hidden="true" className="absolute left-4 top-9 h-[calc(100%-2rem)] w-px bg-slate-200" />
                ) : null}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
                  {index + 1}
                </span>
                <div className="pt-1">
                  <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------ honest limits ---- */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-8 sm:p-10">
            <div aria-hidden="true" className="ink-grid absolute inset-0" />
            <div aria-hidden="true" className="ink-glow absolute inset-0" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">Honest by design</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                What CampusGuard refuses to promise
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Overselling a security tool destroys trust the first time it fails to stop a theft. These are the
                boundaries of the system — stated in the product, the officer guidance and the terms.
              </p>
            </div>
          </div>
          <div className="card grid gap-6 p-8 sm:grid-cols-2 sm:p-10">
            {LIMITS.map((limit) => (
              <div key={limit.title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <limit.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{limit.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{limit.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ organisations ---- */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid items-center gap-8 rounded-3xl bg-brand-50 p-8 ring-1 ring-inset ring-brand-100 sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow">For organisations</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Your campus. Your registry. Your rules.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Each university, college, company or government office gets its own tenant: its own email domains,
              retention windows, administrators, branding and data region. A platform operator sees counts — never
              people. Scan records are kept for a short, configurable window and are never used for movement analysis.
            </p>
          </div>
          <Link href="/join" className="btn-primary justify-self-start lg:justify-self-end">
            Bring your organisation
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------ final CTA -------- */}
      <section className="relative overflow-hidden bg-ink-950">
        <div aria-hidden="true" className="ink-grid absolute inset-0" />
        <div aria-hidden="true" className="ink-glow absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Give your campus a memory.</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Registration takes two minutes. The record lasts until you delete it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary">
              Register a device
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href={session ? roleHome(session.role) : '/login'} className="btn-on-ink">
              {session ? 'Open dashboard' : 'Sign in'}
            </Link>
          </div>
        </div>
      </section>
      </main>

      <PublicFooter />
    </div>
  );
}
