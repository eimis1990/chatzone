/** Generate the deterministic Loqara editorial image set used by LinkedIn drafts. */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const OUT = path.join(process.cwd(), 'public', 'linkedin')
const ORANGE = '#e97634'
const INK = '#151515'
const PAPER = '#f7f6f2'
const GRID = '#ddd9d2'

const visuals = [
  ['01-human-handoff.png', 'HANDOFF', 'Knowing when\nto step aside', 'handoff', '#f3b56f'],
  ['02-grounded-answer.png', 'GROUNDING', '“I don’t know”\nis a feature', 'grounded', '#ef9b73'],
  ['03-voice-shopping.png', 'VOICE', 'The interface\ndisappears', 'voice', '#75b7a5'],
  ['04-repetitive-questions.png', 'CAPACITY', 'Fewer avoidable\ninterruptions', 'questions', '#7aa7d8'],
  ['05-support-metrics.png', 'MEASUREMENT', 'Measure the\nresolution', 'metrics', '#9d8ac7'],
  ['06-conversational-lead.png', 'LEADS', 'Value before\nthe form', 'lead', '#ef9a9a'],
  ['07-woocommerce-stack.png', 'WOOCOMMERCE', 'One connected\nconversation', 'network', '#9b7ac5'],
  ['08-five-tests.png', 'EVALUATION', 'Test the\nedge cases', 'tests', '#e3b450'],
  ['09-right-sized-support.png', 'FIT', 'Right-sized\nsupport', 'rightsize', '#83b48a'],
  ['10-context-memory.png', 'CONTEXT', 'The second\nquestion matters', 'context', '#6ea6c7'],
  ['11-shopify-context.png', 'SHOPIFY', 'Use what the\nstore knows', 'catalog', '#83b86b'],
  ['12-order-status.png', 'ORDER STATUS', 'Boring. Frequent.\nMeasurable.', 'order', '#e0a15c'],
  ['13-lithuanian-language.png', 'LANGUAGE', 'Natural Lithuanian,\nnot translated words', 'language', '#c87f9b'],
  ['14-generous-limits.png', 'PRICING', 'Software should\ninvite use', 'limits', '#d39b54'],
  ['15-cart-question.png', 'CONVERSION', 'The question behind\nthe abandoned cart', 'cart', '#d47b6f'],
  ['16-privacy-by-design.png', 'PRIVACY', 'A model is not\na privacy model', 'privacy', '#658fba'],
  ['17-small-store-capacity.png', 'SMALL STORES', 'More capacity,\nless software', 'capacity', '#79a982'],
  ['18-campaign-readiness.png', 'READINESS', 'Test before\nthe traffic spike', 'campaign', '#d8974d'],
  ['19-model-vs-system.png', 'SYSTEM DESIGN', 'The model is\none component', 'system', '#8c7fc0'],
  ['20-one-line-install.png', 'BUILDING IN PUBLIC', 'Simple outside.\nOrganised inside.', 'install', '#6c9db0'],
]

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function headline(value) {
  return value
    .split('\n')
    .map((line, index) => `<tspan x="70" dy="${index === 0 ? 0 : 72}">${escapeXml(line)}</tspan>`)
    .join('')
}

function card(x, y, width, height, fill = '#ffffff', stroke = GRID, radius = 24) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`
}

function motif(kind, accent) {
  const faint = `${accent}33`
  switch (kind) {
    case 'handoff':
      return `${card(720, 165, 190, 118)}${card(944, 345, 190, 118, accent, accent)}
        <path d="M875 285 C930 285 930 350 965 350" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
        <path d="M952 332 L974 351 L949 365" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="775" cy="215" r="13" fill="${ORANGE}"/><circle cx="817" cy="215" r="13" fill="${GRID}"/><circle cx="859" cy="215" r="13" fill="${GRID}"/>
        <circle cx="999" cy="396" r="27" fill="${PAPER}"/><path d="M1030 420 C1020 390 978 390 968 420" fill="none" stroke="${INK}" stroke-width="6"/>`
    case 'grounded':
      return `${card(755, 120, 340, 150)}${card(735, 352, 110, 95, accent, accent, 18)}${card(870, 352, 110, 95, '#fff', GRID, 18)}${card(1005, 352, 110, 95, '#fff', GRID, 18)}
        <path d="M900 270 V325 M790 325 H1060 M790 325 V352 M925 325 V352 M1060 325 V352" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        <path d="M820 185 H1030" stroke="${GRID}" stroke-width="12" stroke-linecap="round"/><path d="M820 220 H960" stroke="${ORANGE}" stroke-width="12" stroke-linecap="round"/>`
    case 'voice':
      return `<circle cx="925" cy="305" r="185" fill="${faint}"/><circle cx="925" cy="305" r="102" fill="#fff" stroke="${accent}" stroke-width="5"/>
        ${[0,1,2,3,4,5,6].map((i) => `<rect x="${846 + i * 25}" y="${268 - Math.abs(3-i)*10}" width="12" height="${74 + Math.abs(3-i)*20}" rx="6" fill="${i === 3 ? ORANGE : INK}"/>`).join('')}
        <path d="M760 500 C830 540 1020 540 1090 500" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>`
    case 'questions':
      return [0,1,2,3].map((i) => `${card(745 + (i%2)*185, 130 + Math.floor(i/2)*150, 160, 108, i === 3 ? accent : '#fff', i === 3 ? accent : GRID, 18)}<circle cx="${785 + (i%2)*185}" cy="170" r="10" fill="${i === 3 ? PAPER : ORANGE}"/><path d="M815 ${170 + Math.floor(i/2)*150} H${865 + (i%2)*185}" stroke="${i === 3 ? PAPER : GRID}" stroke-width="8" stroke-linecap="round"/>`).join('') + `<path d="M760 485 H1085" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M1030 450 L1085 485 L1030 520" fill="none" stroke="${ORANGE}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`
    case 'metrics':
      return `${card(730, 110, 390, 390)}
        <path d="M790 430 V360 H835 V430 M870 430 V290 H915 V430 M950 430 V215 H995 V430 M1030 430 V155 H1075 V430" fill="${accent}"/>
        <path d="M790 188 C860 230 930 115 1070 150" fill="none" stroke="${ORANGE}" stroke-width="10" stroke-linecap="round"/>
        <circle cx="790" cy="188" r="10" fill="${ORANGE}"/><circle cx="1070" cy="150" r="10" fill="${ORANGE}"/>`
    case 'lead':
      return `<path d="M750 130 H1110 L1000 275 H860 Z" fill="${faint}" stroke="${accent}" stroke-width="5"/>
        <path d="M860 305 H1000 L965 385 H895 Z" fill="${accent}"/>
        ${card(842, 430, 175, 72, '#fff', GRID, 18)}<circle cx="882" cy="466" r="13" fill="${ORANGE}"/><path d="M914 466 H980" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>`
    case 'network':
      return `<path d="M925 300 L790 175 M925 300 L1060 175 M925 300 L790 440 M925 300 L1060 440" stroke="${GRID}" stroke-width="8"/>
        <circle cx="925" cy="300" r="78" fill="${accent}"/><circle cx="790" cy="175" r="48" fill="#fff" stroke="${ORANGE}" stroke-width="5"/><circle cx="1060" cy="175" r="48" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="790" cy="440" r="48" fill="#fff" stroke="${INK}" stroke-width="5"/><circle cx="1060" cy="440" r="48" fill="#fff" stroke="${ORANGE}" stroke-width="5"/>
        <path d="M885 300 H965 M925 260 V340" stroke="${PAPER}" stroke-width="10" stroke-linecap="round"/>`
    case 'tests':
      return [0,1,2,3,4].map((i) => `${card(745, 105 + i*82, 360, 62, i === 4 ? faint : '#fff', i === 4 ? accent : GRID, 14)}<circle cx="780" cy="${136+i*82}" r="13" fill="${i < 4 ? accent : ORANGE}"/><path d="M773 ${136+i*82} l6 6 l12 -15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M815 ${136+i*82} H1060" stroke="${i === 4 ? INK : GRID}" stroke-width="8" stroke-linecap="round"/>`).join('')
    case 'rightsize':
      return `${card(740, 100, 380, 420, faint, accent, 34)}${card(805, 165, 250, 290, '#fff', GRID, 28)}${card(865, 225, 130, 170, accent, accent, 22)}<path d="M900 310 H960" stroke="${PAPER}" stroke-width="10" stroke-linecap="round"/>`
    case 'context':
      return `${card(735, 120, 315, 120)}${card(815, 355, 315, 120, faint, accent)}
        <path d="M845 240 C845 310 955 295 955 355" fill="none" stroke="${ORANGE}" stroke-width="10" stroke-linecap="round"/>
        <circle cx="790" cy="180" r="12" fill="${ORANGE}"/><path d="M825 180 H1000" stroke="${GRID}" stroke-width="10" stroke-linecap="round"/>
        <circle cx="870" cy="415" r="12" fill="${accent}"/><path d="M905 415 H1080" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`
    case 'catalog':
      return `${card(720, 110, 225, 380)}${card(985, 155, 155, 125, accent, accent)}${card(985, 345, 155, 125)}
        ${[0,1,2,3,4,5].map((i) => `<rect x="${750+(i%2)*86}" y="${145+Math.floor(i/2)*102}" width="62" height="72" rx="12" fill="${i===2 ? ORANGE : faint}" stroke="${i===2 ? ORANGE : accent}" stroke-width="3"/>`).join('')}
        <path d="M945 300 H1010" stroke="${INK}" stroke-width="8"/><path d="M993 282 L1015 300 L993 318" fill="none" stroke="${INK}" stroke-width="7"/>`
    case 'order':
      return `<path d="M770 185 H1080 M770 305 H1080 M770 425 H1080" stroke="${GRID}" stroke-width="8"/>
        <path d="M810 185 V425" stroke="${INK}" stroke-width="9"/>
        <circle cx="810" cy="185" r="22" fill="${accent}"/><circle cx="810" cy="305" r="22" fill="${ORANGE}"/><circle cx="810" cy="425" r="22" fill="#fff" stroke="${INK}" stroke-width="6"/>
        ${card(885, 145, 190, 70)}${card(885, 265, 190, 70, faint, accent)}${card(885, 385, 190, 70)}`
    case 'language':
      return `${card(730, 125, 240, 150, '#fff', GRID)}${card(890, 340, 240, 150, faint, accent)}
        <text x="850" y="220" text-anchor="middle" font-family="Arial" font-size="55" font-weight="700" fill="${INK}">LT</text>
        <text x="1010" y="435" text-anchor="middle" font-family="Arial" font-size="55" font-weight="700" fill="${ORANGE}">LT</text>
        <path d="M835 275 C835 315 1000 300 1000 340" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`
    case 'limits':
      return `${card(735, 125, 380, 350)}
        ${[0,1,2,3,4].map((i) => `<rect x="775" y="${170+i*52}" width="${90+i*52}" height="24" rx="12" fill="${i===4 ? ORANGE : accent}" opacity="${0.45+i*0.12}"/>`).join('')}
        <path d="M775 440 H1075" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><circle cx="1020" cy="440" r="16" fill="${ORANGE}"/>`
    case 'cart':
      return `<path d="M760 145 H815 L855 365 H1060 L1110 205 H835" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="895" cy="430" r="25" fill="${accent}"/><circle cx="1030" cy="430" r="25" fill="${accent}"/>
        <circle cx="945" cy="255" r="65" fill="${faint}" stroke="${accent}" stroke-width="5"/><text x="945" y="278" text-anchor="middle" font-family="Arial" font-size="72" font-weight="700" fill="${ORANGE}">?</text>`
    case 'privacy':
      return `<path d="M925 105 L1085 165 V305 C1085 405 1015 480 925 520 C835 480 765 405 765 305 V165 Z" fill="${faint}" stroke="${accent}" stroke-width="7"/>
        <rect x="850" y="285" width="150" height="130" rx="24" fill="#fff" stroke="${INK}" stroke-width="7"/><path d="M880 285 V245 C880 185 970 185 970 245 V285" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="925" cy="345" r="18" fill="${ORANGE}"/><path d="M925 363 V390" stroke="${ORANGE}" stroke-width="9" stroke-linecap="round"/>`
    case 'capacity':
      return `${card(730, 115, 400, 385)}
        ${[0,1,2,3].map((i) => `<rect x="770" y="${160+i*72}" width="${i<2 ? 310 : 145}" height="44" rx="12" fill="${i===0 ? accent : faint}"/>`).join('')}
        <path d="M970 325 L1015 370 L1100 265" fill="none" stroke="${ORANGE}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`
    case 'campaign':
      return `${card(725, 110, 405, 390)}<path d="M770 440 L855 365 L925 395 L1005 255 L1080 165" fill="none" stroke="${ORANGE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M770 170 V440 H1090" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        ${[0,1,2,3,4].map((i) => `<circle cx="${770+i*76}" cy="${440-[0,75,45,185,275][i]}" r="12" fill="${accent}"/>`).join('')}`
    case 'system':
      return `<circle cx="925" cy="305" r="190" fill="${faint}" stroke="${accent}" stroke-width="5"/><circle cx="925" cy="305" r="112" fill="#fff" stroke="${GRID}" stroke-width="5"/><circle cx="925" cy="305" r="48" fill="${ORANGE}"/>
        ${[0,1,2,3,4,5].map((i) => { const a=i*Math.PI/3; const x=925+Math.cos(a)*190; const y=305+Math.sin(a)*190; return `<circle cx="${x}" cy="${y}" r="22" fill="${i%2?INK:accent}"/>` }).join('')}`
    case 'install':
      return `${card(725, 120, 410, 88, '#161616', '#161616', 18)}<path d="M770 165 H1040" stroke="${ORANGE}" stroke-width="8" stroke-linecap="round"/><circle cx="1085" cy="165" r="12" fill="${PAPER}"/>
        <path d="M930 210 V275" stroke="${INK}" stroke-width="7"/>
        ${[0,1,2,3].map((i) => `${card(735+i*102, 300, 82, 138, i===1?accent:'#fff', i===1?accent:GRID, 16)}<circle cx="${776+i*102}" cy="342" r="13" fill="${i===1?PAPER:ORANGE}"/><path d="M757 ${382} H${795+i*102}" stroke="${i===1?PAPER:GRID}" stroke-width="8" stroke-linecap="round"/>`).join('')}`
    default:
      return ''
  }
}

function svg(label, title, kind, accent, index) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="628" viewBox="0 0 1200 628">
    <rect width="1200" height="628" fill="${PAPER}"/>
    <path d="M0 32 H1200 M0 596 H1200" stroke="${GRID}" stroke-width="2"/>
    <path d="M612 0 V628" stroke="${GRID}" stroke-width="2" stroke-dasharray="8 12"/>
    <rect x="70" y="63" width="18" height="18" rx="5" fill="${ORANGE}"/>
    <text x="103" y="79" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="2.2" fill="${INK}">LOQARA / ${escapeXml(label)}</text>
    <text x="70" y="226" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="700" letter-spacing="-2" fill="${INK}">${headline(title)}</text>
    <text x="70" y="552" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600" letter-spacing="1.5" fill="${ORANGE}">FIELD NOTE ${String(index + 1).padStart(2, '0')}</text>
    ${motif(kind, accent)}
  </svg>`
}

await mkdir(OUT, { recursive: true })
await Promise.all(
  visuals.map(async ([filename, label, title, kind, accent], index) => {
    const source = Buffer.from(svg(label, title, kind, accent, index))
    await sharp(source).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, filename))
  }),
)

console.log(`Generated ${visuals.length} LinkedIn visuals in ${OUT}`)
